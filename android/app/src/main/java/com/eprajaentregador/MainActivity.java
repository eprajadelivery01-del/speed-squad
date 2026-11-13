package com.eprajaentregador;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeliveryOverlayPlugin.class);
        NotificationChannels.ensureIncomingChannel(this);
        super.onCreate(savedInstanceState);
        setupStatusBar();
        handleIntent(getIntent());
    }

    @Override
    public void onResume() {
        super.onResume();
        setupStatusBar();
    }

    private void setupStatusBar() {
        // Garante que o layout respeite as barras de sistema (sem sobreposição indevida da UI web)
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.R) {
            // Suporte para versões antigas do Android (< API 30)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                getWindow().setStatusBarColor(0xFF0D0D0D);
                getWindow().setNavigationBarColor(0xFF0D0D0D);
            }
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                android.view.View decorView = getWindow().getDecorView();
                int flags = decorView.getSystemUiVisibility();
                flags &= ~android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    flags &= ~android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                }
                decorView.setSystemUiVisibility(flags);
            }
        } else {
            // API moderna do AndroidX (Android 11+ até Android 16) sem métodos descontinuados
            if (android.os.Build.VERSION.SDK_INT <= android.os.Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                getWindow().setStatusBarColor(0xFF0D0D0D);
                getWindow().setNavigationBarColor(0xFF0D0D0D);
            }
            androidx.core.view.WindowInsetsControllerCompat insetsController =
                    androidx.core.view.WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            if (insetsController != null) {
                insetsController.setAppearanceLightStatusBars(false);
                insetsController.setAppearanceLightNavigationBars(false);
            }
        }
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
            android.util.Log.d("MainActivity", "handleIntent: ACEITAR deliveryId=" + deliveryId);
            NativeSoundPlayer.stopSound();
            MyFirebaseMessagingService.dismissDeliveryAlert(this, deliveryId);

            DeliveryOverlayPlugin.setPendingAccepted(deliveryId);

            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                if (DeliveryOverlayPlugin.instance != null) {
                    DeliveryOverlayPlugin.instance.triggerDeliveryAccepted(deliveryId);
                }
            }, 600);

            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                if (DeliveryOverlayPlugin.instance != null) {
                    DeliveryOverlayPlugin.instance.triggerDeliveryAccepted(deliveryId);
                }
            }, 1800);
        }
    }
}
