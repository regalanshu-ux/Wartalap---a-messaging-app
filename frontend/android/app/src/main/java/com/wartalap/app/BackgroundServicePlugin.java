package com.wartalap.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import java.util.List;
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

    @PluginMethod
    public void setAudioOutput(PluginCall call) {
        String route = call.getString("route");
        if (route == null) {
            call.reject("route is required");
            return;
        }

        try {
            AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (audioManager == null) {
                call.reject("AudioManager not available");
                return;
            }

            // Ensure we are in IN_COMMUNICATION mode for WebRTC audio routing
            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) { // Android 12 (API 31) and above
                List<AudioDeviceInfo> devices = audioManager.getAvailableCommunicationDevices();
                AudioDeviceInfo targetDevice = null;

                if ("speaker".equalsIgnoreCase(route)) {
                    for (AudioDeviceInfo device : devices) {
                        if (device.getType() == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                            targetDevice = device;
                            break;
                        }
                    }
                } else if ("earpiece".equalsIgnoreCase(route)) {
                    for (AudioDeviceInfo device : devices) {
                        if (device.getType() == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) {
                            targetDevice = device;
                            break;
                        }
                    }
                    // Fallback to wired devices if earpiece not found (e.g. tablet)
                    if (targetDevice == null) {
                        for (AudioDeviceInfo device : devices) {
                            if (device.getType() == AudioDeviceInfo.TYPE_WIRED_HEADSET || 
                                device.getType() == AudioDeviceInfo.TYPE_WIRED_HEADPHONES) {
                                targetDevice = device;
                                break;
                            }
                        }
                    }
                } else if ("bluetooth".equalsIgnoreCase(route)) {
                    for (AudioDeviceInfo device : devices) {
                        if (device.getType() == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                            device.getType() == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                            device.getType() == AudioDeviceInfo.TYPE_BLE_HEADSET) {
                            targetDevice = device;
                            break;
                        }
                    }
                }

                if (targetDevice != null) {
                    boolean success = audioManager.setCommunicationDevice(targetDevice);
                    JSObject response = new JSObject();
                    response.put("success", success);
                    response.put("deviceType", targetDevice.getType());
                    call.resolve(response);
                } else {
                    audioManager.clearCommunicationDevice();
                    if ("bluetooth".equalsIgnoreCase(route)) {
                        call.reject("No connected Bluetooth device found");
                    } else {
                        // Fallback to old API routing
                        fallbackRouting(audioManager, route);
                        JSObject response = new JSObject();
                        response.put("success", true);
                        response.put("fallback", true);
                        call.resolve(response);
                    }
                }
            } else {
                // Fallback for Android 11 and below
                fallbackRouting(audioManager, route);
                JSObject response = new JSObject();
                response.put("success", true);
                call.resolve(response);
            }
        } catch (Exception e) {
            Log.e("BackgroundPlugin", "Error setting audio output route: " + route, e);
            call.reject("Error setting audio output: " + e.getMessage());
        }
    }

    @PluginMethod
    public void resetAudioOutput(PluginCall call) {
        try {
            AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    audioManager.clearCommunicationDevice();
                }
                audioManager.stopBluetoothSco();
                try {
                    audioManager.setBluetoothScoOn(false);
                } catch (Exception ignored) {}
                try {
                    audioManager.setSpeakerphoneOn(false);
                } catch (Exception ignored) {}
                audioManager.setMode(AudioManager.MODE_NORMAL);
            }
            JSObject response = new JSObject();
            response.put("success", true);
            call.resolve(response);
        } catch (Exception e) {
            Log.e("BackgroundPlugin", "Error resetting audio output", e);
            call.reject("Error resetting audio output: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getAvailableAudioOutputs(PluginCall call) {
        try {
            AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (audioManager == null) {
                call.reject("AudioManager not available");
                return;
            }

            JSObject response = new JSObject();
            boolean hasEarpiece = false;
            boolean hasSpeaker = true; // built-in speaker is always present
            boolean hasBluetooth = false;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                List<AudioDeviceInfo> devices = audioManager.getAvailableCommunicationDevices();
                for (AudioDeviceInfo device : devices) {
                    int type = device.getType();
                    if (type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) {
                        hasEarpiece = true;
                    } else if (type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                               type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                               type == AudioDeviceInfo.TYPE_BLE_HEADSET) {
                        hasBluetooth = true;
                    }
                }
                // Fallback check if earpiece is not reported by getAvailableCommunicationDevices (common on some setups/emulators)
                if (!hasEarpiece) {
                    AudioDeviceInfo[] allDevices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
                    for (AudioDeviceInfo d : allDevices) {
                        if (d.getType() == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) {
                            hasEarpiece = true;
                            break;
                        }
                    }
                }
            } else {
                hasEarpiece = true; // default assumption for smartphones
                hasBluetooth = audioManager.isBluetoothScoAvailableOffCall();
            }

            response.put("earpiece", hasEarpiece);
            response.put("speaker", hasSpeaker);
            response.put("bluetooth", hasBluetooth);
            call.resolve(response);
        } catch (Exception e) {
            Log.e("BackgroundPlugin", "Error checking available audio outputs", e);
            call.reject("Error: " + e.getMessage());
        }
    }

    private void fallbackRouting(AudioManager audioManager, String route) {
        if ("speaker".equalsIgnoreCase(route)) {
            try {
                audioManager.stopBluetoothSco();
                audioManager.setBluetoothScoOn(false);
            } catch (Exception ignored) {}
            audioManager.setSpeakerphoneOn(true);
        } else if ("earpiece".equalsIgnoreCase(route)) {
            try {
                audioManager.stopBluetoothSco();
                audioManager.setBluetoothScoOn(false);
            } catch (Exception ignored) {}
            audioManager.setSpeakerphoneOn(false);
        } else if ("bluetooth".equalsIgnoreCase(route)) {
            audioManager.setSpeakerphoneOn(false);
            try {
                audioManager.startBluetoothSco();
                audioManager.setBluetoothScoOn(true);
            } catch (Exception ignored) {}
        } else {
            try {
                audioManager.stopBluetoothSco();
                audioManager.setBluetoothScoOn(false);
            } catch (Exception ignored) {}
            audioManager.setSpeakerphoneOn(false);
            audioManager.setMode(AudioManager.MODE_NORMAL);
        }
    }
}
