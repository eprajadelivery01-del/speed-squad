package com.eprajaentregador;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.core.app.NotificationCompat;

public class OverlayService extends Service {

    private static final String TAG = "OverlayService";
    private static final String FG_CHANNEL_ID = "overlay_service_silent_v3";
    private static final int    FG_NOTIF_ID   = 1;
    public  static final String ACTION_KEEP_ALIVE = "com.eprajaentregador.KEEP_ALIVE";
    public  static final String ACTION_SHOW_DELIVERY = "com.eprajaentregador.SHOW_DELIVERY";
    public  static final String ACTION_HIDE_DELIVERY = "com.eprajaentregador.HIDE_DELIVERY";

    public static OverlayService instance;

    private WindowManager windowManager;
    private View floatingView;
    private WindowManager.LayoutParams windowParams;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // Keep-alive locks: mantêm CPU e rede ativos enquanto o entregador está Online
    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;
    private ConnectivityManager.NetworkCallback networkCallback;

    private String currentDeliveryId;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        startForegroundNotification();
        acquireKeepAliveLocks();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        instance = this;
        startForegroundNotification();
        ensureOverlayView();

        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_SHOW_DELIVERY.equals(action)) {
                String deliveryId = intent.getStringExtra("deliveryId");
                String storeName  = intent.getStringExtra("storeName");
                String pickup     = intent.getStringExtra("pickup");
                String dropoff    = intent.getStringExtra("dropoff");
                String fee        = intent.getStringExtra("fee");
                showDeliveryCard(deliveryId, storeName, pickup, dropoff, fee);
            } else if (ACTION_HIDE_DELIVERY.equals(action)) {
                String deliveryId = intent.getStringExtra("deliveryId");
                hideDeliveryCard(deliveryId);
            }
        }

        return START_STICKY;
    }

    private synchronized void ensureOverlayView() {
        boolean canOverlay = Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                || android.provider.Settings.canDrawOverlays(this);
        if (!canOverlay) {
            Log.d(TAG, "Sem permissão de overlay — serviço segue apenas mantendo o app ativo.");
            return;
        }

        if (floatingView != null) return;

        mainHandler.post(() -> {
            if (floatingView != null) return;
            try {
                floatingView = LayoutInflater.from(this).inflate(R.layout.floating_bubble, null);

                int layoutFlag = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE;

                windowParams = new WindowManager.LayoutParams(
                        WindowManager.LayoutParams.WRAP_CONTENT,
                        WindowManager.LayoutParams.WRAP_CONTENT,
                        layoutFlag,
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                        PixelFormat.TRANSLUCENT);

                windowParams.gravity = Gravity.TOP | Gravity.START;
                windowParams.x = 20;
                windowParams.y = 150;

                windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
                if (windowManager != null) {
                    windowManager.addView(floatingView, windowParams);
                }

                View bubbleIcon = floatingView.findViewById(R.id.bubbleIcon);
                if (bubbleIcon != null) {
                    bubbleIcon.setOnTouchListener(new View.OnTouchListener() {
                        private int   initialX, initialY;
                        private float initialTouchX, initialTouchY;
                        private boolean isClick;

                        @Override
                        public boolean onTouch(View v, MotionEvent event) {
                            switch (event.getAction()) {
                                case MotionEvent.ACTION_DOWN:
                                    initialX      = windowParams.x;
                                    initialY      = windowParams.y;
                                    initialTouchX = event.getRawX();
                                    initialTouchY = event.getRawY();
                                    isClick       = true;
                                    return true;
                                case MotionEvent.ACTION_MOVE:
                                    float dx = event.getRawX() - initialTouchX;
                                    float dy = event.getRawY() - initialTouchY;
                                    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) isClick = false;
                                    windowParams.x = initialX + (int) dx;
                                    windowParams.y = initialY + (int) dy;
                                    if (windowManager != null && floatingView != null) {
                                        windowManager.updateViewLayout(floatingView, windowParams);
                                    }
                                    return true;
                                case MotionEvent.ACTION_UP:
                                    if (isClick) {
                                        Intent i = new Intent(OverlayService.this, MainActivity.class);
                                        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                                        startActivity(i);
                                    }
                                    return true;
                            }
                            return false;
                        }
                    });
                }

                View closeButton = floatingView.findViewById(R.id.closeButton);
                if (closeButton != null) {
                    closeButton.setOnClickListener(v -> stopSelf());
                }

                Log.d(TAG, "Overlay window criada com sucesso.");
            } catch (Exception e) {
                Log.e(TAG, "Erro ao criar overlay window: " + e.getMessage());
            }
        });
    }

    public void showDeliveryCard(final String deliveryId, final String storeName, final String pickup, final String dropoff, final String fee) {
        mainHandler.post(() -> {
            ensureOverlayView();
            if (floatingView == null) return;

            // Acende a tela imediatamente se o aparelho estiver bloqueado ou apagado
            try {
                PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
                if (pm != null) {
                    PowerManager.WakeLock screenLock = pm.newWakeLock(
                            PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                            "EprjaEntregador::ScreenWakeAlert");
                    screenLock.acquire(15000);
                }
            } catch (Exception e) {
                Log.w(TAG, "Erro ao acordar tela: " + e.getMessage());
            }

            // Toca o áudio oficial nativo
            NativeSoundPlayer.playDeliveryAlert(this);

            this.currentDeliveryId = deliveryId;
            View cardContainer = floatingView.findViewById(R.id.deliveryCardContainer);
            TextView txtStoreName = floatingView.findViewById(R.id.cardStoreName);
            TextView txtEarnings = floatingView.findViewById(R.id.cardEarnings);
            TextView txtPickup = floatingView.findViewById(R.id.cardPickup);
            TextView txtDropoff = floatingView.findViewById(R.id.cardDropoff);
            Button btnAccept = floatingView.findViewById(R.id.cardBtnAccept);
            Button btnDecline = floatingView.findViewById(R.id.cardBtnDecline);
            ImageView btnClose = floatingView.findViewById(R.id.cardCloseBtn);

            if (cardContainer != null) {
                if (txtStoreName != null) txtStoreName.setText(storeName != null && !storeName.isEmpty() ? storeName : "Nova Corrida");
                if (txtEarnings != null) {
                    String formattedFee = fee != null && !fee.isEmpty() ? (fee.startsWith("R$") ? fee : "R$ " + fee) : "A calcular";
                    txtEarnings.setText("Ganhos: " + formattedFee);
                }
                if (txtPickup != null) txtPickup.setText("📍 Coleta: " + (pickup != null && !pickup.isEmpty() ? pickup : "Retirada na Loja"));
                if (txtDropoff != null) txtDropoff.setText("🏁 Entrega: " + (dropoff != null && !dropoff.isEmpty() ? dropoff : "Endereço do cliente"));

                if (btnAccept != null) {
                    btnAccept.setOnClickListener(v -> {
                        NativeSoundPlayer.stopSound();
                        hideDeliveryCard(deliveryId);
                        MyFirebaseMessagingService.dismissDeliveryAlert(this, deliveryId);

                        Intent openApp = new Intent(this, MainActivity.class);
                        openApp.putExtra("deliveryId", deliveryId);
                        openApp.putExtra("action", "accept");
                        openApp.putExtra("route", "/driver?deliveryId=" + deliveryId + "&action=accept");
                        openApp.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        startActivity(openApp);
                    });
                }

                if (btnDecline != null) {
                    btnDecline.setOnClickListener(v -> {
                        NativeSoundPlayer.stopSound();
                        hideDeliveryCard(deliveryId);
                        MyFirebaseMessagingService.dismissDeliveryAlert(this, deliveryId);
                        if (DeliveryOverlayPlugin.instance != null) {
                            DeliveryOverlayPlugin.instance.triggerDeliveryDeclined(deliveryId);
                        }
                    });
                }

                if (btnClose != null) {
                    btnClose.setOnClickListener(v -> {
                        NativeSoundPlayer.stopSound();
                        hideDeliveryCard(deliveryId);
                    });
                }

                cardContainer.setVisibility(View.VISIBLE);
                if (windowManager != null && windowParams != null && floatingView != null) {
                    windowManager.updateViewLayout(floatingView, windowParams);
                }
            }
        });
    }

    public void hideDeliveryCard(String deliveryId) {
        NativeSoundPlayer.stopSound();
        mainHandler.post(() -> {
            if (floatingView != null) {
                View cardContainer = floatingView.findViewById(R.id.deliveryCardContainer);
                if (cardContainer != null) {
                    cardContainer.setVisibility(View.GONE);
                    if (windowManager != null && windowParams != null && floatingView != null) {
                        windowManager.updateViewLayout(floatingView, windowParams);
                    }
                }
            }
            if (deliveryId != null && deliveryId.equals(this.currentDeliveryId)) {
                this.currentDeliveryId = null;
            }
        });
    }

    private void startForegroundNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) {
                try {
                    nm.deleteNotificationChannel("overlay_service_channel");
                    nm.deleteNotificationChannel("overlay_fg_channel");
                } catch (Exception ignored) {}

                if (nm.getNotificationChannel(FG_CHANNEL_ID) == null) {
                    NotificationChannel ch = new NotificationChannel(
                            FG_CHANNEL_ID, "Serviço em Segundo Plano (Silencioso)", NotificationManager.IMPORTANCE_MIN);
                    ch.setDescription("Mantém o aplicativo ativo em segundo plano");
                    ch.setSound(null, null);
                    ch.enableVibration(false);
                    ch.setShowBadge(false);
                    ch.enableLights(false);
                    nm.createNotificationChannel(ch);
                }
            }
        }

        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) piFlags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(this, 0, openIntent, piFlags);

        Notification notification = new NotificationCompat.Builder(this, FG_CHANNEL_ID)
                .setContentTitle("É Pra Já Entregador")
                .setContentText("Disponível para entregas")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pi)
                .setOngoing(true)
                .setSilent(true)
                .setSound(null)
                .setVibrate(null)
                .setOnlyAlertOnce(true)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .build();

        startForeground(FG_NOTIF_ID, notification);
    }

    private void acquireKeepAliveLocks() {
        // Reduz consumo de bateria: Não mantém WifiLock permanente nem WakeLock contínuo.
        // O Android e o FCM já gerenciam sockets em segundo plano com baixíssimo consumo.
    }

    public void acquireTemporaryWakeLock(long durationMs) {
        try {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null) {
                if (wakeLock == null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "EprjaEntregador::DeliveryWakeLock");
                    wakeLock.setReferenceCounted(false);
                }
                wakeLock.acquire(durationMs);
                Log.d(TAG, "WakeLock temporário adquirido por " + durationMs + "ms.");
            }
        } catch (Exception e) {
            Log.w(TAG, "Erro ao adquirir WakeLock temporário: " + e.getMessage());
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        instance = null;

        // Libera WakeLock
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
            wakeLock = null;
        } catch (Exception ignored) {}

        // Remove views
        try {
            if (floatingView != null && windowManager != null) {
                windowManager.removeView(floatingView);
                floatingView = null;
            }
        } catch (Exception ignored) {}
    }
}
