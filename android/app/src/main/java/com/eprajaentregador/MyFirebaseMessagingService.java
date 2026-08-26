package com.eprajaentregador;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MyFirebaseMsgService";
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
            Log.d(TAG, "Corrida " + deliveryId + " indisponível. Encerrando notificação.");

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && deliveryId != null && !deliveryId.isEmpty()) {
                nm.cancel(hashId(deliveryId));
            }
            return;
        }

        boolean isDelivery = "delivery".equals(type) || "INSERT".equals(type) || "UPDATE".equals(type) 
                || "new_delivery".equals(type) || data.containsKey("deliveryId") || data.containsKey("delivery_id");
        if (!isDelivery) return;

        String deliveryId = data.get("deliveryId");
        if (deliveryId == null || deliveryId.isEmpty()) deliveryId = data.get("delivery_id");
        if (deliveryId == null || deliveryId.isEmpty()) deliveryId = data.get("id");

        String address    = data.get("address");
        if (address == null || address.isEmpty()) address = data.get("details");

        String title      = data.get("title");
        String storeName  = data.get("storeName");
        if (storeName == null || storeName.isEmpty()) storeName = data.get("store_name");
        if (storeName == null || storeName.isEmpty()) storeName = data.get("company_name");

        String pickup     = data.get("pickup");
        if (pickup == null || pickup.isEmpty()) pickup = data.get("pickup_address");

        String dropoff    = data.get("dropoff");
        if (dropoff == null || dropoff.isEmpty()) dropoff = data.get("delivery_address");

        String fee        = data.get("fee");
        if (fee == null || fee.isEmpty()) fee = data.get("delivery_fee");
        if (storeName == null) storeName = "";
        if (pickup    == null) pickup    = "";
        if (dropoff   == null) dropoff   = "";
        if (fee       == null) fee       = "";

        if (address != null && address.contains("Veja no app")) {
            address = address.replace("Veja no app", "Retirada na Loja");
        }

        // Extrai o nome da loja e o endereço de entrega do bloco formatado caso venha como fallback
        if ((storeName.isEmpty() || "Loja Parceira".equalsIgnoreCase(storeName.trim())) && address != null && address.contains("🏬 Loja:")) {
            try {
                int startIdx = address.indexOf("🏬 Loja:") + "🏬 Loja:".length();
                int endIdx = address.indexOf("\n", startIdx);
                String parsed = (endIdx != -1 ? address.substring(startIdx, endIdx) : address.substring(startIdx)).trim();
                if (!parsed.isEmpty() && !"Loja Parceira".equalsIgnoreCase(parsed)) {
                    storeName = parsed;
                }
            } catch (Exception e) {}
        }
        if ((dropoff.isEmpty() || "Endereço do cliente".equalsIgnoreCase(dropoff.trim())) && address != null && address.contains("🏁 Entrega:")) {
            try {
                int startIdx = address.indexOf("🏁 Entrega:") + "🏁 Entrega:".length();
                int endIdx = address.indexOf("\n", startIdx);
                String parsed = (endIdx != -1 ? address.substring(startIdx, endIdx) : address.substring(startIdx)).trim();
                if (!parsed.isEmpty() && !"Endereço do cliente".equalsIgnoreCase(parsed)) {
                    dropoff = parsed;
                }
            } catch (Exception e) {}
        }

        String details    = (title  != null && !title.isEmpty()   ? title + "\n"  : "")
                          + (address != null && !address.isEmpty() ? address        : "");
        if (details.trim().isEmpty()) details = "Nova corrida disponível!";
        if (details.contains("Veja no app")) {
            details = details.replace("Veja no app", "Retirada na Loja");
        }

        // Uma única notificação informativa por corrida. O aceite/recusa acontece
        // exclusivamente no card da tela inicial do app.
        try {
            ensureChannel();

            Intent openIntent = new Intent(this, MainActivity.class);
            openIntent.putExtra("deliveryId", deliveryId);
            openIntent.putExtra("route", "/driver");
            openIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

            int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                piFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            int notificationId = hashId(deliveryId == null ? details : deliveryId);
            PendingIntent tapPI = PendingIntent.getActivity(this, notificationId, openIntent, piFlags);

            android.net.Uri sound = android.net.Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.notification_sound);

        // Override estrito de title e storeName para garantir o Nome da Loja
        if (title != null && title.contains("Nova corrida") && address != null && address.contains("🏬 Loja:")) {
            try {
                int startIdx = address.indexOf("🏬 Loja:") + "🏬 Loja:".length();
                int endIdx = address.indexOf("\n", startIdx);
                String parsedStore = (endIdx != -1 ? address.substring(startIdx, endIdx) : address.substring(startIdx)).trim();
                if (!parsedStore.isEmpty() && !"Loja Parceira".equalsIgnoreCase(parsedStore)) {
                    storeName = parsedStore;
                }
            } catch (Exception e) {}
        }

        String finalStoreName = (storeName != null && !storeName.trim().isEmpty() && !"Loja Parceira".equalsIgnoreCase(storeName.trim()))
                ? storeName.trim()
                : "É Pra Já Delivery";

        String cardTitle = "🏬 " + finalStoreName;

            String cardSubtext = (dropoff != null && !dropoff.trim().isEmpty() && !"Endereço do cliente".equalsIgnoreCase(dropoff.trim()))
                    ? "🏁 Entrega: " + dropoff.trim()
                    : "📍 Retirada na Loja";

            String formattedBigText = "🏬 Loja: " + finalStoreName
                    + "\n📍 Coleta: " + (pickup != null && !pickup.trim().isEmpty() ? pickup : "Retirada na Loja")
                    + "\n🏁 Entrega: " + (dropoff != null && !dropoff.trim().isEmpty() ? dropoff : "Endereço do cliente")
                    + "\n💰 Ganhos: " + (fee != null && !fee.trim().isEmpty() ? fee : "A calcular");

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, NotificationChannels.INCOMING_CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(cardTitle)
                    .setContentText(cardSubtext)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(formattedBigText))
                    .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setSound(sound)
                    .setVibrate(new long[]{0, 600, 200, 600, 200, 600})
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setAutoCancel(true)
                    .setOngoing(false)
                    .setOnlyAlertOnce(true)
                    .setContentIntent(tapPI);

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(notificationId, builder.build());
                Log.d(TAG, "Notificação única disparada para deliveryId=" + deliveryId);
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
        getSharedPreferences(DeliveryOverlayPlugin.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString("pending_fcm_token", token)
                .apply();
        if (DeliveryOverlayPlugin.instance != null) {
            DeliveryOverlayPlugin.instance.triggerFcmTokenRefresh(token);
        }
        Log.d(TAG, "Novo token FCM armazenado para sincronização.");
    }
}
