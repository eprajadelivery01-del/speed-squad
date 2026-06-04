import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAudioAlert } from "@/hooks/useAudioAlert";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const BackgroundMode = registerPlugin<any>('BackgroundMode');

// Hash utility para gerar IDs consistentes para notificações locais baseados em UUIDs
const hashId = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export function useDriverNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const { playAlert: playNotificationSound, stopAlert } = useAudioAlert();
  const permissionRef = useRef<NotificationPermission>("default");
  const channelsRef = useRef<any[]>([]);

  // Request notification permission and enable background mode
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.requestPermissions().then((res) => {
        permissionRef.current = res.display === "granted" ? "granted" : "denied";
        if (permissionRef.current === "granted") {
          try {
            BackgroundMode.enable();
            // setSettings is not implemented on Android for this plugin version
            BackgroundMode.disableWebViewOptimizations();
            BackgroundMode.disableBatteryOptimizations();
          } catch (e) {
            console.warn("Background mode settings not fully supported:", e);
          }

          LocalNotifications.registerActionTypes({
            types: [
              {
                id: "DELIVERY_ACTION",
                actions: [
                  { id: "accept", title: "✅ Aceitar" },
                  { id: "reject", title: "❌ Rejeitar", destructive: true }
                ]
              }
            ]
          });
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

    const setup = async () => {
      const { data } = await supabase
        .from("delivery_drivers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!data || cancelled) return;
      const driverId = data.id;

      // Register notification action listener
      if (Capacitor.isNativePlatform()) {
        actionListener = await LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
          if (action.notification.extra?.type === 'delivery') {
            stopAlert();
            if (action.actionId === 'accept') {
              const deliveryId = action.notification.extra.deliveryId;
              const { error } = await supabase
                .from("deliveries")
                .update({ status: "accepted", driver_id: driverId })
                .eq("id", deliveryId)
                .in("status", ["pending", "broadcasted"]);
                
              if (!error) {
                toast({ title: "✅ Corrida aceita!", description: "Você aceitou a corrida via notificação." });
              } else {
                toast({ title: "Erro", description: "Não foi possível aceitar a corrida.", variant: "destructive" });
              }
            } else if (action.actionId === 'reject') {
              const deliveryId = action.notification.extra.deliveryId;
              const notifId = hashId(deliveryId);
              LocalNotifications.cancel({ notifications: [{ id: notifId }] });
            }
          }
        });
      }

      // Track already notified deliveries
      const notifiedDeliveriesRef = { current: new Set<string>() };

      // Fallback Polling (Contorna RLS que bloqueia eventos de INSERT para 'pending')
      const interval = setInterval(async () => {
        if (!user || !driverId || cancelled) return;
        const { data } = await supabase
          .from("available_deliveries")
          .select("id, pickup_address, customer_name, status");
        
        if (data && !cancelled) {
          data.forEach((delivery: any) => {
            if (!notifiedDeliveriesRef.current.has(delivery.id)) {
              notifiedDeliveriesRef.current.add(delivery.id);
              
              // Evitar tocar para corridas velhas ao inicializar
              if (notifiedDeliveriesRef.current.size > data.length) {
                playNotificationSound(true);
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

                if (permissionRef.current === "granted" && Capacitor.isNativePlatform()) {
                  LocalNotifications.schedule({
                    notifications: [
                      {
                        title: "ÉpraJá - Nova corrida!",
                        body: delivery.pickup_address ? `Retirada: ${delivery.pickup_address}` : "Uma nova entrega está disponível",
                        id: hashId(delivery.id),
                        schedule: { at: new Date(Date.now() + 100) },
                        actionTypeId: "DELIVERY_ACTION",
                        extra: { type: 'delivery', deliveryId: delivery.id },
                      },
                    ],
                  });
                }
              }
            }
          });
        }
      }, 10000);

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
                        id: hashId(delivery.id),
                        schedule: { at: new Date(Date.now() + 100) },
                        actionTypeId: "DELIVERY_ACTION",
                        extra: { type: 'delivery', deliveryId: delivery.id },
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
          },
          (payload) => {
            const delivery = payload.new as any;
            const old = payload.old as any;
            
            // If the status changed from pending/broadcasted to something else (e.g., accepted by someone else)
            if ((old.status === "pending" || old.status === "broadcasted") && delivery.status !== "pending" && delivery.status !== "broadcasted") {
              const notifId = hashId(delivery.id);
              if (Capacitor.isNativePlatform()) {
                LocalNotifications.cancel({ notifications: [{ id: notifId }] });
              }
              stopAlert();
            }
            
            // If a delivery was updated TO pending or broadcasted (e.g. dispatched by merchant)
            // Fix: old.status must exist so we don't trigger this incorrectly on assignments
            if (old.status && (old.status !== "pending" && old.status !== "broadcasted") && (delivery.status === "pending" || delivery.status === "broadcasted")) {
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
                        id: hashId(delivery.id),
                        schedule: { at: new Date(Date.now() + 100) },
                        actionTypeId: "DELIVERY_ACTION",
                        extra: { type: 'delivery', deliveryId: delivery.id },
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
      if (actionListener) {
        actionListener.remove();
      }
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      clearInterval(interval);
    };
  }, [user, toast, playNotificationSound, stopAlert, addNotification]);
}
