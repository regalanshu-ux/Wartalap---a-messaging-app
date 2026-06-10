package com.wartalap.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.net.URISyntaxException;

import io.socket.client.IO;
import io.socket.client.Socket;
import io.socket.emitter.Emitter;

public class BackgroundSocketService extends Service {

    private static final String TAG = "BackgroundSocketService";
    private static final String PERSISTENT_CHANNEL_ID = "foreground_service_channel";
    private static final String ALERTS_CHANNEL_ID = "alerts_channel";
    private static final int PERSISTENT_NOTIFICATION_ID = 1;
    private static final int CALL_NOTIFICATION_ID = 2;

    public static final String ACTION_DECLINE_CALL = "com.wartalap.app.ACTION_DECLINE_CALL";
    public static final String ACTION_STOP_RINGTONE = "com.wartalap.app.ACTION_STOP_RINGTONE";

    private Socket mSocket;
    private String mUserId;
    private String mServerUrl;

    private MediaPlayer mMediaPlayer;
    private Vibrator mVibrator;
    private PowerManager.WakeLock mWakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service onCreate");
        createNotificationChannels();

        // Acquire WakeLock to keep CPU running when screen is off
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            mWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Wartalap::SocketWakeLock");
            mWakeLock.acquire();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service onStartCommand");

