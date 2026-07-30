package com.eprajaentregador;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MyFirebaseMsgService";
    private static final String CHANNEL_ID = "delivery-incoming-v3";
    private static final int NOTIF_ID = 7777;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "FCM recebido de: " + remoteMessage.getFrom());

        if (remoteMessage.getData().size() > 0) {
            Map<String, String> data = remoteMessage.getData();
            String type = data.get("type");
            Log.d(TAG, "Tipo da mensagem: " + type + " | data=" + data);

            if ("delivery".equals(type)) {
                String deliveryId = data.get("deliveryId");
                String address   = data.get("address");
                String title     = data.get("title");
                String details   = (title != null ? title + "\n" : "") + (address != null ? address : "");
                if (details.trim().isEmpty()) details = "Nova corrida disponível!";

                // Salva para a IncomingCallActivity ler
                DeliveryOverlayPlugin.latestDetails    = details;
                DeliveryOverlayPlugin.latestDeliveryId = deliveryId != null ? deliveryId : "";

                Log.d(TAG, "Disparando popup para deliveryId=" + deliveryId);

                // ── ABORDAGEM 1: startActivity direto (funciona quando o processo do app está vivo)
                //    O serviço FCM roda no processo do app, então isto funciona mesmo em background.
                try {
                    Intent actIntent = new Intent(this, IncomingCallActivity.class);
                    actIntent.putExtra("details", details);
                    actIntent.putExtra("deliveryId", deliveryId);
                    actIntent.addFlags(
                            Intent.FLAG_ACTIVITY_NEW_TASK       |
                            Intent.FLAG_ACTIVITY_CLEAR_TOP      |
                            Intent.FLAG_ACTIVITY_SINGLE_TOP     |
                            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                    );
                    startActivity(actIntent);
                    Log.d(TAG, "startActivity disparado com sucesso.");
                } catch (Exception e) {
                    Log.w(TAG, "startActivity falhou: " + e.getMessage());
                }

                // ── ABORDAGEM 2: Notification com fullScreenIntent (fallback obrigatório Android 10+)
                //    Garante que mesmo que a ABORDAGEM 1 seja bloqueada, o sistema ainda abre a Activity.
                try {
                    ensureChannel();

                    Intent fsIntent = new Intent(this, IncomingCallActivity.class);
                    fsIntent.putExtra("details", details);
                    fsIntent.putExtra("deliveryId", deliveryId);
                    fsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

                    int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) piFlags |= PendingIntent.FLAG_IMMUTABLE;

                    PendingIntent fullScreenPI = PendingIntent.getActivity(this, 0, fsIntent, piFlags);
                    PendingIntent tapPI        = PendingIntent.getActivity(this, 1, fsIntent, piFlags);

                    Notification.Builder builder;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        builder = new Notification.Builder(this, CHANNEL_ID);
                    } else {
                        builder = new Notification.Builder(this)
                                .setPriority(Notification.PRIORITY_MAX)
                                .setDefaults(Notification.DEFAULT_ALL);
                    }
                    builder
                            .setSmallIcon(android.R.drawable.sym_call_incoming)
                            .setContentTitle("🏍️ Nova corrida disponível!")
                            .setContentText(details)
                            .setStyle(new Notification.BigTextStyle().bigText(details))
                            .setCategory(Notification.CATEGORY_CALL)
                            .setVisibility(Notification.VISIBILITY_PUBLIC)
                            .setAutoCancel(false)
                            .setOngoing(true)
                            .setContentIntent(tapPI)
                            .setFullScreenIntent(fullScreenPI, true);

                    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null) {
                        nm.notify(NOTIF_ID, builder.build());
                        Log.d(TAG, "Notificação fullScreenIntent disparada.");
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Erro ao montar notificação fullScreenIntent: " + e.getMessage());
                }
            }
        }
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;

        // Se o canal existir com importância baixa (de versões antigas), deleta e recria
        NotificationChannel existing = nm.getNotificationChannel(CHANNEL_ID);
        if (existing == null || existing.getImportance() < NotificationManager.IMPORTANCE_HIGH) {
            if (existing != null) nm.deleteNotificationChannel(CHANNEL_ID);
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Corridas (Popup)", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Alerta de nova corrida — popup de tela cheia");
            ch.enableVibration(true);
            ch.setShowBadge(true);
            ch.setBypassDnd(true);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "FCM Token atualizado: " + token);
    }
}
