package com.eprajaentregador;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;

import androidx.core.app.NotificationCompat;

public class OverlayService extends Service {

    private static final String TAG = "OverlayService";
    private static final String FG_CHANNEL_ID = "overlay_service_channel";
    private static final int    FG_NOTIF_ID   = 1;
    public  static final String ACTION_KEEP_ALIVE = "com.eprajaentregador.KEEP_ALIVE";

    private WindowManager windowManager;
    private View floatingView;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Garante que o foreground notification está ativo (obrigatório Android 8+)
        startForegroundNotification();

        // ── POPUP ACTION: disparado pelo FCM para abrir a IncomingCallActivity
        //    Um foreground service pode chamar startActivity() no Android 10+ sem restrição.
        if (intent != null && MyFirebaseMessagingService.ACTION_SHOW_POPUP.equals(intent.getAction())) {
            String details    = intent.getStringExtra("details");
            String deliveryId = intent.getStringExtra("deliveryId");
            Log.d(TAG, "SHOW_POPUP recebido — deliveryId=" + deliveryId);

            try {
                Intent popupIntent = new Intent(this, IncomingCallActivity.class);
                popupIntent.putExtra("details",    details);
                popupIntent.putExtra("deliveryId", deliveryId);
                popupIntent.putExtra("storeName", intent.getStringExtra("storeName"));
                popupIntent.putExtra("pickup",    intent.getStringExtra("pickup"));
                popupIntent.putExtra("dropoff",   intent.getStringExtra("dropoff"));
                popupIntent.putExtra("fee",       intent.getStringExtra("fee"));
                popupIntent.addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK       |
                        Intent.FLAG_ACTIVITY_CLEAR_TOP      |
                        Intent.FLAG_ACTIVITY_SINGLE_TOP     |
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                );
                startActivity(popupIntent);
                Log.d(TAG, "IncomingCallActivity iniciada pelo OverlayService com sucesso!");
            } catch (Exception e) {
                Log.e(TAG, "Falha ao iniciar IncomingCallActivity: " + e.getMessage());
            }
            return START_STICKY;
        }

        // ── OVERLAY WINDOW: cria a bolinha flutuante (só se houver permissão)
        boolean canOverlay = Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                || android.provider.Settings.canDrawOverlays(this);
        if (!canOverlay) {
            Log.d(TAG, "Sem permissão de overlay — serviço segue apenas mantendo o app ativo.");
            return START_STICKY;
        }
        if (floatingView == null) {
            try {
                floatingView = LayoutInflater.from(this).inflate(R.layout.floating_bubble, null);

                int layoutFlag = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE;

                final WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                        WindowManager.LayoutParams.WRAP_CONTENT,
                        WindowManager.LayoutParams.WRAP_CONTENT,
                        layoutFlag,
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                        PixelFormat.TRANSLUCENT);

                params.gravity = Gravity.TOP | Gravity.LEFT;
                params.x = 0;
                params.y = 100;

                windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
                windowManager.addView(floatingView, params);

                floatingView.findViewById(R.id.bubbleIcon).setOnTouchListener(new View.OnTouchListener() {
                    private int   initialX, initialY;
                    private float initialTouchX, initialTouchY;
                    private boolean isClick;

                    @Override
                    public boolean onTouch(View v, MotionEvent event) {
                        switch (event.getAction()) {
                            case MotionEvent.ACTION_DOWN:
                                initialX      = params.x;
                                initialY      = params.y;
                                initialTouchX = event.getRawX();
                                initialTouchY = event.getRawY();
                                isClick       = true;
                                return true;
                            case MotionEvent.ACTION_MOVE:
                                float dx = event.getRawX() - initialTouchX;
                                float dy = event.getRawY() - initialTouchY;
                                if (Math.abs(dx) > 10 || Math.abs(dy) > 10) isClick = false;
                                params.x = initialX + (int) dx;
                                params.y = initialY + (int) dy;
                                windowManager.updateViewLayout(floatingView, params);
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

                floatingView.findViewById(R.id.closeButton).setOnClickListener(v -> stopSelf());

                Log.d(TAG, "Overlay window criada com sucesso.");
            } catch (Exception e) {
                Log.e(TAG, "Erro ao criar overlay window: " + e.getMessage());
            }
        }

        return START_STICKY;
    }

    private void startForegroundNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(FG_CHANNEL_ID) == null) {
                NotificationChannel ch = new NotificationChannel(
                        FG_CHANNEL_ID, "Overlay Service", NotificationManager.IMPORTANCE_LOW);
                nm.createNotificationChannel(ch);
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
                .build();

        startForeground(FG_NOTIF_ID, notification);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        startForegroundNotification();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (floatingView != null && windowManager != null) {
            try {
                windowManager.removeView(floatingView);
            } catch (Exception e) { /* ignore */ }
            floatingView = null;
        }
    }
}
