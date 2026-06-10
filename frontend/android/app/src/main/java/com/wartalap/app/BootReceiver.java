package com.wartalap.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "Received broadcast action: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || "android.intent.action.MY_PACKAGE_REPLACED".equals(action)) {
            SharedPreferences sharedPref = context.getSharedPreferences("WartalapPrefs", Context.MODE_PRIVATE);
            String userId = sharedPref.getString("userId", null);
            String serverUrl = sharedPref.getString("serverUrl", null);

            if (userId != null && serverUrl != null) {
                Log.d(TAG, "Starting background socket service on boot/upgrade");
                Intent serviceIntent = new Intent(context, BackgroundSocketService.class);
                serviceIntent.putExtra("userId", userId);
                serviceIntent.putExtra("serverUrl", serverUrl);
                
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent);
                    } else {
                        context.startService(serviceIntent);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start background service on boot", e);
                }
            } else {
                Log.d(TAG, "No user credentials saved, service not started");
            }
        }
    }
}
