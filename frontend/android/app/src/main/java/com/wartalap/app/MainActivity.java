package com.wartalap.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static boolean isAppInForeground = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the custom background service plugin BEFORE super.onCreate()
        registerPlugin(BackgroundServicePlugin.class);
        
        super.onCreate(savedInstanceState);

        // Request notification permission if SDK >= 33
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }

        // Exclude app from battery optimization to prevent background connection termination
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                try {
                    Intent intent = new Intent();
                    intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                } catch (Exception e) {
                    // Ignore, fallback to system if prompt fails
                }
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
