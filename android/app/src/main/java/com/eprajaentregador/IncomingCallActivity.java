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
import android.content.Intent;
import android.content.IntentFilter;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.VibrationEffect;
import android.os.Vibrator;

import android.media.MediaPlayer;

public class IncomingCallActivity extends Activity {

    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private android.os.PowerManager.WakeLock wakeLock;

    public static final String ACTION_CALL_ACCEPTED = "com.eprajaentregador.ACTION_CALL_ACCEPTED";
    public static final String ACTION_CALL_REJECTED = "com.eprajaentregador.ACTION_CALL_REJECTED";
    public static final String ACTION_CANCEL_CALL = "com.eprajaentregador.ACTION_CANCEL_CALL";
    public static final String ACTION_UPDATE_CALL = "com.eprajaentregador.ACTION_UPDATE_CALL";

    private BroadcastReceiver cancelReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (ACTION_CANCEL_CALL.equals(intent.getAction())) {
                finish();
            }
        }
    };

    private BroadcastReceiver updateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (ACTION_UPDATE_CALL.equals(intent.getAction())) {
                String details = intent.getStringExtra("details");
                if (details != null && !details.isEmpty()) {
                    TextView tvDetails = findViewById(R.id.tvCallDetails);
                    if (tvDetails != null) {
                        tvDetails.setText(details);
                    }
                }
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        IntentFilter filter = new IntentFilter(ACTION_CANCEL_CALL);
        IntentFilter updateFilter = new IntentFilter(ACTION_UPDATE_CALL);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(cancelReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            registerReceiver(updateReceiver, updateFilter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(cancelReceiver, filter);
            registerReceiver(updateReceiver, updateFilter);
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

        // Start ringing with custom app sound
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

        // Retrieve data passed from notification/plugin
        String details = getIntent().getStringExtra("details");
        String deliveryId = getIntent().getStringExtra("deliveryId");
        if (details != null && !details.isEmpty()) {
            tvDetails.setText(details);
        }

        btnAccept.setOnClickListener(v -> {
            // Bring main app to foreground first
            Intent mainIntent = new Intent(this, MainActivity.class);
            mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(mainIntent);

            // Aguarda o Capacitor inicializar antes de disparar o evento pro Javascript
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                Intent intent = new Intent(ACTION_CALL_ACCEPTED);
                if (deliveryId != null) {
                    intent.putExtra("deliveryId", deliveryId);
                }
                sendBroadcast(intent);
            }, 1500);
            
            finish();
        });

        btnReject.setOnClickListener(v -> {
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                Intent intent = new Intent(ACTION_CALL_REJECTED);
                if (deliveryId != null) {
                    intent.putExtra("deliveryId", deliveryId);
                }
                sendBroadcast(intent);
            }, 1500);
            
            // Optional: Also bring app to foreground or just dismiss
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
        stopRinging();
        try {
            unregisterReceiver(cancelReceiver);
            unregisterReceiver(updateReceiver);
        } catch (Exception e) {
            // Ignore
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }
}
