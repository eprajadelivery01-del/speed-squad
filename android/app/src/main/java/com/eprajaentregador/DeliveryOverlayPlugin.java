package com.eprajaentregador;

import android.content.Context;
import android.content.Intent;
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
    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public void triggerFcmTokenRefresh(String token) {
        JSObject ret = new JSObject();
        ret.put("token", token);
        notifyListeners("onFcmTokenRefresh", ret);
    }

    @PluginMethod
    public void getPendingFcmToken(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String token = prefs.getString("pending_fcm_token", "");
        JSObject ret = new JSObject();
        ret.put("token", token);
        call.resolve(ret);
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
    public void requestBatteryOptimizationExemption(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                android.os.PowerManager pm = (android.os.PowerManager) getContext()
                        .getSystemService(Context.POWER_SERVICE);
                String pkg = getContext().getPackageName();
                boolean ignoring = pm != null && pm.isIgnoringBatteryOptimizations(pkg);
                ret.put("ignoring", ignoring);
                Boolean prompt = call.getBoolean("prompt", false);
                if (!ignoring && Boolean.TRUE.equals(prompt)) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                            Uri.parse("package:" + pkg));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                }
            } else {
                ret.put("ignoring", true);
            }
        } catch (Exception e) {
            ret.put("ignoring", false);
            ret.put("error", e.getMessage());
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void startOverlay(PluginCall call) {
        // Mesmo sem permissão de sobreposição, iniciamos o serviço em primeiro
        // plano: ele mantém o processo vivo para o FCM continuar chegando
        // depois de vários minutos com o app fechado/em segundo plano.
        Intent intent = new Intent(getContext(), OverlayService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        JSObject ret = new JSObject();
        boolean canOverlay = Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                || Settings.canDrawOverlays(getContext());
        ret.put("success", true);
        if (!canOverlay) {
            ret.put("reason", "Permissão de sobreposição não concedida (serviço ativo mesmo assim).");
        }
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
        // Mantido apenas por compatibilidade com versões web antigas. O popup
        // de aceite/recusa foi removido; alertas são notificações informativas.
        call.resolve();
    }

    @PluginMethod
    public void updateIncomingCall(PluginCall call) {
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

    /**
     * Recebe do JS o resultado da confirmação do aceite no Supabase e repassa
     * para o card nativo, que só fecha depois desse retorno.
     */
    @PluginMethod
    public void reportCallResult(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void dismissIncomingCall(PluginCall call) {
        call.resolve();
    }
}
