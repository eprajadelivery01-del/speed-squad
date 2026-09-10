import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eprajaentregador',
  appName: 'É Pra Já - Entregador',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      sound: "notification_sound.mp3",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
