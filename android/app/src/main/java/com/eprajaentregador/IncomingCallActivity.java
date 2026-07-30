package com.eprajaentregador;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class IncomingCallActivity extends Activity {

    private static final String TAG = "IncomingCallActivity";
    public static final String ACTION_UPDATE_CALL = "com.eprajaentregador.UPDATE_CALL";
    public static final String ACTION_CANCEL_CALL = "com.eprajaentregador.CANCEL_CALL";
    public static final String ACTION_CALL_ACCEPTED = "com.eprajaentregador.CALL_ACCEPTED";
    public static final String ACTION_CALL_REJECTED = "com.eprajaentregador.CALL_REJECTED";

    private static final String SUPABASE_URL = "https://nptkxlrhrlssdsevpgqe.supabase.co";
    private static final String SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs";

    public static IncomingCallActivity instance;

    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;
    private String currentDeliveryId = "";

    private Handler checkHandler;
    private Runnable checkRunnable;

    private BroadcastReceiver updateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (ACTION_UPDATE_CALL.equals(intent.getAction())) {
                String details = intent.getStringExtra("details");
                String deliveryId = intent.getStringExtra("deliveryId");
                updateDetails(details, deliveryId);
            } else if (ACTION_CANCEL_CALL.equals(intent.getAction())) {
                stopRinging();
                finish();
            }
        }
    };

    public void updateDetails(String details, String deliveryId) {
        if (deliveryId != null && !deliveryId.isEmpty()) {
            currentDeliveryId = deliveryId;
        }
        if (details != null && !details.isEmpty()) {
            if (details.contains("Veja no app")) {
                details = details.replace("Veja no app", "Retirada na Loja");
            }
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

        // Acende a tela e mostra sobre a tela de bloqueio
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);

        // Wake lock agressivo para garantir que a tela acende
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK
                            | PowerManager.ACQUIRE_CAUSES_WAKEUP
                            | PowerManager.ON_AFTER_RELEASE,
                    "DeliveryApp:IncomingCall");
            wakeLock.acquire(60000); // 60 segundos max
        }

        setContentView(R.layout.activity_incoming_call);

        Button btnAccept = findViewById(R.id.btnAccept);
        Button btnReject = findViewById(R.id.btnReject);

        // Toca o som de alerta
        try {
            mediaPlayer = MediaPlayer.create(this, R.raw.ring);
            if (mediaPlayer != null) {
                mediaPlayer.setLooping(true);
                mediaPlayer.start();
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao tocar som: " + e.getMessage());
        }

        // Vibração pulsante
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            long[] pattern = {0, 1000, 1000};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
        }

        // Carrega os detalhes da corrida
        String details = getIntent().getStringExtra("details");
        currentDeliveryId = getIntent().getStringExtra("deliveryId");

        // Prioriza dados do plugin estático (mais recentes, vindos do JS ou FCM nativo)
        if (DeliveryOverlayPlugin.latestDetails != null && !DeliveryOverlayPlugin.latestDetails.isEmpty()) {
            details = DeliveryOverlayPlugin.latestDetails;
        }
        if (DeliveryOverlayPlugin.latestDeliveryId != null && !DeliveryOverlayPlugin.latestDeliveryId.isEmpty()) {
            currentDeliveryId = DeliveryOverlayPlugin.latestDeliveryId;
        }

        updateDetails(details, currentDeliveryId);

        // Inicia verificação automática a cada 1.5s se a corrida continua disponível
        startStatusCheckLoop();

        // ===== BOTÃO ACEITAR =====
        btnAccept.setOnClickListener(v -> {
            btnAccept.setEnabled(false);
            btnAccept.setText("Aceitando...");
            stopRinging();
            stopStatusCheckLoop();

            final String deliveryId = currentDeliveryId;

            if (DeliveryOverlayPlugin.instance != null) {
                Log.d(TAG, "Aceitar via JS plugin. deliveryId=" + deliveryId);
                Intent mainIntent = new Intent(this, MainActivity.class);
                mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                startActivity(mainIntent);

                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    DeliveryOverlayPlugin.instance.triggerCallResponse("accepted", deliveryId);
                }, 800);

                finish();
            } else {
                Log.d(TAG, "Aceitar via HTTP nativo (JS indisponível). deliveryId=" + deliveryId);
                new Thread(() -> {
                    boolean success = acceptDeliveryViaNativeHttp(deliveryId);
                    runOnUiThread(() -> {
                        Intent mainIntent = new Intent(IncomingCallActivity.this, MainActivity.class);
                        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        startActivity(mainIntent);
                        finish();
                    });
                }).start();
            }
        });

        // ===== BOTÃO REJEITAR =====
        btnReject.setOnClickListener(v -> {
            stopRinging();
            stopStatusCheckLoop();
            if (DeliveryOverlayPlugin.instance != null) {
                DeliveryOverlayPlugin.instance.triggerCallResponse("rejected", currentDeliveryId);
            }
            Intent intent = new Intent(ACTION_CALL_REJECTED);
            intent.putExtra("deliveryId", currentDeliveryId);
            sendBroadcast(intent);
            finish();
        });
    }

    private void startStatusCheckLoop() {
        if (checkHandler == null) {
            checkHandler = new Handler(Looper.getMainLooper());
        }
        checkRunnable = new Runnable() {
            @Override
            public void run() {
                if (currentDeliveryId != null && !currentDeliveryId.isEmpty()) {
                    checkDeliveryAvailabilityAsync(currentDeliveryId);
                }
                if (checkHandler != null && checkRunnable != null) {
                    checkHandler.postDelayed(this, 1500);
                }
            }
        };
        checkHandler.post(checkRunnable);
    }

    private void stopStatusCheckLoop() {
        if (checkHandler != null && checkRunnable != null) {
            checkHandler.removeCallbacks(checkRunnable);
            checkRunnable = null;
        }
    }

    private void checkDeliveryAvailabilityAsync(String deliveryId) {
        new Thread(() -> {
            try {
                URL url = new URL(SUPABASE_URL + "/rest/v1/available_deliveries?id=eq." + deliveryId + "&select=id");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
                conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY);
                conn.setConnectTimeout(3000);
                conn.setReadTimeout(3000);

                int responseCode = conn.getResponseCode();
                if (responseCode == 200) {
                    BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder content = new StringBuilder();
                    String inputLine;
                    while ((inputLine = in.readLine()) != null) {
                        content.append(inputLine);
                    }
                    in.close();
                    conn.disconnect();

                    String json = content.toString().trim();
                    // Se o resultado for "[]", a corrida NÃO está mais na view available_deliveries (já aceita ou cancelada)
                    if ("[]".equals(json)) {
                        Log.d(TAG, "Corrida " + deliveryId + " já foi aceita por outro motorista. Fechando popup automaticamente!");
                        runOnUiThread(() -> {
                            stopRinging();
                            stopStatusCheckLoop();
                            finish();
                        });
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Erro ao checar se corrida está disponível: " + e.getMessage());
            }
        }).start();
    }

    private boolean acceptDeliveryViaNativeHttp(String deliveryId) {
        SharedPreferences prefs = getSharedPreferences(DeliveryOverlayPlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String driverId  = prefs.getString("driver_id", "");
        String userToken = prefs.getString("user_token", "");

        if (driverId.isEmpty()) {
            Log.e(TAG, "Sem driver_id no SharedPreferences.");
            return acceptViaPatch(deliveryId, userToken);
        }

        try {
            URL url = new URL(SUPABASE_URL + "/rest/v1/rpc/update_delivery_status_safe");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
            conn.setRequestProperty("Authorization", "Bearer " + (userToken.isEmpty() ? SUPABASE_ANON_KEY : userToken));
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            JSONObject body = new JSONObject();
            body.put("p_delivery_id", deliveryId);
            body.put("p_status",      "accepted");
            body.put("p_driver_id",   driverId);

            byte[] bodyBytes = body.toString().getBytes(StandardCharsets.UTF_8);
            OutputStream os = conn.getOutputStream();
            os.write(bodyBytes);
            os.close();

            int responseCode = conn.getResponseCode();
            Log.d(TAG, "RPC response: " + responseCode);
            conn.disconnect();
            return responseCode >= 200 && responseCode < 300;

        } catch (Exception e) {
            Log.e(TAG, "Erro no aceite HTTP nativo: " + e.getMessage());
            return false;
        }
    }

    private boolean acceptViaPatch(String deliveryId, String token) {
        try {
            URL url = new URL(SUPABASE_URL + "/rest/v1/deliveries?id=eq." + deliveryId + "&status=in.(pending,broadcasted)&driver_id=is.null");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("PATCH");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
            conn.setRequestProperty("Authorization", "Bearer " + (token.isEmpty() ? SUPABASE_ANON_KEY : token));
            conn.setRequestProperty("Prefer", "return=minimal");
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            JSONObject body = new JSONObject();
            body.put("status", "accepted");

            byte[] bodyBytes = body.toString().getBytes(StandardCharsets.UTF_8);
            OutputStream os = conn.getOutputStream();
            os.write(bodyBytes);
            os.close();

            int responseCode = conn.getResponseCode();
            Log.d(TAG, "PATCH response: " + responseCode);
            conn.disconnect();
            return responseCode >= 200 && responseCode < 300;

        } catch (Exception e) {
            Log.e(TAG, "Erro no PATCH direto: " + e.getMessage());
            return false;
        }
    }

    private void stopRinging() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception e) { /* ignore */ }
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
        stopStatusCheckLoop();
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
