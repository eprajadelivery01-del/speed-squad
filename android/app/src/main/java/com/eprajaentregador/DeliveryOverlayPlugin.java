package com.eprajaentregador;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
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

    private BroadcastReceiver callReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            JSObject ret = new JSObject();
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
        IntentFilter filter = new IntentFilter();
        filter.addAction(IncomingCallActivity.ACTION_CALL_ACCEPTED);
        filter.addAction(IncomingCallActivity.ACTION_CALL_REJECTED);
        getContext().registerReceiver(callReceiver, filter);
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
            call.reject("Permissão de sobreposição não concedida.");
            return;
        }
        Intent intent = new Intent(getContext(), OverlayService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        call.resolve();
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
        Intent intent = new Intent(getContext(), IncomingCallActivity.class);
        intent.putExtra("details", details);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void dismissIncomingCall(PluginCall call) {
        Intent intent = new Intent(IncomingCallActivity.ACTION_CANCEL_CALL);
        getContext().sendBroadcast(intent);
        call.resolve();
    }
}
