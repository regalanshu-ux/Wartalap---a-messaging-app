package com.wartalap.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundService")
public class BackgroundServicePlugin extends Plugin {

    @PluginMethod
    public void startService(PluginCall call) {
        String userId = call.getString("userId");
        String serverUrl = call.getString("serverUrl");
        if (userId == null || serverUrl == null) {
            call.reject("userId and serverUrl are required");
            return;
        }

        Log.d("BackgroundPlugin", "Starting service: userId=" + userId + ", serverUrl=" + serverUrl);
        
        // Save to SharedPreferences for persistence across restarts/reboots
        SharedPreferences sharedPref = getContext().getSharedPreferences("WartalapPrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = sharedPref.edit();
        editor.putString("userId", userId);
        editor.putString("serverUrl", serverUrl);
        editor.apply();

        Intent serviceIntent = new Intent(getContext(), BackgroundSocketService.class);
        serviceIntent.putExtra("userId", userId);
        serviceIntent.putExtra("serverUrl", serverUrl);
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            JSObject ret = new JSObject();
            ret.put("status", "success");
            call.resolve(ret);
        } catch (Exception e) {
            Log.e("BackgroundPlugin", "Error starting foreground service", e);
            call.reject("Failed to start service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        Log.d("BackgroundPlugin", "Stopping service");
        
        // Clear saved configs in SharedPreferences
        SharedPreferences sharedPref = getContext().getSharedPreferences("WartalapPrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = sharedPref.edit();
        editor.remove("userId");
        editor.remove("serverUrl");
        editor.apply();

        Intent serviceIntent = new Intent(getContext(), BackgroundSocketService.class);
        getContext().stopService(serviceIntent);
        
        JSObject ret = new JSObject();
        ret.put("status", "success");
        call.resolve(ret);
    }
}
