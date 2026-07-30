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
    private static final String CHANNEL_ID = "delivery-incoming-call";
    private static final int NOTIFICATION_ID = 9999;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Log.d(TAG, "From: " + remoteMessage.getFrom());

        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Message data payload: " + remoteMessage.getData());

            Map<String, String> data = remoteMessage.getData();
            String type = data.get("type");

            if ("delivery".equals(type)) {
                String deliveryId = data.get("deliveryId");
                String address = data.get("address");
                String title = data.get("title");

                String details = (title != null ? title + "\n" : "") + (address != null ? address : "");

                // Armazena no plugin para uso posterior
                DeliveryOverlayPlugin.latestDetails = details.isEmpty() ? "Nova Entrega!" : details;
                DeliveryOverlayPlugin.latestDeliveryId = deliveryId != null ? deliveryId : "";

                // Cria o canal de notificação (obrigatório Android 8+)
                createNotificationChannel();

                // Intent para abrir a IncomingCallActivity
                Intent fullScreenIntent = new Intent(this, IncomingCallActivity.class);
                fullScreenIntent.putExtra("details", details);
                fullScreenIntent.putExtra("deliveryId", deliveryId);
                fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP);

                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }

                PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                        this, 0, fullScreenIntent, flags);

                // Intent para tocar ao clicar na notificação (mesmo destino)
                PendingIntent contentPendingIntent = PendingIntent.getActivity(
                        this, 1, fullScreenIntent, flags);

                // Monta a notificação com fullScreenIntent
                Notification.Builder builder;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    builder = new Notification.Builder(this, CHANNEL_ID);
                } else {
                    builder = new Notification.Builder(this);
                    builder.setPriority(Notification.PRIORITY_MAX);
                }

                builder.setSmallIcon(android.R.drawable.ic_dialog_info)
                        .setContentTitle("🏍️ Nova corrida disponível!")
                        .setContentText(details.isEmpty() ? "Toque para ver detalhes" : details)
                        .setStyle(new Notification.BigTextStyle().bigText(details.isEmpty() ? "Toque para ver detalhes" : details))
                        .setAutoCancel(true)
                        .setCategory(Notification.CATEGORY_CALL)
                        .setVisibility(Notification.VISIBILITY_PUBLIC)
                        .setContentIntent(contentPendingIntent)
                        .setFullScreenIntent(fullScreenPendingIntent, true); // <- CHAVE: abre sobre outros apps e com tela apagada

                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                    builder.setDefaults(Notification.DEFAULT_ALL);
                }

                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.notify(NOTIFICATION_ID, builder.build());
                }

                Log.d(TAG, "Notificação full-screen disparada para delivery: " + deliveryId);
            }
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Novas Corridas",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alertas de novas corridas disponíveis");
            channel.enableVibration(true);
            channel.setShowBadge(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "Refreshed token: " + token);
    }
}
