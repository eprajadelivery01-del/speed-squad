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
    public static final String ACTION_SHOW_POPUP = "com.eprajaentregador.SHOW_POPUP";
    private static final String CHANNEL_ID = NotificationChannels.INCOMING_CHANNEL_ID;
    private static final int NOTIF_ID = 6666;

    private int hashId(String str) {
        if (str == null) return 0;
        int hash = 0;
        for (int i = 0; i < str.length(); i++) {
            hash = ((hash << 5) - hash) + str.charAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "FCM recebido de: " + remoteMessage.getFrom());

        if (remoteMessage.getData().size() == 0) return;

        Map<String, String> data = remoteMessage.getData();
        String type = data.get("type");
        Log.d(TAG, "type=" + type + " | data=" + data);

        // ── CANCELAMENTO: Quando outro entregador aceita a corrida ou ela é cancelada
        if ("cancel_delivery".equals(type)) {
            String deliveryId = data.get("deliveryId");
            Log.d(TAG, "Corrida " + deliveryId + " aceita por outro motorista. Encerrando notificação e popup!");

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(NOTIF_ID);
                if (deliveryId != null && !deliveryId.isEmpty()) {
                    nm.cancel(hashId(deliveryId));
                }
            }

            if (IncomingCallActivity.instance != null) {
                IncomingCallActivity.instance.runOnUiThread(() -> {
                    try {
                        IncomingCallActivity.instance.finish();
                    } catch (Exception e) {
                        Log.w(TAG, "Erro ao fechar IncomingCallActivity: " + e.getMessage());
                    }
                });
            }

            Intent cancelIntent = new Intent(IncomingCallActivity.ACTION_CANCEL_CALL);
            cancelIntent.putExtra("deliveryId", deliveryId);
            cancelIntent.setPackage(getPackageName());
            sendBroadcast(cancelIntent);
            return;
        }

        if (!"delivery".equals(type)) return;

        String deliveryId = data.get("deliveryId");
        String address    = data.get("address");
        String title      = data.get("title");
        String storeName  = data.get("storeName");
        String pickup     = data.get("pickup");
        String dropoff    = data.get("dropoff");
        String fee        = data.get("fee");
        if (storeName == null) storeName = "";
        if (pickup    == null) pickup    = "";
        if (dropoff   == null) dropoff   = "";
        if (fee       == null) fee       = "";

        if (address != null && address.contains("Veja no app")) {
            address = address.replace("Veja no app", "Retirada na Loja");
        }

        String details    = (title  != null && !title.isEmpty()   ? title + "\n"  : "")
                          + (address != null && !address.isEmpty() ? address        : "");
        if (details.trim().isEmpty()) details = "Nova corrida disponível!";
        if (details.contains("Veja no app")) {
            details = details.replace("Veja no app", "Retirada na Loja");
        }

        // Salva para a IncomingCallActivity ler quando abrir
        DeliveryOverlayPlugin.latestDetails    = details;
        DeliveryOverlayPlugin.latestDeliveryId = deliveryId != null ? deliveryId : "";
        DeliveryOverlayPlugin.latestStore      = storeName;
        DeliveryOverlayPlugin.latestPickup     = pickup;
        DeliveryOverlayPlugin.latestDropoff    = dropoff;
        DeliveryOverlayPlugin.latestFee        = fee;

        Log.d(TAG, "Popup para deliveryId=" + deliveryId);

        // ── CAMADA 1: via OverlayService (foreground service pode chamar startActivity no Android 10+)
        try {
            Intent svcIntent = new Intent(this, OverlayService.class);
            svcIntent.setAction(ACTION_SHOW_POPUP);
            svcIntent.putExtra("details",    details);
            svcIntent.putExtra("deliveryId", deliveryId);
            svcIntent.putExtra("storeName", storeName);
            svcIntent.putExtra("pickup",     pickup);
            svcIntent.putExtra("dropoff",    dropoff);
            svcIntent.putExtra("fee",        fee);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(svcIntent);
            } else {
                startService(svcIntent);
            }
            Log.d(TAG, "OverlayService SHOW_POPUP iniciado.");
        } catch (Exception e) {
            Log.w(TAG, "Falha ao iniciar OverlayService: " + e.getMessage());
        }

        // ── CAMADA 2: startActivity direto (funciona quando SYSTEM_ALERT_WINDOW está ativo)
        try {
            Intent actIntent = new Intent(this, IncomingCallActivity.class);
            actIntent.putExtra("details",    details);
            actIntent.putExtra("deliveryId", deliveryId);
            actIntent.putExtra("storeName", storeName);
            actIntent.putExtra("pickup",     pickup);
            actIntent.putExtra("dropoff",    dropoff);
            actIntent.putExtra("fee",        fee);
            actIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                    | Intent.FLAG_ACTIVITY_CLEAR_TOP
                    | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(actIntent);
            Log.d(TAG, "startActivity direto disparado.");
        } catch (Exception e) {
            Log.w(TAG, "startActivity bloqueado: " + e.getMessage());
        }

        // ── CAMADA 3: Notification heads-up (sem full screen intent - política Google Play)
        try {
            ensureChannel();

            Intent fsIntent = new Intent(this, IncomingCallActivity.class);
            fsIntent.putExtra("details",    details);
            fsIntent.putExtra("deliveryId", deliveryId);
            fsIntent.putExtra("storeName", storeName);
            fsIntent.putExtra("pickup",     pickup);
            fsIntent.putExtra("dropoff",    dropoff);
            fsIntent.putExtra("fee",        fee);
            fsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

            int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) piFlags |= PendingIntent.FLAG_IMMUTABLE;

            PendingIntent tapPI = PendingIntent.getActivity(this, 1, fsIntent, piFlags);

            Notification.Builder builder;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                builder = new Notification.Builder(this, CHANNEL_ID);
            } else {
                android.net.Uri sound = android.media.RingtoneManager
                        .getDefaultUri(android.media.RingtoneManager.TYPE_RINGTONE);
                builder = new Notification.Builder(this)
                        .setPriority(Notification.PRIORITY_MAX)
                        .setSound(sound)
                        .setVibrate(new long[]{0, 500, 300, 500, 300, 500})
                        .setDefaults(Notification.DEFAULT_LIGHTS);
            }
            builder.setSmallIcon(android.R.drawable.sym_call_incoming)
                    .setContentTitle("Nova corrida disponível!")
                    .setContentText(details)
                    .setStyle(new Notification.BigTextStyle().bigText(details))
                    .setCategory(Notification.CATEGORY_CALL)
                    .setVisibility(Notification.VISIBILITY_PUBLIC)
                    .setAutoCancel(true)
                    .setOngoing(false)
                    .setContentIntent(tapPI);

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIF_ID, builder.build());
                if (deliveryId != null && !deliveryId.isEmpty()) {
                    nm.notify(hashId(deliveryId), builder.build());
                }
                Log.d(TAG, "Notificação heads-up disparada.");
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro na notificação: " + e.getMessage());
        }
    }

    private void ensureChannel() {
        NotificationChannels.ensureIncomingChannel(this);
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "FCM Token: " + token);
    }
}
