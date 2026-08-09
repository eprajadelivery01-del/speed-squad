package com.eprajaentregador;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DeliveryOverlay")
public class DeliveryOverlayPlugin extends Plugin {

    public static final String PREFS_NAME = "eprajadriver";

    public static DeliveryOverlayPlugin instance;
    public static String latestDetails = "";
    public static String latestDeliveryId = "";
    public static String latestStore = "";
    public static String latestPickup = "";
    public static String latestDropoff = "";
    public static String latestFee = "";

    private BroadcastReceiver callReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            String deliveryId = intent.getStringExtra("deliveryId");
            JSObject ret = new JSObject();
            if (deliveryId != null) {
                ret.put("deliveryId", deliveryId);
            }
            if (IncomingCallActivity.ACTION_CALL_ACCEPTED.equals(action)) {
                ret.put("status", "accepted");
                notifyListeners("onCallResponse", ret);
            } else if (IncomingCallActivity.ACTION_CALL_REJECTED.equals(action)) {
                ret.put("status", "rejected");
                notifyListeners("onCallResponse", ret);
            }
        }
    };

    @Override
    public void load() {
        super.load();
        instance = this;
        IntentFilter filter = new IntentFilter();
        filter.addAction(IncomingCallActivity.ACTION_CALL_ACCEPTED);
        filter.addAction(IncomingCallActivity.ACTION_CALL_REJECTED);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(callReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(callReceiver, filter);
        }
    }

    public void triggerCallResponse(String status, String deliveryId) {
        JSObject ret = new JSObject();
        if (deliveryId != null) {
            ret.put("deliveryId", deliveryId);
        }
        ret.put("status", status);
        notifyListeners("onCallResponse", ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(getContext())) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } else {
            call.resolve();
        }
    }

    @PluginMethod
    public void startOverlay(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(getContext())) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("reason", "Permissão de sobreposição não concedida.");
            call.resolve(ret);
            return;
        }
        Intent intent = new Intent(getContext(), OverlayService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopOverlay(PluginCall call) {
        Intent intent = new Intent(getContext(), OverlayService.class);
        getContext().stopService(intent);
        call.resolve();
    }

    @PluginMethod
    public void testIncomingCall(PluginCall call) {
        String details = call.getString("details", "Nova entrega próxima a você!");
        String deliveryId = call.getString("deliveryId", "");
        latestDetails = details;
        latestDeliveryId = deliveryId;
        Intent intent = new Intent(getContext(), IncomingCallActivity.class);
        intent.putExtra("details", details);
        intent.putExtra("deliveryId", deliveryId);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void updateIncomingCall(PluginCall call) {
        String details = call.getString("details", "");
        String deliveryId = call.getString("deliveryId", "");
        latestDetails = details;
        latestDeliveryId = deliveryId;
        
        if (IncomingCallActivity.instance != null) {
            IncomingCallActivity.instance.runOnUiThread(() -> {
                IncomingCallActivity.instance.updateDetails(details, deliveryId);
            });
        } else {
            Intent intent = new Intent(IncomingCallActivity.ACTION_UPDATE_CALL);
            intent.putExtra("details", details);
            intent.putExtra("deliveryId", deliveryId);
            intent.setPackage(getContext().getPackageName()); // FORÇA EXPLICITO
            getContext().sendBroadcast(intent);
        }
        call.resolve();
    }

    /**
     * Salva o contexto do entregador (driver_id + auth token) no SharedPreferences.
     * Chamado pelo JS logo após o login, para que o aceite nativo funcione
     * mesmo quando o app está morto e o JS não está rodando.
     */
    @PluginMethod
    public void saveDriverContext(PluginCall call) {
        String driverId = call.getString("driverId", "");
        String userToken = call.getString("userToken", "");
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putString("driver_id", driverId)
                .putString("user_token", userToken)
                .apply();
        call.resolve();
    }

    @PluginMethod
    public void dismissIncomingCall(PluginCall call) {
        if (IncomingCallActivity.instance != null) {
            IncomingCallActivity.instance.runOnUiThread(() -> {
                IncomingCallActivity.instance.finish();
            });
        } else {
            Intent intent = new Intent(IncomingCallActivity.ACTION_CANCEL_CALL);
            intent.setPackage(getContext().getPackageName());
            getContext().sendBroadcast(intent);
        }
        call.resolve();
    }
}
