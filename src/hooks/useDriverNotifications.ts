import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAudioAlert } from "@/hooks/useAudioAlert";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

// Register plugin only once per JS context to avoid HMR warnings
let BackgroundMode: any = null;
try {
  BackgroundMode = registerPlugin<any>("BackgroundMode");
} catch {
  BackgroundMode = null;
}

const hashId = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickAddress = (d: any): string =>
  d?.pickup_address ||
  d?.delivery_address ||
  d?.dropoff_address ||
  d?.address ||
  "Confira na tela inicial.";

export function useDriverNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const { playAlert, stopAlert } = useAudioAlert();
  const permissionRef = useRef<NotificationPermission>("default");
  const channelsRef = useRef<any[]>([]);
  const intervalRef = useRef<any>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const mountedAtRef = useRef<number>(Date.now());

  // Permission setup
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.requestPermissions().then((res) => {
        permissionRef.current = res.display === "granted" ? "granted" : "denied";
        if (permissionRef.current === "granted") {
          if (BackgroundMode) {
            try {
              BackgroundMode.enable?.().catch(() => {});
              BackgroundMode.disableWebViewOptimizations?.().catch(() => {});
              BackgroundMode.disableBatteryOptimizations?.().catch(() => {});
            } catch {}
          }
          LocalNotifications.registerActionTypes({
            types: [
              {
                id: "DELIVERY_ACTION",
                actions: [
                  { id: "accept", title: "✅ Aceitar" },
                  { id: "reject", title: "❌ Rejeitar", destructive: true },
                ],
              },
            ],
          }).catch(() => {});
        }
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
    let actionListener: any = null;

    // Unified notifier — always fires sound + toast + central + OS notification
    const notifyNewDelivery = (delivery: any) => {
      if (!delivery?.id) return;
      if (seenIdsRef.current.has(delivery.id)) return;
      seenIdsRef.current.add(delivery.id);

      const address = pickAddress(delivery);
      const title = "🏍️ Nova corrida disponível!";
      const description = `Retirada: ${address}`;

      // 1) Sound (looped) + vibration via hook
      try { playAlert(true); } catch (e) { console.warn("[Notify] som falhou:", e); }

      // 2) Toast
      try { toast({ title, description }); } catch {}

      // 3) Central de notificações
      try {
        addNotification({
          type: "delivery",
          title: "Nova corrida disponível",
          description,
        });
      } catch (e) {
        console.warn("[Notify] central falhou:", e);
      }

      // 4) OS notification
      if (permissionRef.current === "granted") {
        if (Capacitor.isNativePlatform()) {
          LocalNotifications.schedule({
            notifications: [
              {
                title: "ÉpraJá - Nova corrida!",
                body: description,
                id: hashId(delivery.id),
                schedule: { at: new Date(Date.now() + 100) },
                actionTypeId: "DELIVERY_ACTION",
                extra: { type: "delivery", deliveryId: delivery.id },
              },
            ],
          }).catch(() => {});
        } else {
          try {
            new Notification("ÉpraJá - Nova corrida!", {
              body: description,
              icon: "/logo.png",
              tag: `delivery-${delivery.id}`,
            });
          } catch {}
        }
      }
    };

    const setup = async () => {
      const { data: driverRow } = await supabase
        .from("delivery_drivers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!driverRow || cancelled) return;
      const driverId = driverRow.id;

      // Native action listener
      if (Capacitor.isNativePlatform()) {
        actionListener = await LocalNotifications.addListener(
          "localNotificationActionPerformed",
          async (action) => {
            if (action.notification.extra?.type === "delivery") {
              stopAlert();
              const deliveryId = action.notification.extra.deliveryId;
              if (action.actionId === "accept") {
                const { error } = await supabase
                  .from("deliveries")
                  .update({ status: "accepted", driver_id: driverId })
                  .eq("id", deliveryId)
                  .in("status", ["pending", "broadcasted"]);
                toast(
                  error
                    ? { title: "Erro", description: "Não foi possível aceitar.", variant: "destructive" }
                    : { title: "✅ Corrida aceita!", description: "Aceita via notificação." }
                );
              } else if (action.actionId === "reject") {
                LocalNotifications.cancel({ notifications: [{ id: hashId(deliveryId) }] }).catch(() => {});
              }
            }
          }
        );
      }

      // Initial seed: mark all currently-available deliveries as "seen"
      // older than 60s so we don't spam on app open, but very recent ones still ring.
      try {
        const { data: initial } = await supabase
          .from("deliveries")
          .select("id, created_at, pickup_address, delivery_address, dropoff_address, address, status")
          .in("status", ["pending", "broadcasted"]);

        if (initial && !cancelled) {
          const cutoff = Date.now() - 60_000;
          initial.forEach((d: any) => {
            const ts = d.created_at ? new Date(d.created_at).getTime() : 0;
            if (ts < cutoff) {
              seenIdsRef.current.add(d.id);
            } else {
              // Fresh — notify
              notifyNewDelivery(d);
            }
          });
        }
      } catch (e) {
        console.warn("[Notify] seed inicial falhou:", e);
      }

      // Polling fallback (RLS pode bloquear eventos INSERT realtime)
      intervalRef.current = setInterval(async () => {
        if (cancelled) return;
        try {
          const { data } = await supabase
            .from("deliveries")
            .select("id, created_at, pickup_address, delivery_address, dropoff_address, address, status")
            .in("status", ["pending", "broadcasted"]);
          if (data && !cancelled) {
            data.forEach((d: any) => notifyNewDelivery(d));
          }
        } catch (e) {
          console.warn("[Notify] polling falhou:", e);
        }
      }, 8000);

      // Realtime — INSERT
      const broadcastChannel = supabase
        .channel(`driver-broadcast-${driverId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "deliveries" },
          (payload) => {
            const d = payload.new as any;
            if (d?.status === "pending" || d?.status === "broadcasted") {
              notifyNewDelivery(d);
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "deliveries" },
          (payload) => {
            const d = payload.new as any;
            const o = payload.old as any;

            // Disappeared from broadcast pool → stop alarm + cancel OS notif
            if (
              (o?.status === "pending" || o?.status === "broadcasted") &&
              d?.status !== "pending" &&
              d?.status !== "broadcasted"
            ) {
              if (Capacitor.isNativePlatform()) {
                LocalNotifications.cancel({ notifications: [{ id: hashId(d.id) }] }).catch(() => {});
              }
              stopAlert();
            }

            // Newly broadcasted
            if (
              o?.status &&
              o.status !== "pending" &&
              o.status !== "broadcasted" &&
              (d?.status === "pending" || d?.status === "broadcasted")
            ) {
              // Force re-notify even if previously seen
              seenIdsRef.current.delete(d.id);
              notifyNewDelivery(d);
            }

            // Confirmation for own delivery
            if (d?.driver_id === driverId && o?.status !== d?.status && d?.status === "accepted") {
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

      const deliveryIds = activeDeliveries.map((d) => d.id);
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, order_id")
        .in("order_id", deliveryIds);

      if (!convs || cancelled) return;

      convs.forEach((conv) => {
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
                try { playAlert(false); } catch {}
                toast({ title: "💬 Nova mensagem", description: msg.content });
                addNotification({ type: "chat", title: "Nova mensagem no chat", description: msg.content });

                if (permissionRef.current === "granted") {
                  if (Capacitor.isNativePlatform()) {
                    LocalNotifications.schedule({
                      notifications: [
                        {
                          title: "💬 Nova mensagem",
                          body: msg.content,
                          id: new Date().getTime() + 1,
                          schedule: { at: new Date(Date.now() + 100) },
                          actionTypeId: "",
                          extra: null,
                        },
                      ],
                    }).catch(() => {});
                  } else {
                    try {
                      new Notification("💬 Nova mensagem", { body: msg.content, icon: "/logo.png" });
                    } catch {}
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
      if (actionListener) actionListener.remove();
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, toast, playAlert, stopAlert, addNotification]);
}
