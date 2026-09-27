import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

interface NotificationDescriptor {
  id: number;
}

interface NotificationSchema extends NotificationDescriptor {
  title: string;
  body: string;
  sound?: string;
  actionTypeId?: string;
  extra?: Record<string, unknown> | null;
}

interface LocalNotificationAction {
  notification: NotificationSchema;
}

interface LocalNotificationsPlugin {
  requestPermissions(): Promise<{ display: "prompt" | "prompt-with-rationale" | "granted" | "denied" }>;
  schedule(options: { notifications: NotificationSchema[] }): Promise<{ notifications: NotificationDescriptor[] }>;
  cancel(options: { notifications: NotificationDescriptor[] }): Promise<void>;
  addListener(
    eventName: "localNotificationActionPerformed",
    listenerFunc: (action: LocalNotificationAction) => void,
  ): Promise<PluginListenerHandle>;
}

export const LocalNotifications = registerPlugin<LocalNotificationsPlugin>("LocalNotifications");