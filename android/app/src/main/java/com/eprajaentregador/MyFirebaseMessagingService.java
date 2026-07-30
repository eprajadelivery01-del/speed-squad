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
                if (details.trim().isEmpty()) details = "Nova Entrega Disponível!";

                // Armazena nos campos estáticos para o IncomingCallActivity ler
                DeliveryOverlayPlugin.latestDetails = details;
                DeliveryOverlayPlugin.latestDeliveryId = deliveryId != null ? deliveryId : "";

                // Garante canal de notificação criado
                createNotificationChannel();

                // Intent da IncomingCallActivity (o popup nativo)
                Intent activityIntent = new Intent(this, IncomingCallActivity.class);
                activityIntent.putExtra("details", details);
                activityIntent.putExtra("deliveryId", deliveryId);
                activityIntent.addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK |
                        Intent.FLAG_ACTIVITY_CLEAR_TOP |
                        Intent.FLAG_ACTIVITY_SINGLE_TOP |
                        Intent.FLAG_ACTIVITY_NO_USER_ACTION
                );

                // PendingIntent para o fullScreenIntent — abre o popup nativo
                int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    piFlags |= PendingIntent.FLAG_IMMUTABLE;
                }
                PendingIntent fullScreenPI = PendingIntent.getActivity(this, 0, activityIntent, piFlags);

                // PendingIntent para toque na notificação (mesma Activity)
                PendingIntent tapPI = PendingIntent.getActivity(this, 1, activityIntent, piFlags);

                // Monta a notificação com fullScreenIntent e categoria CALL
                Notification notification;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    notification = new Notification.Builder(this, CHANNEL_ID)
                            .setSmallIcon(android.R.drawable.sym_call_incoming)
                            .setContentTitle("🏍️ Nova corrida disponível!")
                            .setContentText(details)
                            .setStyle(new Notification.BigTextStyle().bigText(details))
                            .setAutoCancel(false)
                            .setOngoing(true)
                            .setCategory(Notification.CATEGORY_CALL)
                            .setVisibility(Notification.VISIBILITY_PUBLIC)
                            .setContentIntent(tapPI)
                            .setFullScreenIntent(fullScreenPI, true)
                            .build();
                } else {
                    notification = new Notification.Builder(this)
                            .setSmallIcon(android.R.drawable.sym_call_incoming)
                            .setContentTitle("🏍️ Nova corrida disponível!")
                            .setContentText(details)
                            .setStyle(new Notification.BigTextStyle().bigText(details))
                            .setAutoCancel(false)
                            .setOngoing(true)
                            .setPriority(Notification.PRIORITY_MAX)
                            .setCategory(Notification.CATEGORY_CALL)
                            .setVisibility(Notification.VISIBILITY_PUBLIC)
                            .setDefaults(Notification.DEFAULT_ALL)
                            .setContentIntent(tapPI)
                            .setFullScreenIntent(fullScreenPI, true)
                            .build();
                }

                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.notify(NOTIFICATION_ID, notification);
                }

                Log.d(TAG, "fullScreenIntent disparado para deliveryId=" + deliveryId);
            }
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm == null) return;

            // Remove canal antigo e recria com IMPORTANCE_HIGH para garantir fullScreenIntent
            NotificationChannel existing = nm.getNotificationChannel(CHANNEL_ID);
            if (existing != null && existing.getImportance() < NotificationManager.IMPORTANCE_HIGH) {
                nm.deleteNotificationChannel(CHANNEL_ID);
            }

            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Novas Corridas",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alertas de novas corridas - popup de tela cheia");
            channel.enableVibration(true);
            channel.setShowBadge(true);
            channel.setBypassDnd(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(channel);
        }
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "Refreshed token: " + token);
    }
}
