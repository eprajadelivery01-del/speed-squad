import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";

const NOTIFICATION_SOUND = "/notification.mp3";
const FALLBACK_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export function useDriverNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const permissionRef = useRef<NotificationPermission>("default");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelsRef = useRef<any[]>([]);

  useEffect(() => {
    const audio = new Audio(NOTIFICATION_SOUND);
    audio.addEventListener("error", () => {
      audioRef.current = new Audio(FALLBACK_SOUND);
      audioRef.current.load();
    });
    audio.load();
    audioRef.current = audio;
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.warn("[Notifications] Audio blocked:", err.message);
      });
    }
    // Vibration API
    if ("vibrate" in navigator) {
      navigator.vibrate([300, 150, 300, 150, 300]);
    }
  }, []);

  // Request notification permission
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
              playNotificationSound();
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
                try {
                  new Notification("ÉpraJá - Nova corrida!", {
                    body: delivery.pickup_address
                      ? `Retirada: ${delivery.pickup_address}`
                      : "Uma nova entrega está disponível",
                    icon: "/logo.png",
                    tag: `delivery-${delivery.id}`,
                  });
                } catch { /* SW-only or permission revoked */ }
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
