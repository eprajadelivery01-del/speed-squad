package com.eprajaentregador;

import android.content.Intent;
import android.util.Log;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MyFirebaseMsgService";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        Log.d(TAG, "From: " + remoteMessage.getFrom());

        // Check if message contains a data payload.
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Message data payload: " + remoteMessage.getData());
            
            Map<String, String> data = remoteMessage.getData();
            String type = data.get("type");
            
            if ("delivery".equals(type)) {
                String deliveryId = data.get("deliveryId");
                String address = data.get("address");
                String title = data.get("title");
                
                String details = (title != null ? title + "\n" : "") + (address != null ? address : "");

                // Lança a IncomingCallActivity
                Intent intent = new Intent(this, IncomingCallActivity.class);
                intent.putExtra("details", details);
                intent.putExtra("deliveryId", deliveryId);
                // As flags abaixo são essenciais para iniciar a Activity a partir do background
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                
                startActivity(intent);
            }
        }
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "Refreshed token: " + token);
        // O Capacitor Push Notifications plugin já gerencia o token e envia pro JS,
        // mas é bom ter isso caso precise injetar lógicas nativas futuramente.
    }
}
