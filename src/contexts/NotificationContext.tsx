import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  type: "delivery" | "chat" | "info" | "marketing";
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  emoji?: string | null;
  image_url?: string | null;
  coupon_code?: string | null;
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
  refreshMarketingNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const READ_STORAGE_KEY = "@epraja_driver_read_notif_ids";
const CLEARED_STORAGE_KEY = "@epraja_driver_cleared_notif_ids";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [operationalNotifs, setOperationalNotifs] = useState<Notification[]>([]);
  const [marketingNotifs, setMarketingNotifs] = useState<Notification[]>([]);

  const getReadIds = useCallback((): Set<string> => {
    try {
      const raw = localStorage.getItem(READ_STORAGE_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  }, []);

  const getClearedIds = useCallback((): Set<string> => {
    try {
      const raw = localStorage.getItem(CLEARED_STORAGE_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  }, []);

  // O app do entregador é estritamente operacional (corridas, pedidos e chat).
  // NUNCA busca ou exibe campanhas promocionais de comida/marketing do marketplace.
  const fetchMarketingNotifications = useCallback(async () => {
    setMarketingNotifs([]);
  }, []);

  useEffect(() => {
    // Entregadores não recebem notificações de marketing de comida do marketplace
    setMarketingNotifs([]);
  }, []);

  const addNotification = (notif: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotif: Notification = {
      ...notif,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      read: false,
    };
    setOperationalNotifs((prev) => {
      // Evitar duplicar notificações pendentes para a mesma corrida
      if (notif.deliveryId && prev.some((n) => n.deliveryId === notif.deliveryId && n.deliveryStatus === notif.deliveryStatus)) {
        return prev;
      }
      return [newNotif, ...prev];
    });
  };

  const markAsRead = (id: string) => {
    try {
      const readIds = getReadIds();
      readIds.add(id);
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(readIds)));
    } catch {}

    setOperationalNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setMarketingNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const updateNotificationStatus = (deliveryId: string, status: "pending" | "accepted" | "rejected" | "expired") => {
    setOperationalNotifs((prev) =>
      prev.map((n) =>
        n.deliveryId === deliveryId
          ? { ...n, deliveryStatus: status, read: status !== "pending" }
          : n
      )
    );
  };

  const removeNotificationByDeliveryId = (deliveryId: string) => {
    setOperationalNotifs((prev) => prev.filter((n) => n.deliveryId !== deliveryId));
  };

  const clearAll = () => {
    try {
      const clearedIds = getClearedIds();
      marketingNotifs.forEach((n) => clearedIds.add(n.id));
      localStorage.setItem(CLEARED_STORAGE_KEY, JSON.stringify(Array.from(clearedIds)));
    } catch {}
    setOperationalNotifs([]);
    setMarketingNotifs([]);
  };

  // 3. Combina e ordena da mais recente para a mais antiga sem duplicatas
  const allNotifications = (() => {
    const seenIds = new Set<string>();
    const combined: Notification[] = [];

    // Adiciona operacionais
    for (const n of operationalNotifs) {
      if (!seenIds.has(n.id)) {
        seenIds.add(n.id);
        combined.push(n);
      }
    }
    // Adiciona marketing
    for (const n of marketingNotifs) {
      if (!seenIds.has(n.id)) {
        seenIds.add(n.id);
        combined.push(n);
      }
    }

    return combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  })();

  const unreadCount = allNotifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications: allNotifications,
        addNotification,
        markAsRead,
        clearAll,
        unreadCount,
        updateNotificationStatus,
        removeNotificationByDeliveryId,
        refreshMarketingNotifications: fetchMarketingNotifications,
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

