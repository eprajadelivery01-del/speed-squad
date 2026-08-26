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

import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MyFirebaseMsgService";

    // ── Deduplicação de alertas por delivery_id ─────────────────────────────
    // Múltiplos pushes/intents da mesma corrida (retransmissão FCM, reenvio do
    // backend, rebroadcast) não podem piscar nem repetir o som: só o primeiro
    // alerta dentro da janela dispara notificação.
    private static final long DEDUP_WINDOW_MS = 120_000; // 2 minutos
    private static final int MAX_TRACKED_ALERTS = 200;
    private static final Map<String, Long> recentAlerts = Collections.synchronizedMap(
            new LinkedHashMap<String, Long>(64, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, Long> eldest) {
                    return size() > MAX_TRACKED_ALERTS;
                }
            });

    /** Retorna true apenas no primeiro alerta da corrida dentro da janela. */
    private static boolean markAlertedOnce(String key) {
        long now = System.currentTimeMillis();
        synchronized (recentAlerts) {
            Iterator<Map.Entry<String, Long>> it = recentAlerts.entrySet().iterator();
            while (it.hasNext()) {
                if (now - it.next().getValue() > DEDUP_WINDOW_MS) it.remove();
            }
            Long last = recentAlerts.get(key);
            if (last != null && now - last < DEDUP_WINDOW_MS) return false;
            recentAlerts.put(key, now);
            return true;
        }
    }

    /**
     * Cancelamento vindo do backend (outro entregador aceitou / corrida
     * cancelada / rebroadcast): limpa a deduplicação para que um eventual
     * reenvio legítimo da MESMA corrida volte a alertar.
     */
    public static void cancelDeliveryAlert(Context context, String deliveryId) {
        if (deliveryId == null || deliveryId.isEmpty()) return;
        synchronized (recentAlerts) {
            recentAlerts.remove(deliveryId);
        }
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(hashId(deliveryId));
    }

    /**
     * Aceite/recusa feitos pelo próprio entregador no app: apenas remove a
     * notificação da bandeja, MANTENDO a deduplicação para que pushes
     * residuais da mesma corrida não re-alertem.
     */
    public static void dismissDeliveryAlert(Context context, String deliveryId) {
        if (deliveryId == null || deliveryId.isEmpty()) return;
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(hashId(deliveryId));
    }

    private static int hashId(String str) {
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
            if (deliveryId == null || deliveryId.isEmpty()) deliveryId = data.get("delivery_id");
            Log.d(TAG, "Corrida " + deliveryId + " indisponível. Encerrando notificação.");
            cancelDeliveryAlert(this, deliveryId);
            return;
        }

        boolean isDelivery = "delivery".equals(type) || "INSERT".equals(type) || "UPDATE".equals(type)
                || "new_delivery".equals(type) || data.containsKey("deliveryId") || data.containsKey("delivery_id");
        if (!isDelivery) return;

        // ── GUARDA OFFLINE: entregador offline não deve receber som/alerta de corrida.
        // Default true para não quebrar instalações que ainda não gravaram a flag.
        boolean driverOnline = getSharedPreferences(DeliveryOverlayPlugin.PREFS_NAME, Context.MODE_PRIVATE)
                .getBoolean("is_online", true);
        if (!driverOnline) {
            Log.d(TAG, "Entregador offline — alerta de corrida suprimido.");
            return;
        }

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

        // ── DEDUPLICAÇÃO: ignora qualquer push repetido da mesma corrida.
        String dedupKey = (deliveryId != null && !deliveryId.isEmpty())
                ? deliveryId
                : "details:" + details.hashCode();
        if (!markAlertedOnce(dedupKey)) {
            Log.d(TAG, "Push duplicado ignorado para " + dedupKey + " (janela de 2 min).");
            return;
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

            // Botão 1: ACEITAR na notificação da central
            Intent acceptIntent = new Intent(this, MainActivity.class);
            acceptIntent.putExtra("deliveryId", deliveryId);
            acceptIntent.putExtra("action", "accept");
            acceptIntent.putExtra("route", "/driver?deliveryId=" + deliveryId + "&action=accept");
            acceptIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            PendingIntent acceptPI = PendingIntent.getActivity(this, notificationId * 10 + 1, acceptIntent, piFlags);

            // Botão 2: RECUSAR na notificação da central
            Intent declineIntent = new Intent(this, NotificationActionReceiver.class);
            declineIntent.setAction("ACTION_DECLINE");
            declineIntent.putExtra("deliveryId", deliveryId);
            PendingIntent declinePI = PendingIntent.getBroadcast(this, notificationId * 10 + 2, declineIntent, piFlags);

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
                    .setContentIntent(tapPI)
                    .addAction(R.mipmap.ic_launcher, "ACEITAR", acceptPI)
                    .addAction(R.mipmap.ic_launcher, "RECUSAR", declinePI);

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(notificationId, builder.build());
                Log.d(TAG, "Notificação com botões disparada para deliveryId=" + deliveryId);
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
