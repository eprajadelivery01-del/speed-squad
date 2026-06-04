import React, { createContext, useContext, useState, ReactNode } from "react";

export interface Notification {
  id: string;
  type: "delivery" | "chat" | "info";
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  deliveryId?: string;
  deliveryStatus?: "pending" | "accepted" | "rejected" | "expired";
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  unreadCount: number;
  updateNotificationStatus: (deliveryId: string, status: "pending" | "accepted" | "rejected" | "expired") => void;
  removeNotificationByDeliveryId: (deliveryId: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notif: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotif: Notification = {
      ...notif,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => {
      // Evitar duplicar notificações pendentes para a mesma corrida
      if (notif.deliveryId && prev.some((n) => n.deliveryId === notif.deliveryId && n.deliveryStatus === notif.deliveryStatus)) {
        return prev;
      }
      return [newNotif, ...prev];
    });
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const updateNotificationStatus = (deliveryId: string, status: "pending" | "accepted" | "rejected" | "expired") => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.deliveryId === deliveryId
          ? { ...n, deliveryStatus: status, read: status !== "pending" }
          : n
      )
    );
  };

  const removeNotificationByDeliveryId = (deliveryId: string) => {
    setNotifications((prev) => prev.filter((n) => n.deliveryId !== deliveryId));
  };

  const clearAll = () => setNotifications([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        clearAll,
        unreadCount,
        updateNotificationStatus,
        removeNotificationByDeliveryId,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
};
