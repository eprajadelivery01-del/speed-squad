package com.eprajaentregador;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

/** Centraliza a criação do canal de notificação de corridas (som + vibração + tela bloqueada). */
public final class NotificationChannels {

    public static final String INCOMING_CHANNEL_ID = "delivery-incoming-v8";
    public static final String MARKETPLACE_CHANNEL_ID = "marketplace_orders";

    private NotificationChannels() {}

    public static void ensureIncomingChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;

        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (sound == null) sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

        // 1) Canal Nativo Marketplace Orders (usado pelo FCM Server)
        if (nm.getNotificationChannel(MARKETPLACE_CHANNEL_ID) == null) {
            NotificationChannel ch = new NotificationChannel(
                    MARKETPLACE_CHANNEL_ID, "Novos Pedidos & Corridas", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Notificações sonoras de novas entregas e pedidos em tempo real");
            ch.setSound(sound, attrs);
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 600, 200, 600, 200, 600});
            ch.enableLights(true);
            ch.setShowBadge(true);
            ch.setBypassDnd(true);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }

        // 2) Canal Nativo Entregas
        if (nm.getNotificationChannel(INCOMING_CHANNEL_ID) == null) {
            NotificationChannel ch = new NotificationChannel(
                    INCOMING_CHANNEL_ID, "Novas Corridas É Pra Já", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Alerta sonoro de novas corridas disponíveis para entregadores");
            ch.setSound(sound, attrs);
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 600, 200, 600, 200, 600});
            ch.enableLights(true);
            ch.setShowBadge(true);
            ch.setBypassDnd(true);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
    }
}
