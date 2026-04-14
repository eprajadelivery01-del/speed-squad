import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";

// Standard Notification Sound (Glass Ping)
const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

/**
 * Hook that listens for new deliveries assigned to the current driver
 * and sends a browser push notification + in-app toast.
 */
export function useDriverNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const permissionRef = useRef<NotificationPermission>("default");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay policy might block this if user hasn't interacted
        console.warn("Audio playback blocked by browser policies.");
      });
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      permissionRef.current = "granted";
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => {
        permissionRef.current = p;
      });
    }
  }, []);

  // Listen for new deliveries via Supabase realtime
  useEffect(() => {
    if (!user?.id) return;

    // First get the driver record id
    let driverId: string | null = null;

    const setup = async () => {
      const { data } = await supabase
        .from("delivery_drivers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!data) return;
      driverId = data.id;

      const channel = supabase
        .channel(`driver-new-deliveries-${driverId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "deliveries",
            filter: `driver_id=eq.${driverId}`,
          },
          (payload) => {
            const delivery = payload.new as any;

            // In-app toast
            playNotificationSound();
            toast({
              title: "🏍️ Nova corrida!",
              description: delivery.pickup_address
                ? `Retirada: ${delivery.pickup_address}`
                : "Uma nova entrega foi atribuída a você",
            });

            // Add to notification history
            addNotification({
              type: "delivery",
              title: "Nova corrida atribuída",
              description: delivery.pickup_address 
                ? `Retirada: ${delivery.pickup_address}` 
                : "Confira os detalhes na aba de entregas.",
            });

            // Browser notification
            if (permissionRef.current === "granted") {
              try {
                new Notification("ÉpraJá - Nova corrida!", {
                  body: delivery.pickup_address
                    ? `Retirada: ${delivery.pickup_address}`
                    : "Uma nova entrega foi atribuída a você",
                  icon: "/favicon.png",
                  tag: `delivery-${delivery.id}`,
                });
              } catch {
                // SW-only env or permission revoked
              }
            }
          }
        )
        // Also listen for deliveries with status "pending" (available rides)
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

            // Notify only on meaningful status changes
            if (old.status !== delivery.status && delivery.status === "accepted") {
              toast({
                title: "✅ Corrida confirmada!",
                description: "A entrega foi confirmada. Vá até o ponto de retirada.",
              });
            }
          }
        )
        .subscribe();

      return channel;
    };

    const setupChat = async () => {
      // Get all active delivery IDs for this driver
      const { data: activeDeliveries } = await supabase
        .from("deliveries")
        .select("id")
        .eq("driver_id", driverId)
        .in("status", ["accepted", "collecting", "in_route"]);

      if (!activeDeliveries || activeDeliveries.length === 0) return;

      const deliveryIds = activeDeliveries.map(d => d.id);

      // Get conversations for these deliveries
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, order_id")
        .in("order_id", deliveryIds);

      if (!convs) return;

      const channels = convs.map(conv => {
        return supabase
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
                toast({
                  title: "💬 Nova mensagem",
                  description: msg.content,
                });
                addNotification({
                  type: "chat",
                  title: "Nova mensagem no chat",
                  description: msg.content,
                });
              }
            }
          )
          .subscribe();
      });

      return channels;
    };

    let channelsRef: any[] = [];
    setup().then((ch) => {
      if (ch) channelsRef.push(ch);
      setupChat().then((chatChs) => {
        if (chatChs) channelsRef.push(...chatChs);
      });
    });

    return () => {
      channelsRef.forEach(ch => supabase.removeChannel(ch));
    };
  }, [user?.id, toast, addNotification]);
}
