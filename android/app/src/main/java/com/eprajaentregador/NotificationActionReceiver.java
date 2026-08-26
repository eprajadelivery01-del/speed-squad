package com.eprajaentregador;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class NotificationActionReceiver extends BroadcastReceiver {
    private static final String TAG = "NotificationAction";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        String deliveryId = intent.getStringExtra("deliveryId");
        Log.d(TAG, "onReceive action=" + action + " deliveryId=" + deliveryId);

        if (deliveryId == null || deliveryId.isEmpty()) return;

        if ("ACTION_DECLINE".equals(action)) {
            // Dismiss notification from drawer and mark as declined
            MyFirebaseMessagingService.dismissDeliveryAlert(context, deliveryId);

            // Notify running Capacitor plugin if alive
            if (DeliveryOverlayPlugin.instance != null) {
                DeliveryOverlayPlugin.instance.triggerDeliveryDeclined(deliveryId);
            }
        }
    }
}
