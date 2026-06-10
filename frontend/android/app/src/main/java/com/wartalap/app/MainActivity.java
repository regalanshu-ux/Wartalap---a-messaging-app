package com.wartalap.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static boolean isAppInForeground = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register the custom background service plugin
        registerPlugin(BackgroundServicePlugin.class);

        // Request notification permission if SDK >= 33
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        isAppInForeground = true;

        // Stop native ringing when app is in foreground (handled by JS UI)
        Intent intent = new Intent(this, BackgroundSocketService.class);
        intent.setAction(BackgroundSocketService.ACTION_STOP_RINGTONE);
        try {
            startService(intent);
        } catch (Exception e) {
            // Service might not be running or started yet, ignore
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        isAppInForeground = false;
    }
}
