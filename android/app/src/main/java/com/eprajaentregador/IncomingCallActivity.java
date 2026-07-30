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
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class IncomingCallActivity extends Activity {

    private static final String TAG = "IncomingCallActivity";

    // Supabase REST credentials (anon key — público por design)
    private static final String SUPABASE_URL = "https://nptkxlrhrlssdsevpgqe.supabase.co";
    private static final String SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs";

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
        android.os.PowerManager powerManager = (android.os.PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                    android.os.PowerManager.FULL_WAKE_LOCK
                            | android.os.PowerManager.ACQUIRE_CAUSES_WAKEUP
                            | android.os.PowerManager.ON_AFTER_RELEASE,
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

        // ===== BOTÃO ACEITAR =====
        btnAccept.setOnClickListener(v -> {
            btnAccept.setEnabled(false);
            btnAccept.setText("Aceitando...");
            stopRinging();

            final String deliveryId = currentDeliveryId;

            // Se JS estiver vivo, dispara via plugin (caminho normal — app em foreground)
            if (DeliveryOverlayPlugin.instance != null) {
                Log.d(TAG, "Aceitar via JS plugin. deliveryId=" + deliveryId);
                // Abre o MainActivity primeiro para ter contexto JS
                Intent mainIntent = new Intent(this, MainActivity.class);
                mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                startActivity(mainIntent);

                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    DeliveryOverlayPlugin.instance.triggerCallResponse("accepted", deliveryId);
                }, 800);

                finish();
            } else {
                // JS morto (app em background/killed) → aceita DIRETAMENTE via HTTP nativo
                Log.d(TAG, "Aceitar via HTTP nativo (JS indisponível). deliveryId=" + deliveryId);
                new Thread(() -> {
                    boolean success = acceptDeliveryViaNativeHttp(deliveryId);
                    runOnUiThread(() -> {
                        if (success) {
                            Log.d(TAG, "Aceite nativo com sucesso!");
                            // Abre o app para o entregador ver os detalhes
                            Intent mainIntent = new Intent(IncomingCallActivity.this, MainActivity.class);
                            mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                            startActivity(mainIntent);
                        } else {
                            Log.e(TAG, "Falha no aceite nativo.");
                            // Mesmo assim abre o app para o usuário verificar
                            Intent mainIntent = new Intent(IncomingCallActivity.this, MainActivity.class);
                            mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                            startActivity(mainIntent);
                        }
                        finish();
                    });
                }).start();
            }
        });

        // ===== BOTÃO REJEITAR =====
        btnReject.setOnClickListener(v -> {
            stopRinging();
            if (DeliveryOverlayPlugin.instance != null) {
                DeliveryOverlayPlugin.instance.triggerCallResponse("rejected", currentDeliveryId);
            } else {
                // Apenas rejeita localmente; o JS fará a limpeza quando abrir
                Intent intent = new Intent(ACTION_CALL_REJECTED);
                intent.putExtra("deliveryId", currentDeliveryId);
                intent.setPackage(getPackageName());
                sendBroadcast(intent);
            }
            finish();
        });
    }

    /**
     * Aceita a corrida diretamente via chamada HTTP REST ao Supabase.
     * Usado quando o app está morto/background e o JS não está disponível.
     * Utiliza a RPC update_delivery_status_safe para evitar condição de corrida.
     */
    private boolean acceptDeliveryViaNativeHttp(String deliveryId) {
        try {
            // Recupera o driver_id salvo localmente
            android.content.SharedPreferences prefs = getSharedPreferences("eprajadriver", Context.MODE_PRIVATE);
            String driverId = prefs.getString("driver_id", "");

            if (driverId.isEmpty()) {
                Log.w(TAG, "driver_id não encontrado no SharedPreferences. Tentando aceitar via PATCH direto.");
                return acceptViaPatch(deliveryId, prefs.getString("user_token", ""));
            }

            // Chama a RPC update_delivery_status_safe
            URL url = new URL(SUPABASE_URL + "/rest/v1/rpc/update_delivery_status_safe");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
            conn.setRequestProperty("Authorization", "Bearer " + prefs.getString("user_token", SUPABASE_ANON_KEY));
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            JSONObject body = new JSONObject();
            body.put("p_delivery_id", deliveryId);
            body.put("p_status", "accepted");
            body.put("p_driver_id", driverId);

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

    /**
     * Fallback: aceita via PATCH direto se não tiver driver_id cacheado.
     */
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