        // Handle custom actions
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            Log.d(TAG, "Received action: " + action);
            if (ACTION_STOP_RINGTONE.equals(action)) {
                stopRingtone();
                stopVibration();
                return START_STICKY;
            } else if (ACTION_DECLINE_CALL.equals(action)) {
                String callerId = intent.getStringExtra("callerId");
                declineCall(callerId);
                return START_STICKY;
            }
        }

        // Get configurations
        if (intent != null) {
            mUserId = intent.getStringExtra("userId");
            mServerUrl = intent.getStringExtra("serverUrl");
        }

        // Fallback to SharedPreferences if configs are empty
        if (mUserId == null || mServerUrl == null) {
            SharedPreferences sharedPref = getSharedPreferences("WartalapPrefs", Context.MODE_PRIVATE);
            mUserId = sharedPref.getString("userId", null);
            mServerUrl = sharedPref.getString("serverUrl", null);
        }

        // Display persistent foreground service notification
        startForeground(PERSISTENT_NOTIFICATION_ID, getPersistentNotification());

        if (mUserId != null && mServerUrl != null) {
            connectSocket();
        } else {
            Log.w(TAG, "Credentials missing, stopping service");
            stopSelf();
        }

        return START_STICKY;
    }

    private void connectSocket() {
        if (mSocket != null && mSocket.connected()) {
            return;
        }

        try {
            Log.d(TAG, "Connecting socket to " + mServerUrl + " for user " + mUserId);
            IO.Options options = IO.Options.builder()
                    .setQuery("userId=" + mUserId)
                    .build();

            mSocket = IO.socket(mServerUrl, options);

            mSocket.on(Socket.EVENT_CONNECT, new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    Log.i(TAG, "Socket connected successfully");
                }
            });

            mSocket.on(Socket.EVENT_DISCONNECT, new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    Log.i(TAG, "Socket disconnected");
                }
            });

            mSocket.on("newMessage", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    try {
                        JSONObject data = (JSONObject) args[0];
                        Log.d(TAG, "Received newMessage: " + data.toString());

                        // If app is not in the foreground, display local notification
                        if (!MainActivity.isAppInForeground) {
                            String senderName = data.optString("senderName", "A friend");
                            String text = data.optString("text", "");
                            String image = data.optString("image", "");
                            String body = text;
                            if (body.isEmpty() && !image.isEmpty()) {
                                body = "📷 Sent an image";
                            }
                            showMessageNotification(senderName, body);
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error parsing newMessage event", e);
                    }
                }
            });

            mSocket.on("incoming-call", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    try {
                        JSONObject data = (JSONObject) args[0];
                        Log.d(TAG, "Received incoming-call: " + data.toString());

                        if (!MainActivity.isAppInForeground) {
                            JSONObject from = data.getJSONObject("from");
                            String callerName = from.optString("fullName", "Someone");
                            String callerId = from.optString("_id", "");
                            String callType = data.optString("callType", "voice");

                            showCallNotification(callerName, callerId, callType);
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error parsing incoming-call event", e);
                    }
                }
            });

            mSocket.on("call-ended", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    Log.d(TAG, "Received call-ended");
                    clearCallNotification();
                }
            });

            mSocket.on("call-rejected", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    Log.d(TAG, "Received call-rejected");
                    clearCallNotification();
                }
            });

            mSocket.on("call-accepted", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    Log.d(TAG, "Received call-accepted");
                    clearCallNotification();
                }
            });

            mSocket.on("call-busy", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    Log.d(TAG, "Received call-busy");
                    clearCallNotification();
                }
            });

            mSocket.connect();

        } catch (URISyntaxException e) {
            Log.e(TAG, "URI syntax exception", e);
        }
    }

    private void declineCall(String callerId) {
        Log.d(TAG, "Declining call from: " + callerId);
        if (mSocket != null && mSocket.connected() && callerId != null) {
            try {
                JSONObject obj = new JSONObject();
                obj.put("to", callerId);
                mSocket.emit("reject-call", obj);
            } catch (Exception e) {
                Log.e(TAG, "Error emitting reject-call", e);
            }
        }
        clearCallNotification();
    }

    private void showMessageNotification(String sender, String body) {
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, (int) System.currentTimeMillis(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, ALERTS_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_notify_chat)
                .setContentTitle(sender)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true);

        notificationManager.notify((int) System.currentTimeMillis(), builder.build());
    }

    private void showCallNotification(String callerName, String callerId, String callType) {
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // Intent to answer / open MainActivity
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                this, 1, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Intent to decline
        Intent declineIntent = new Intent(this, BackgroundSocketService.class);
        declineIntent.setAction(ACTION_DECLINE_CALL);
        declineIntent.putExtra("callerId", callerId);
        PendingIntent declinePendingIntent = PendingIntent.getService(
                this, 2, declineIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, ALERTS_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.sym_action_call)
                .setContentTitle("Incoming " + callType + " call")
                .setContentText(callerName + " is calling...")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setContentIntent(openAppPendingIntent)
                .setOngoing(true)
                .setAutoCancel(false)
                .addAction(android.R.drawable.ic_menu_call, "Answer", openAppPendingIntent)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Decline", declinePendingIntent);

        notificationManager.notify(CALL_NOTIFICATION_ID, builder.build());

        startRingtone();
        startVibration();
    }

    private void clearCallNotification() {
        stopRingtone();
        stopVibration();
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.cancel(CALL_NOTIFICATION_ID);
    }

    private void startRingtone() {
        if (mMediaPlayer == null) {
            try {
                Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                mMediaPlayer = new MediaPlayer();
                mMediaPlayer.setDataSource(getApplicationContext(), ringtoneUri);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    mMediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build());
                } else {
                    mMediaPlayer.setAudioStreamType(AudioManager.STREAM_RING);
                }
                mMediaPlayer.setLooping(true);
                mMediaPlayer.prepare();
                mMediaPlayer.start();
            } catch (Exception e) {
                Log.e(TAG, "Error playing ringtone", e);
            }
        } else if (!mMediaPlayer.isPlaying()) {
            mMediaPlayer.start();
        }
    }

    private void stopRingtone() {
        if (mMediaPlayer != null) {
            try {
                if (mMediaPlayer.isPlaying()) {
                    mMediaPlayer.stop();
                }
                mMediaPlayer.release();
            } catch (Exception e) {
                Log.e(TAG, "Error releasing media player", e);
            }
            mMediaPlayer = null;
        }
    }

    private void startVibration() {
        if (mVibrator == null) {
            mVibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        }
        if (mVibrator != null && mVibrator.hasVibrator()) {
            long[] pattern = {0, 1000, 1000};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                mVibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                mVibrator.vibrate(pattern, 0);
            }
        }
    }

    private void stopVibration() {
        if (mVibrator != null) {
            mVibrator.cancel();
        }
    }

    private Notification getPersistentNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, PERSISTENT_CHANNEL_ID)
                .setContentTitle("Wartalap Background Sync")
                .setContentText("Listening for messages and calls")
                .setSmallIcon(android.R.drawable.ic_menu_info_details)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel persistentChannel = new NotificationChannel(
                    PERSISTENT_CHANNEL_ID,
                    "Background Sync Status",
                    NotificationManager.IMPORTANCE_LOW
            );
            persistentChannel.setDescription("Keeps the background chat service alive");

            NotificationChannel alertsChannel = new NotificationChannel(
                    ALERTS_CHANNEL_ID,
                    "Chat Messages and Calls",
                    NotificationManager.IMPORTANCE_HIGH
            );
            alertsChannel.setDescription("Notifications for incoming messages and call rings");
            alertsChannel.enableLights(true);
            alertsChannel.enableVibration(true);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(persistentChannel);
                manager.createNotificationChannel(alertsChannel);
            }
        }
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "Service onDestroy");
        stopRingtone();
        stopVibration();
        if (mSocket != null) {
            mSocket.disconnect();
            mSocket.off();
            mSocket = null;
        }
        if (mWakeLock != null && mWakeLock.isHeld()) {
            mWakeLock.release();
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
