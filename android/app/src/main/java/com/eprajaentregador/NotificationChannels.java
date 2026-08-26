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

    public static final String INCOMING_CHANNEL_ID = "delivery-incoming-v25-silent";
    public static final String MARKETPLACE_CHANNEL_ID = "marketplace_orders_v25_silent";

    private NotificationChannels() {}

    public static void ensureIncomingChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;

        // Limpa canais obsoletos para evitar conflitos ou sons padrão cacheados pelo Android
        try {
            nm.deleteNotificationChannel("delivery-incoming-v18");
            nm.deleteNotificationChannel("delivery-incoming-v15");
            nm.deleteNotificationChannel("delivery-incoming-v12");
            nm.deleteNotificationChannel("delivery-incoming-v10");
            nm.deleteNotificationChannel("delivery-incoming-v9");
            nm.deleteNotificationChannel("delivery-incoming-v8");
            nm.deleteNotificationChannel("delivery-incoming");
            nm.deleteNotificationChannel("marketplace_orders_v5");
            nm.deleteNotificationChannel("marketplace_orders_v4");
            nm.deleteNotificationChannel("marketplace_orders_v3");
            nm.deleteNotificationChannel("marketplace_orders_v2");
            nm.deleteNotificationChannel("overlay_service_channel");
            nm.deleteNotificationChannel("overlay_service");
        } catch (Exception ignored) {}

        // 1) Canal Nativo Marketplace Orders v25 (Totalmente silencioso para o sistema operacional)
        if (nm.getNotificationChannel(MARKETPLACE_CHANNEL_ID) == null) {
            NotificationChannel ch = new NotificationChannel(
                    MARKETPLACE_CHANNEL_ID, "Novos Pedidos & Corridas", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Alerta visual de novas entregas e pedidos É Pra Já");
            ch.setSound(null, null);
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 800, 250, 800, 250, 800});
            ch.enableLights(true);
            ch.setShowBadge(true);
            ch.setBypassDnd(true);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }

        // 2) Canal Nativo Entregas v25 (Totalmente silencioso no sistema - áudio exclusivo via NativeSoundPlayer)
        if (nm.getNotificationChannel(INCOMING_CHANNEL_ID) == null) {
            NotificationChannel ch = new NotificationChannel(
                    INCOMING_CHANNEL_ID, "Novas Corridas É Pra Já", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Alerta visual de novas corridas disponíveis para entregadores");
            ch.setSound(null, null);
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 800, 250, 800, 250, 800});
            ch.enableLights(true);
            ch.setShowBadge(true);
            ch.setBypassDnd(true);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
    }
}
