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

    public static final String INCOMING_CHANNEL_ID = "delivery-incoming-v5";

    private NotificationChannels() {}

    public static void ensureIncomingChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;
        if (nm.getNotificationChannel(INCOMING_CHANNEL_ID) != null) return;

        NotificationChannel ch = new NotificationChannel(
                INCOMING_CHANNEL_ID, "Novas corridas", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Alerta sonoro de novas corridas disponíveis");

        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (sound == null) sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        ch.setSound(sound, attrs);

        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 500, 300, 500, 300, 500});
        ch.enableLights(true);
        ch.setShowBadge(true);
        ch.setBypassDnd(true);
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }
}
