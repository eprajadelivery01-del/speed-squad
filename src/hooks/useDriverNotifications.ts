import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook that listens for new deliveries assigned to the current driver
 * and sends a browser push notification + in-app toast.
 */
export function useDriverNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const permissionRef = useRef<NotificationPermission>("default");

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
            toast({
              title: "🏍️ Nova corrida!",
              description: delivery.pickup_address
                ? `Retirada: ${delivery.pickup_address}`
                : "Uma nova entrega foi atribuída a você",
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

    let channelRef: any = null;
    setup().then((ch) => {
      channelRef = ch;
    });

    return () => {
      if (channelRef) supabase.removeChannel(channelRef);
    };
  }, [user?.id, toast]);
}
