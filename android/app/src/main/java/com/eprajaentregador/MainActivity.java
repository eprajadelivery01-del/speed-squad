package com.eprajaentregador;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeliveryOverlayPlugin.class);
        NotificationChannels.ensureIncomingChannel(this);
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getStringExtra("action");
        String deliveryId = intent.getStringExtra("deliveryId");

        if (deliveryId != null && !deliveryId.isEmpty() && "accept".equals(action)) {
            NativeSoundPlayer.stopSound();
            MyFirebaseMessagingService.dismissDeliveryAlert(this, deliveryId);

            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                if (DeliveryOverlayPlugin.instance != null) {
                    DeliveryOverlayPlugin.instance.triggerDeliveryAccepted(deliveryId);
                }
            }, 600);
        }
    }
}
