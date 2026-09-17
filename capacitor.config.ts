import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.epraja.entregador',
  appName: 'É Pra Já - Entregador',
  webDir: 'dist',
  backgroundColor: '#0D0D0D',
  android: {
    backgroundColor: '#0D0D0D',
  },
  plugins: {
    StatusBar: {
      backgroundColor: '#0D0D0D',
      style: 'DARK',
      overlaysWebView: false,
    },
    LocalNotifications: {
      sound: "notification_sound.mp3",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
