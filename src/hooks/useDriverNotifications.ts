import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAudioAlert } from "@/hooks/useAudioAlert";
import { safeRpc } from "@/lib/safeRpc";
import { translateDeliveryError } from "@/lib/errorMessages";
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import { App } from "@capacitor/app";
import { DeliveryOverlay } from "@/plugins/DeliveryOverlay";
import { fetchRealStoreName } from "@/hooks/useStoreNameFetcher";

const hashId = (str: string | number) => {
  const s = String(str);
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
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

export const getDeclinedDeliveries = (): Set<string> => {
  try {
    const list = localStorage.getItem("declined_deliveries");
    return list ? new Set(JSON.parse(list)) : new Set();
  } catch {
    return new Set();
  }
};

export const declineDeliveryLocally = (deliveryId: string) => {
  try {
    const declined = getDeclinedDeliveries();
    declined.add(deliveryId);
    localStorage.setItem("declined_deliveries", JSON.stringify(Array.from(declined)));
    window.dispatchEvent(new CustomEvent("delivery-declined", { detail: { deliveryId } }));
  } catch (e) {
    console.error("[Notify] erro ao declinar localmente:", e);
  }
};

export const getAcceptedDeliveries = (): Set<string> => {
  try {
    const list = localStorage.getItem("accepted_deliveries");
    return list ? new Set(JSON.parse(list)) : new Set();
  } catch {
    return new Set();
  }
};

export const acceptDeliveryLocally = (deliveryId: string) => {
  try {
    const accepted = getAcceptedDeliveries();
    accepted.add(deliveryId);
    localStorage.setItem("accepted_deliveries", JSON.stringify(Array.from(accepted)));
    window.dispatchEvent(new CustomEvent("delivery-accepted", { detail: { id: deliveryId } }));
  } catch (e) {
    console.error("[Notify] erro ao aceitar localmente:", e);
  }
};

export function useDriverNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addNotification, updateNotificationStatus } = useNotifications();
  const { playAlert, stopAlert } = useAudioAlert();
  
  const permissionRef = useRef<NotificationPermission>("default");
  const channelsRef = useRef<any[]>([]);
  const intervalRef = useRef<any>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isOnlineRef = useRef<boolean>(false);
  const activeAlertsRef = useRef<Set<string>>(new Set());

  // Permission setup
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.requestPermissions().then((res) => {
        permissionRef.current = res.display === "granted" ? "granted" : "denied";
        if (permissionRef.current === "granted") {
          if (Capacitor.getPlatform() === "android") {
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

            LocalNotifications.listChannels().then((channels) => {
              const hasChannel = channels.channels.some(c => c.id === 'delivery-incoming-v7');
              if (!hasChannel) {
                LocalNotifications.createChannel({
                  id: "delivery-incoming-v7",
                  name: "Novas Corridas É Pra Já",
                  description: "Alerta sonoro de novas corridas disponíveis para entregadores",
                  importance: 5,
                  visibility: 1,
                  sound: "ring.mp3",
                  vibration: true,
                }).catch(() => {});
              }
            });
          }
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

    // Register Push Notifications for Firebase Cloud Messaging
    if (Capacitor.isNativePlatform()) {
      let isRegistered = false;
      let regListener: any = null;
      let errListener: any = null;
      let actListener: any = null;
      
      try {
        PushNotifications.requestPermissions().then((result) => {
          if (result.receive === "granted") {
            PushNotifications.register().catch(e => console.warn("PushNotifications.register erro (safe):", e));
          }
        }).catch(e => console.warn("PushNotifications.requestPermissions erro:", e));

        regListener = PushNotifications.addListener("registration", (token) => {
          console.log("FCM Token recebido:", token.value);
          if (user?.id) {
            supabase
              .from("delivery_drivers")
              .update({ fcm_token: token.value } as any)
              .eq("user_id", user.id)
              .then(({ error }) => {
                if (error) console.error("Erro ao salvar FCM Token:", error);
              });
          }
        });

        errListener = PushNotifications.addListener("registrationError", (error: any) => {
          console.error("Erro no PushNotifications.register:", error);
        });

        actListener = PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
          console.log("Push action performed:", notification);
        });

        PushNotifications.addListener("pushNotificationReceived", async (notification) => {
          console.log("Push received in background:", notification);
          const deliveryId = notification.data?.deliveryId;
          if (deliveryId) {
              let fcmStore = notification.data?.storeName || "";
              let fcmPickup = notification.data?.pickup || "";
              let fcmDropoff = notification.data?.dropoff || "";
              let fcmFee = notification.data?.fee || "";
              let immediateDesc = notification.data?.details || notification.data?.address || "Nova Entrega Disponível!";
              if (immediateDesc.includes("Veja no app")) {
                immediateDesc = immediateDesc.replace(/Veja no app/g, "Retirada na Loja");
              }

              if (Capacitor.isNativePlatform()) {
                DeliveryOverlay.testIncomingCall({
                  details: immediateDesc,
                  deliveryId: deliveryId,
                  storeName: notification.data?.storeName,
                  pickup: notification.data?.pickup,
                  dropoff: notification.data?.dropoff,
                  fee: notification.data?.fee
                }).catch((e: any) => console.warn("Erro ao acordar tela via FCM (imediato):", e));
              }

              try {
                 const { data } = await supabase
                   .from("deliveries")
                   .select("*, companies(name, address, trade_name), orders(delivery_fee)")
                   .eq("id", deliveryId)
                   .single();

                 if (!data || (data.status !== "pending" && data.status !== "broadcasted") || data.driver_id) {
                     console.log("FCM ignorado: Corrida já foi aceita ou cancelada.");
                     if (Capacitor.isNativePlatform()) {
                         DeliveryOverlay.dismissIncomingCall().catch(console.warn);
                     }
                     return;
                 }
                 
                  const d = data as any;
                  const storeName = await fetchRealStoreName(d);
                  const immediatePickup = d.pickup_address || d.origin_address || d.store_address || d.companies?.address || storeName || "Local de Coleta";
                  const immediateDropoff = d.delivery_address || d.dropoff_address || d.address || "Endereço do cliente";
                  
                  const orderFee = d.orders?.delivery_fee ? Number(d.orders.delivery_fee) : 0;
                  const immediateValue = orderFee > 0 ? orderFee : Math.max(Number(d.delivery_fee) || 0, Number(d.value) || 0, Number(d.price) || 0, Number(d.total_value) || 0);
                 
                  fcmStore = storeName;
                  fcmPickup = immediatePickup;
                  fcmDropoff = immediateDropoff;
                  fcmFee = `R$ ${Number(immediateValue).toFixed(2).replace(".", ",")}`;
                  immediateDesc = `${storeName}\nColeta: ${immediatePickup}\nEntrega: ${immediateDropoff}\nGanhos: ${fcmFee}`;
              } catch (e) {
                 console.warn("Erro validando FCM status:", e);
              }

              if (Capacitor.isNativePlatform()) {
                DeliveryOverlay.updateIncomingCall({
                  details: immediateDesc,
                  deliveryId: deliveryId,
                  storeName: fcmStore,
                  pickup: fcmPickup,
                  dropoff: fcmDropoff,
                  fee: fcmFee
                }).catch((e: any) => console.warn("Erro ao atualizar tela via FCM:", e));
              }
          }
        });
      } catch (e) {
        console.warn("FCM Indisponível no dispositivo:", e);
      }

      return () => {
        if (regListener) regListener.then((l: any) => l.remove()).catch(() => {});
        if (errListener) errListener.then((l: any) => l.remove()).catch(() => {});
        if (actListener) actListener.then((l: any) => l.remove()).catch(() => {});
      };
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    let actionListener: PluginListenerHandle | null = null;
    let overlayListener: PluginListenerHandle | null = null;

    const handleDeclineEvent = (e: any) => {
      const { deliveryId } = e.detail || {};
      if (deliveryId) {
        activeAlertsRef.current.delete(deliveryId);
        if (activeAlertsRef.current.size === 0) {
          stopAlert();
        }
        if (Capacitor.isNativePlatform()) {
          LocalNotifications.cancel({ notifications: [{ id: hashId(deliveryId) }] }).catch(() => {});
        }
      }
    };
    window.addEventListener("delivery-declined", handleDeclineEvent);

    const notifyNewDelivery = async (rawDelivery: any) => {
      if (!rawDelivery?.id) return;
      if (!isOnlineRef.current) return;
      
      const declined = getDeclinedDeliveries();
      if (declined.has(rawDelivery.id)) return;

      if (seenIdsRef.current.has(rawDelivery.id)) return;
      seenIdsRef.current.add(rawDelivery.id);
      activeAlertsRef.current.add(rawDelivery.id);

      const storeName = await fetchRealStoreName(rawDelivery);
      const pickup = rawDelivery.pickup_address || rawDelivery.origin_address || rawDelivery.store_address || rawDelivery.companies?.address || storeName || "Retirada na Loja";
      const dropoff = rawDelivery.delivery_address || rawDelivery.dropoff_address || rawDelivery.address || "Endereço do cliente";
      const fee = Number(rawDelivery.delivery_fee || rawDelivery.value || rawDelivery.price || rawDelivery.total_value || 0);

      const immediateDesc = `${storeName}\nColeta: ${pickup}\nEntrega: ${dropoff}${fee > 0 ? `\nGanhos: R$ ${fee.toFixed(2).replace('.', ',')}` : ''}`;
      if (Capacitor.isNativePlatform()) {
        DeliveryOverlay.testIncomingCall({
          details: immediateDesc,
          deliveryId: rawDelivery.id,
          storeName,
          pickup,
          dropoff,
          fee: fee > 0 ? `R$ ${fee.toFixed(2).replace('.', ',')}` : ""
        }).catch((e: any) => console.warn("Erro ao acordar tela (imediato):", e));
      }

      const { data: fullDelivery } = await supabase
        .from("deliveries")
        .select("*, companies(name, address, trade_name), orders(delivery_fee)")
        .eq("id", rawDelivery.id)
        .single();
         
      const delivery = fullDelivery || rawDelivery;
      
      const fullStoreName = await fetchRealStoreName(delivery);
      const fullPickup = delivery.pickup_address || delivery.origin_address || delivery.store_address || delivery.companies?.address || fullStoreName || "Retirada na Loja";
      const fullDropoff = delivery.delivery_address || delivery.dropoff_address || delivery.address || "Endereço do cliente";
      
      const orderFee = delivery.orders?.delivery_fee ? Number(delivery.orders.delivery_fee) : 0;
      const value = orderFee > 0 ? orderFee : Math.max(Number(delivery.delivery_fee) || 0, Number(delivery.value) || 0, Number(delivery.price) || 0, Number(delivery.total_value) || 0, fee);

      const displayStore = (fullStoreName && fullStoreName !== "Loja Parceira") ? fullStoreName : "É Pra Já Delivery";
      const title = `🏬 ${displayStore}`;
      const description = `${displayStore}\nColeta: ${fullPickup}\nEntrega: ${fullDropoff}\nGanhos: R$ ${Number(value).toFixed(2).replace(".", ",")}`;
      
      if (Capacitor.isNativePlatform()) {
        DeliveryOverlay.updateIncomingCall({
          details: description,
          deliveryId: delivery.id,
          storeName: fullStoreName,
          pickup: fullPickup,
          dropoff: fullDropoff,
          fee: `R$ ${Number(value).toFixed(2).replace(".", ",")}`
        }).catch((e: any) => console.warn("Erro ao atualizar tela:", e));
      }

      try {
        playAlert(true);
      } catch (e) {
        console.warn("[Notify] som falhou:", e);
      }

      // 2) Toast
      try {
        toast({ title, description });
      } catch {}

      // 3) Central de notificações
      try {
        addNotification({
          type: "delivery",
          title: "Nova corrida disponível",
          description,
          deliveryId: delivery.id,
          deliveryStatus: "pending",
        });
      } catch (e) {
        console.warn("[Notify] central falhou:", e);
      }

      // 4) OS notification
      if (Capacitor.isNativePlatform()) {
        if (permissionRef.current === "granted") {
          LocalNotifications.schedule({
            notifications: [
              {
                title: title,
                body: `🏁 Entrega: ${fullDropoff}`,
                id: hashId(delivery.id),
                actionTypeId: "DELIVERY_ACTION",
                channelId: "delivery-incoming-v8",
                extra: { type: "delivery", deliveryId: delivery.id },
              },
            ],
          }).catch(() => {});
        }
      } else if (permissionRef.current === "granted") {
        try {
          new Notification(title, {
            body: description,
            icon: "/logo.png",
            tag: `delivery-${delivery.id}`,
          });
        } catch {}
      }
    };

    const stopRingingFor = (deliveryId: string) => {
      activeAlertsRef.current.delete(deliveryId);
      if (activeAlertsRef.current.size === 0) {
        stopAlert();
      }
      if (Capacitor.isNativePlatform()) {
        LocalNotifications.cancel({ notifications: [{ id: hashId(deliveryId) }] }).catch(() => {});
      }
      updateNotificationStatus(deliveryId, "expired");
    };

    const setup = async () => {
      // 1. Initial fetch of driver status
      const { data: driverRow } = await supabase
        .from("delivery_drivers")
        .select("id, is_online")
        .eq("user_id", user.id)
        .single();

      if (!driverRow || cancelled) return;
      const driverId = driverRow.id;
      isOnlineRef.current = driverRow.is_online ?? false;

      // Persiste driver_id + token no SharedPreferences nativo para que o aceite
      // funcione via HTTP mesmo quando o JS está morto (tela bloqueada, app killed)
      if (Capacitor.isNativePlatform()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const userToken = session?.access_token ?? "";
          DeliveryOverlay.saveDriverContext({ driverId, userToken }).catch(() => {});
        } catch (e) {
          console.warn("[Notify] saveDriverContext falhou:", e);
        }
      }

      // 2. Realtime listener to driver status changes (online/offline toggle)
      const driverChannel = supabase
        .channel(`driver-profile-${user.id}-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "delivery_drivers",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updated = payload.new as any;
            const wasOnline = isOnlineRef.current;
            isOnlineRef.current = updated.is_online ?? false;
            if (!isOnlineRef.current && wasOnline) {
              // Silenced when going offline
              activeAlertsRef.current.clear();
              stopAlert();
            }
          }
        )
        .subscribe();
      channelsRef.current.push(driverChannel);

      // 3. Native action listener
      if (Capacitor.isNativePlatform()) {
        actionListener = await LocalNotifications.addListener(
          "localNotificationActionPerformed",
          async (action) => {
            if (action.notification.extra?.type === "delivery") {
              const deliveryId = action.notification.extra.deliveryId;
              
              if (action.actionId === "accept") {
                stopAlert();
                activeAlertsRef.current.delete(deliveryId);
                
                // Attempt safe RPC first
                try {
                  const { data, error } = await safeRpc("update_delivery_status_safe", {
                    p_delivery_id: deliveryId,
                    p_status: "accepted",
                    p_driver_id: driverId,
                  });
                  if (!error && data) {
                    if ((data as any).success) {
                      window.dispatchEvent(new CustomEvent("delivery-accepted", { detail: { id: deliveryId } }));
                      acceptDeliveryLocally(deliveryId);
                      toast({ title: "✅ Corrida aceita!", description: "Aceita via notificação." });
                      updateNotificationStatus(deliveryId, "accepted");
                      return;
                    } else {
                      toast({ title: "Ops! Já foi aceita.", description: (data as any).message || "Outro entregador aceitou antes de você.", variant: "destructive" });
                      window.dispatchEvent(new CustomEvent("delivery-rejected", { detail: { id: deliveryId } }));
                      declineDeliveryLocally(deliveryId);
                      updateNotificationStatus(deliveryId, "rejected");
                      return;
                    }
                  }
                } catch {}

                // REST fallback
                const { error, data } = await supabase
                  .from("deliveries")
                  .update({ status: "accepted", driver_id: driverId })
                  .eq("id", deliveryId)
                  .in("status", ["pending", "broadcasted"])
                  .is("driver_id", null)
                  .select("id");
                
                if (error) {
                  const { title, description } = translateDeliveryError(error, "accept");
                  toast({ title, description, variant: "destructive" });
                } else if (!data || data.length === 0) {
                  toast({ title: "Ops! Já foi aceita.", description: "Outro entregador aceitou antes de você.", variant: "destructive" });
                  window.dispatchEvent(new CustomEvent("delivery-rejected", { detail: { id: deliveryId } }));
                  declineDeliveryLocally(deliveryId);
                  updateNotificationStatus(deliveryId, "rejected");
                } else {
                  window.dispatchEvent(new CustomEvent("delivery-accepted", { detail: { id: deliveryId } }));
                  acceptDeliveryLocally(deliveryId);
                  toast({ title: "✅ Corrida aceita!", description: "Aceita via notificação." });
                  updateNotificationStatus(deliveryId, "accepted");
                }
              } else if (action.actionId === "reject") {
                window.dispatchEvent(new CustomEvent("delivery-rejected", { detail: { id: deliveryId } }));
                declineDeliveryLocally(deliveryId);
                updateNotificationStatus(deliveryId, "rejected");
              }
            }
          }
        );

        // Listener para os botões do Popup Nativo (Tela Bloqueada)
        overlayListener = await DeliveryOverlay.addListener(
          "onCallResponse",
          async (response: any) => {
            const deliveryId = response.deliveryId;
            
            if (response.status === "accepted") {
              stopAlert();
              activeAlertsRef.current.delete(deliveryId);
              
              // NÃO fazemos aceitação eager local antes de saber se a API retornou sucesso ou erro.
              
              // Executa a requisição no background de forma não bloqueante (Fire and Forget)
              safeRpc("update_delivery_status_safe", {
                p_delivery_id: deliveryId,
                p_status: "accepted",
                p_driver_id: driverId,
              }).then(({ data, error }) => {
                if (error || !data || !(data as any).success) {
                  // Se falhar de verdade (e.g. corrida roubada ou erro de rede)
                  console.warn("safeRpc accept falhou no lock screen:", error || data);
                  const msg = (data as any)?.message || "Corrida já foi aceita por outro entregador";
                  DeliveryOverlay.reportCallResult({ success: false, message: msg }).catch(() => {});
                  toast({ title: "❌ Erro", description: msg });
                  window.dispatchEvent(new CustomEvent("delivery-rejected", { detail: { id: deliveryId } }));
                  declineDeliveryLocally(deliveryId);
                  updateNotificationStatus(deliveryId, "rejected");
                } else {
                  // EAGER LOCAL ACCEPT movido para ca no sucesso
                  DeliveryOverlay.reportCallResult({ success: true, message: "✅ Corrida aceita!" }).catch(() => {});
                  window.dispatchEvent(new CustomEvent("delivery-accepted", { detail: { id: deliveryId } }));
                  acceptDeliveryLocally(deliveryId);
                  updateNotificationStatus(deliveryId, "accepted");
                  toast({ title: "✅ Corrida aceita!", description: "Aceita via popup nativo." });
                }
              }).catch(e => {
                 console.warn("Exception no safeRpc lock screen:", e);
                 DeliveryOverlay.reportCallResult({ success: false, message: "Não foi possível confirmar o aceite" }).catch(() => {});
                 window.dispatchEvent(new CustomEvent("delivery-rejected", { detail: { id: deliveryId } }));
                 declineDeliveryLocally(deliveryId);
                 updateNotificationStatus(deliveryId, "rejected");
              });
              
            } else if (response.status === "rejected") {
              window.dispatchEvent(new CustomEvent("delivery-rejected", { detail: { id: deliveryId } }));
              declineDeliveryLocally(deliveryId);
              updateNotificationStatus(deliveryId, "rejected");
              stopAlert();
              activeAlertsRef.current.delete(deliveryId);
            }
          }
        );
      }

      // Initial seed: mark all currently-available deliveries as "seen"
      // older than 60s so we don't spam on app open, but very recent ones still ring.
      if (isOnlineRef.current) {
        try {
          const { data: initial } = await supabase
            .from("available_deliveries")
            .select("*");

          if (initial && !cancelled) {
            const cutoff = Date.now() - 60_000;
            initial.forEach((d: any) => {
              const ts = d.created_at ? new Date(d.created_at).getTime() : 0;
              if (ts < cutoff) {
                seenIdsRef.current.add(d.id);
              } else {
                notifyNewDelivery(d);
              }
            });
          }
        } catch (e) {
          console.warn("[Notify] seed inicial falhou:", e);
        }
      }

      const pollDeliveries = async () => {
        if (cancelled) return;
        
        if (!isOnlineRef.current) {
          if (activeAlertsRef.current.size > 0) {
            activeAlertsRef.current.clear();
            stopAlert();
          }
          return;
        }

        try {
          const { data } = await supabase
            .from("available_deliveries")
            .select("*");
          
          if (data && !cancelled) {
            const freshIds = new Set(data.map((d: any) => d.id));
            
            // Notify new runs
            data.forEach((d: any) => notifyNewDelivery(d));

            // Stop ringing for runs that are no longer available (accepted by others)
            Array.from(activeAlertsRef.current).forEach((id) => {
              if (!freshIds.has(id)) {
                stopRingingFor(id);
              }
            });
          }
        } catch (e) {
          console.warn("[Notify] polling falhou:", e);
        }
      };

      intervalRef.current = setInterval(pollDeliveries, 8000);

      // Listener de retorno ao app para forçar fetch imediato caso o WebSocket tenha morrido no background
      const appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive && isOnlineRef.current) {
          pollDeliveries();
        }
      });


      // Realtime — INSERT
      const broadcastChannel = supabase
        .channel(`driver-broadcast-${driverId}-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "deliveries" },
          (payload) => {
            const d = payload.new as any;
            if (isOnlineRef.current && (d?.status === "pending" || d?.status === "broadcasted")) {
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

            // Disappeared from broadcast pool
            if (
              (o?.status === "pending" || o?.status === "broadcasted") &&
              d?.status !== "pending" &&
              d?.status !== "broadcasted"
            ) {
              stopRingingFor(d.id);
            }

            // Newly broadcasted
            if (
              o?.status &&
              o.status !== "pending" &&
              o.status !== "broadcasted" &&
              (d?.status === "pending" || d?.status === "broadcasted")
            ) {
              if (isOnlineRef.current) {
                seenIdsRef.current.delete(d.id);
                notifyNewDelivery(d);
              }
            }

            // Confirmation for own delivery
            if (d?.driver_id === driverId && o?.status !== d?.status && d?.status === "accepted") {
              toast({
                title: "✅ Corrida confirmada!",
                description: "A entrega foi confirmada. Vá até o ponto de retirada.",
              });
              activeAlertsRef.current.delete(d.id);
              if (activeAlertsRef.current.size === 0) {
                stopAlert();
              }
              updateNotificationStatus(d.id, "accepted");
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
          .channel(`notifications-chat-${conv.id}-${Date.now()}`)
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
                try {
                  playAlert(false);
                } catch {}
                toast({ title: "💬 Nova mensagem", description: msg.content });
                addNotification({
                  type: "chat",
                  title: "Nova mensagem no chat",
                  description: msg.content,
                });

                if (permissionRef.current === "granted") {
                  if (Capacitor.isNativePlatform()) {
                    LocalNotifications.schedule({
                      notifications: [
                        {
                          title: "💬 Nova mensagem",
                          body: msg.content,
                          id: new Date().getTime() + 1,
                          actionTypeId: "",
                          extra: null,
                        },
                      ],
                    }).catch(() => {});
                  } else {
                    try {
                      new Notification("💬 Nova mensagem", {
                        body: msg.content,
                        icon: "/logo.png",
                      });
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
      stopAlert();
      window.removeEventListener("delivery-declined", handleDeclineEvent);
      if (actionListener) actionListener.remove();
      if (overlayListener) overlayListener.remove();
      App.removeAllListeners();
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, toast, playAlert, stopAlert, addNotification, updateNotificationStatus]);
}


