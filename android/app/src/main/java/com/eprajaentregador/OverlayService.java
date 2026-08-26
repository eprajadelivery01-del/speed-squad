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
    private static final String FG_CHANNEL_ID = "overlay_service_v25_silent";
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

        Runnable inflateRunnable = () -> {
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

                View initialClose = floatingView.findViewById(R.id.closeButton);
                if (initialClose != null) {
                    initialClose.setOnClickListener(v -> hideDeliveryCard(currentDeliveryId));
                }
                View initialCardClose = floatingView.findViewById(R.id.cardCloseBtn);
                if (initialCardClose != null) {
                    initialCardClose.setOnClickListener(v -> hideDeliveryCard(currentDeliveryId));
                }
            } catch (Exception e) {
                Log.e(TAG, "Erro ao criar floating view: " + e.getMessage());
                floatingView = null;
            }
        };

        if (Looper.myLooper() == Looper.getMainLooper()) {
            inflateRunnable.run();
        } else {
            mainHandler.post(inflateRunnable);
        }
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

                        DeliveryOverlayPlugin.setPendingAccepted(deliveryId);

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

                View mainCloseBtn = floatingView.findViewById(R.id.closeButton);
                if (mainCloseBtn != null) {
                    mainCloseBtn.setOnClickListener(v -> {
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
                    nm.deleteNotificationChannel("overlay_service");
                } catch (Exception ignored) {}
                if (nm.getNotificationChannel(FG_CHANNEL_ID) == null) {
                    NotificationChannel ch = new NotificationChannel(
                            FG_CHANNEL_ID, "Serviço em Segundo Plano", NotificationManager.IMPORTANCE_LOW);
                    ch.setSound(null, null);
                    ch.enableVibration(false);
                    ch.setShowBadge(false);
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
                .setDefaults(0)
                .build();

        startForeground(FG_NOTIF_ID, notification);
    }

    private void acquireKeepAliveLocks() {
        // ── WAKE LOCK: mantém a CPU ativa para polling/websocket não morrer
        try {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(
                        PowerManager.PARTIAL_WAKE_LOCK,
                        "EprjaEntregador::OverlayWakeLock");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire();
                Log.d(TAG, "WakeLock adquirido — CPU ativa em segundo plano.");
            }
        } catch (Exception e) {
            Log.w(TAG, "Erro ao adquirir WakeLock: " + e.getMessage());
        }

        // ── WIFI LOCK: mantém a conexão Wi-Fi ativa em modo de alto desempenho
        try {
            WifiManager wm = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
            if (wm != null) {
                wifiLock = wm.createWifiLock(
                        WifiManager.WIFI_MODE_FULL_HIGH_PERF,
                        "EprjaEntregador::OverlayWifiLock");
                wifiLock.setReferenceCounted(false);
                wifiLock.acquire();
                Log.d(TAG, "WifiLock adquirido — Wi-Fi ativo em segundo plano.");
            }
        } catch (Exception e) {
            Log.w(TAG, "Erro ao adquirir WifiLock: " + e.getMessage());
        }

        // ── NETWORK CALLBACK: solicita que o sistema mantenha a rede ativa
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            if (cm != null) {
                NetworkRequest request = new NetworkRequest.Builder()
                        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                        .build();
                networkCallback = new ConnectivityManager.NetworkCallback() {
                    @Override
                    public void onAvailable(Network network) {
                        Log.d(TAG, "Rede disponível — conexão mantida.");
                    }
                    @Override
                    public void onLost(Network network) {
                        Log.w(TAG, "Rede perdida — aguardando reconexão.");
                    }
                };
                cm.registerNetworkCallback(request, networkCallback);
                Log.d(TAG, "NetworkCallback registrado.");
            }
        } catch (Exception e) {
            Log.w(TAG, "Erro ao registrar NetworkCallback: " + e.getMessage());
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // O usuário fechou o app da lista de recentes: religa o serviço
        // para continuar recebendo corridas por FCM.
        try {
            Intent restart = new Intent(getApplicationContext(), OverlayService.class);
            restart.setAction(ACTION_KEEP_ALIVE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getApplicationContext().startForegroundService(restart);
            } else {
                getApplicationContext().startService(restart);
            }
        } catch (Exception e) {
            Log.w(TAG, "Falha ao religar após task removida: " + e.getMessage());
        }
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
                Log.d(TAG, "WakeLock liberado.");
            }
        } catch (Exception e) { /* ignore */ }

        // Libera WifiLock
        try {
            if (wifiLock != null && wifiLock.isHeld()) {
                wifiLock.release();
                Log.d(TAG, "WifiLock liberado.");
            }
        } catch (Exception e) { /* ignore */ }

        // Desregistra NetworkCallback
        try {
            if (networkCallback != null) {
                ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
                if (cm != null) {
                    cm.unregisterNetworkCallback(networkCallback);
                }
                networkCallback = null;
                Log.d(TAG, "NetworkCallback desregistrado.");
            }
        } catch (Exception e) { /* ignore */ }

        // Remove a floating view se existir
        if (floatingView != null && windowManager != null) {
            try {
                windowManager.removeView(floatingView);
            } catch (Exception e) { /* ignore */ }
            floatingView = null;
        }
    }
}
