import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAudioAlert } from "@/hooks/useAudioAlert";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export function useDriverNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const { playAlert: playNotificationSound, stopAlert } = useAudioAlert();
  const permissionRef = useRef<NotificationPermission>("default");
  const channelsRef = useRef<any[]>([]);

  // Request notification permission
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.requestPermissions().then((res) => {
        permissionRef.current = res.display === "granted" ? "granted" : "denied";
      });
    } else {
      if (!("Notification" in window)) return;
      if (Notification.permission === "granted") {
        permissionRef.current = "granted";
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((p) => {
          permissionRef.current = p;
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const setup = async () => {
      const { data } = await supabase
        .from("delivery_drivers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!data || cancelled) return;
      const driverId = data.id;

      // Listen for new broadcast deliveries (INSERT with no driver or broadcast)
      const broadcastChannel = supabase
        .channel(`driver-broadcast-${driverId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "deliveries",
          },
          (payload) => {
            const delivery = payload.new as any;
            // Only notify for pending/broadcasted (available rides)
            if (delivery.status === "pending" || delivery.status === "broadcasted") {
              playNotificationSound(true); // Loop alarm
              toast({
                title: "🏍️ Nova corrida disponível!",
                description: delivery.pickup_address
                  ? `Retirada: ${delivery.pickup_address}`
                  : `Entrega para ${delivery.customer_name}`,
              });
              addNotification({
                type: "delivery",
                title: "Nova corrida disponível",
                description: delivery.pickup_address || "Confira na tela inicial.",
              });
              if (permissionRef.current === "granted") {
                const title = "ÉpraJá - Nova corrida!";
                const body = delivery.pickup_address
                  ? `Retirada: ${delivery.pickup_address}`
                  : "Uma nova entrega está disponível";

                if (Capacitor.isNativePlatform()) {
                  LocalNotifications.schedule({
                    notifications: [
                      {
                        title,
                        body,
                        id: new Date().getTime(),
                        schedule: { at: new Date(Date.now() + 100) },
                        actionTypeId: "",
                        extra: null,
                      },
                    ],
                  });
                } else {
                  try {
                    new Notification(title, {
                      body,
                      icon: "/logo.png",
                      tag: `delivery-${delivery.id}`,
                    });
                  } catch { /* SW-only or permission revoked */ }
                }
              }
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "deliveries",
            filter: `driver_id=eq.${driverId}`,
          },
          (payload) => {
            const delivery = payload.new as any;
            const old = payload.old as any;
            if (old.status !== delivery.status && delivery.status === "accepted") {
              toast({
                title: "✅ Corrida confirmada!",
                description: "A entrega foi confirmada. Vá até o ponto de retirada.",
              });
            }
          }
        )
        .subscribe();

      channelsRef.current.push(broadcastChannel);

      // Chat notifications
      const { data: activeDeliveries } = await supabase
        .from("deliveries")
        .select("id")
        .eq("driver_id", driverId)
        .in("status", ["accepted", "collecting", "in_transit"] as any);

      if (!activeDeliveries || activeDeliveries.length === 0 || cancelled) return;

      const deliveryIds = activeDeliveries.map(d => d.id);
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, order_id")
        .in("order_id", deliveryIds);

      if (!convs || cancelled) return;

      convs.forEach(conv => {
        const ch = supabase
          .channel(`notifications-chat-${conv.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `conversation_id=eq.${conv.id}`,
            },
            (payload) => {
              const msg = payload.new as any;
              if (msg.sender_id !== user.id) {
                playNotificationSound();
                toast({ title: "💬 Nova mensagem", description: msg.content });
                addNotification({ type: "chat", title: "Nova mensagem no chat", description: msg.content });

                if (permissionRef.current === "granted") {
                  const title = "💬 Nova mensagem";
                  const body = msg.content;
                  if (Capacitor.isNativePlatform()) {
                    LocalNotifications.schedule({
                      notifications: [
                        {
                          title,
                          body,
                          id: new Date().getTime() + 1,
                          schedule: { at: new Date(Date.now() + 100) },
                          actionTypeId: "",
                          extra: null,
                        },
                      ],
                    });
                  } else {
                    try {
                      new Notification(title, {
                        body,
                        icon: "/logo.png",
                      });
                    } catch { /* ignored */ }
                  }
                }
              }
            }
          )
          .subscribe();
        channelsRef.current.push(ch);
      });
    };

    setup();

    return () => {
      cancelled = true;
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [user?.id]); // Stable deps only
}
