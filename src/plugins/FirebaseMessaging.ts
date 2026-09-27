import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

interface MessagingNotification {
  data?: Record<string, unknown>;
}

interface FirebaseMessagingPlugin {
  checkPermissions(): Promise<{ receive: "prompt" | "prompt-with-rationale" | "granted" | "denied" }>;
  requestPermissions(): Promise<{ receive: "prompt" | "prompt-with-rationale" | "granted" | "denied" }>;
  getToken(): Promise<{ token: string }>;
  addListener(eventName: "tokenReceived", listenerFunc: (event: { token: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: "notificationActionPerformed", listenerFunc: (event: { notification?: MessagingNotification }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: "notificationReceived", listenerFunc: (event: { notification?: MessagingNotification }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: string, listenerFunc: (event: any) => void): Promise<PluginListenerHandle>;
}

export const FirebaseMessaging = registerPlugin<FirebaseMessagingPlugin>("FirebaseMessaging");