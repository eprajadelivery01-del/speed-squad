package com.eprajaentregador;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.IntentFilter;
import android.media.MediaPlayer;
import android.os.VibrationEffect;
import android.os.Vibrator;

public class IncomingCallActivity extends Activity {

    public static IncomingCallActivity instance;
    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private android.os.PowerManager.WakeLock wakeLock;
    private String currentDeliveryId = "";

    public static final String ACTION_CALL_ACCEPTED = "com.eprajaentregador.ACTION_CALL_ACCEPTED";
    public static final String ACTION_CALL_REJECTED = "com.eprajaentregador.ACTION_CALL_REJECTED";
    public static final String ACTION_CANCEL_CALL = "com.eprajaentregador.ACTION_CANCEL_CALL";
    public static final String ACTION_UPDATE_CALL = "com.eprajaentregador.ACTION_UPDATE_CALL";

    private BroadcastReceiver updateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (ACTION_UPDATE_CALL.equals(intent.getAction())) {
                String details = intent.getStringExtra("details");
                String deliveryId = intent.getStringExtra("deliveryId");
                updateDetails(details, deliveryId);
            } else if (ACTION_CANCEL_CALL.equals(intent.getAction())) {
                finish();
            }
        }
    };

    public void updateDetails(String details, String deliveryId) {
        if (deliveryId != null && !deliveryId.isEmpty()) {
            currentDeliveryId = deliveryId;
        }
        if (details != null && !details.isEmpty()) {
            TextView tvDetails = findViewById(R.id.tvCallDetails);
            if (tvDetails != null) {
                tvDetails.setText(details);
            }
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;

        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_UPDATE_CALL);
        filter.addAction(ACTION_CANCEL_CALL);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(updateReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(updateReceiver, filter);
        }

        // Turn screen on and show when locked
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);

        android.os.PowerManager powerManager = (android.os.PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(android.os.PowerManager.FULL_WAKE_LOCK | android.os.PowerManager.ACQUIRE_CAUSES_WAKEUP, "DeliveryApp:IncomingCall");
            wakeLock.acquire(30000); // 30 seconds max
        }

        setContentView(R.layout.activity_incoming_call);

        TextView tvDetails = findViewById(R.id.tvCallDetails);
        Button btnAccept = findViewById(R.id.btnAccept);
        Button btnReject = findViewById(R.id.btnReject);

        // Start ringing
        try {
            mediaPlayer = MediaPlayer.create(this, R.raw.ring);
            if (mediaPlayer != null) {
                mediaPlayer.setLooping(true);
                mediaPlayer.start();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            long[] pattern = {0, 1000, 1000};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
        }

        String details = getIntent().getStringExtra("details");
        currentDeliveryId = getIntent().getStringExtra("deliveryId");
        
        if (DeliveryOverlayPlugin.latestDetails != null && !DeliveryOverlayPlugin.latestDetails.isEmpty()) {
            details = DeliveryOverlayPlugin.latestDetails;
        }
        if (DeliveryOverlayPlugin.latestDeliveryId != null && !DeliveryOverlayPlugin.latestDeliveryId.isEmpty()) {
            currentDeliveryId = DeliveryOverlayPlugin.latestDeliveryId;
        }

        updateDetails(details, currentDeliveryId);

        btnAccept.setOnClickListener(v -> {
            Intent mainIntent = new Intent(this, MainActivity.class);
            mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(mainIntent);

            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                if (DeliveryOverlayPlugin.instance != null) {
                    DeliveryOverlayPlugin.instance.triggerCallResponse("accepted", currentDeliveryId);
                } else {
                    Intent intent = new Intent(ACTION_CALL_ACCEPTED);
                    intent.putExtra("deliveryId", currentDeliveryId);
                    intent.setPackage(getPackageName());
                    sendBroadcast(intent);
                }
            }, 1000); // 1000ms is enough because JS is alive and static instance is immediate
            
            finish();
        });

        btnReject.setOnClickListener(v -> {
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                if (DeliveryOverlayPlugin.instance != null) {
                    DeliveryOverlayPlugin.instance.triggerCallResponse("rejected", currentDeliveryId);
                } else {
                    Intent intent = new Intent(ACTION_CALL_REJECTED);
                    intent.putExtra("deliveryId", currentDeliveryId);
                    intent.setPackage(getPackageName());
                    sendBroadcast(intent);
                }
            }, 500);
            
            finish();
        });
    }

    private void stopRinging() {
        if (mediaPlayer != null) {
            if (mediaPlayer.isPlaying()) {
                mediaPlayer.stop();
            }
            mediaPlayer.release();
            mediaPlayer = null;
        }
        if (vibrator != null) {
            vibrator.cancel();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (instance == this) instance = null;
        stopRinging();
        try {
            unregisterReceiver(updateReceiver);
        } catch (Exception e) {
            // Ignore
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }
}
