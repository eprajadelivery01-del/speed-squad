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

public class IncomingCallActivity extends Activity {

    private Ringtone ringtone;
    private Vibrator vibrator;

    public static final String ACTION_CALL_ACCEPTED = "com.eprajaentregador.ACTION_CALL_ACCEPTED";
    public static final String ACTION_CALL_REJECTED = "com.eprajaentregador.ACTION_CALL_REJECTED";
    public static final String ACTION_CANCEL_CALL = "com.eprajaentregador.ACTION_CANCEL_CALL";

    private BroadcastReceiver cancelReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (ACTION_CANCEL_CALL.equals(intent.getAction())) {
                finish();
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        IntentFilter filter = new IntentFilter(ACTION_CANCEL_CALL);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(cancelReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(cancelReceiver, filter);
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

        setContentView(R.layout.activity_incoming_call);

        TextView tvDetails = findViewById(R.id.tvCallDetails);
        Button btnAccept = findViewById(R.id.btnAccept);
        Button btnReject = findViewById(R.id.btnReject);

        // Start ringing and vibrating
        Uri notification = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (notification == null) {
            notification = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        }
        if (notification != null) {
            ringtone = RingtoneManager.getRingtone(getApplicationContext(), notification);
            if (ringtone != null) {
                ringtone.play();
            }
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
        if (details != null && !details.isEmpty()) {
            tvDetails.setText(details);
        }

        btnAccept.setOnClickListener(v -> {
            // Broadcast acceptance
            Intent intent = new Intent(ACTION_CALL_ACCEPTED);
            sendBroadcast(intent);
            
            // Bring main app to foreground
            Intent mainIntent = new Intent(this, MainActivity.class);
            mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(mainIntent);
            
            finish();
        });

        btnReject.setOnClickListener(v -> {
            // Broadcast rejection
            Intent intent = new Intent(ACTION_CALL_REJECTED);
            sendBroadcast(intent);
            finish();
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (ringtone != null && ringtone.isPlaying()) {
            ringtone.stop();
        }
        if (vibrator != null) {
            vibrator.cancel();
        }
        try {
            unregisterReceiver(cancelReceiver);
        } catch (Exception e) {
            // Ignore
        }
    }
}
