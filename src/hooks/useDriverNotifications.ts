import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAudioAlert } from "@/hooks/useAudioAlert";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
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

const announcedDeliveryIds = new Set<string>();

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
  const { playAlert, startLoop, stopAlert } = useAudioAlert();
  const addNotificationRef = useRef(addNotification);
  addNotificationRef.current = addNotification;
  const permissionRef = useRef<NotificationPermission>("default");
  const channelsRef = useRef<any[]>([]);
  const intervalRef = useRef<any>(null);
  const seenIdsRef = useRef<Set<string>>(announcedDeliveryIds);
  const isOnlineRef = useRef<boolean>(false);
  const activeAlertsRef = useRef<Set<string>>(new Set());

  // Permission setup
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.requestPermissions().then((res) => {
        permissionRef.current = res.display === "granted" ? "granted" : "denied";
        if (permissionRef.current === "granted") {
          // O canal de corridas (delivery-incoming-v10) é criado e validado
          // exclusivamente pelo código nativo (NotificationChannels.java) para
          // evitar configurações conflitantes congeladas pelo Android.
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
      let regListener: any = null;
      let errListener: any = null;
      let actListener: any = null;
      let receivedListener: any = null;
      let refreshListener: PluginListenerHandle | null = null;
      
      try {
        const syncFcmToken = async (tokenVal: string) => {
          if (!tokenVal) return;
          console.log("[FCM] Sincronizando token:", tokenVal.slice(0, 15) + "...");
          localStorage.setItem("driver_fcm_token", tokenVal);

          if (user?.id) {
            const { error } = await supabase
              .from("delivery_drivers")
              .update({ fcm_token: tokenVal } as any)
              .eq("user_id", user.id);
            if (error) console.error("[FCM] Erro ao salvar token em delivery_drivers (user_id):", error.message);
          }

        };

        // Escuta novas identificações do FCM
        regListener = PushNotifications.addListener("registration", (token) => {
          console.log("FCM Token recebido:", token.value);
          syncFcmToken(token.value);
        });

        DeliveryOverlay.getPendingFcmToken().then(({ token }) => {
          if (token) syncFcmToken(token);
        }).catch(() => {});
        const refreshPromise = DeliveryOverlay.addListener("onFcmTokenRefresh", ({ token }) => {
          if (token) syncFcmToken(token);
        });
        Promise.resolve(refreshPromise).then((listener) => {
          refreshListener = listener;
        }).catch(() => {});

        // Tenta sincronizar token já existente em cache quando o usuário carrega
        const cachedToken = localStorage.getItem("driver_fcm_token");
        if (cachedToken && user?.id) {
          syncFcmToken(cachedToken);
        }

        // Solicita permissões e registra no PushNotifications
        PushNotifications.requestPermissions().then((result) => {
          if (result.receive === "granted") {
            PushNotifications.register().catch(e => console.warn("PushNotifications.register erro (safe):", e));
          }
        }).catch(e => console.warn("PushNotifications.requestPermissions erro:", e));

        errListener = PushNotifications.addListener("registrationError", (error: any) => {
          console.error("Erro no PushNotifications.register:", error);
        });

        actListener = PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          console.log("[FCM_NATIVE_CLICK] Push action performed:", action);
          const data = action.notification?.data;
          const deliveryId = data?.deliveryId || data?.delivery_id;
          const targetRoute = data?.route || (deliveryId ? `/driver?deliveryId=${deliveryId}` : "/driver");
          if (targetRoute && typeof window !== "undefined") {
            console.log("[FCM_NATIVE_CLICK] Navegando para a rota da entrega:", targetRoute);
            window.location.href = targetRoute;
          }
        });

        receivedListener = PushNotifications.addListener("pushNotificationReceived", async (notification) => {
          console.log("[FCM_NATIVE_RECEIVED] Push received:", notification);
          const deliveryId = notification.data?.deliveryId;
          if (deliveryId) {
              // Dedup: FCM + realtime + polling podem chegar juntos; só o primeiro anuncia.
              if (!isOnlineRef.current) return;
              if (seenIdsRef.current.has(deliveryId) || getDeclinedDeliveries().has(deliveryId)) {
                  console.log("[FCM_NATIVE_RECEIVED] duplicado/recusado ignorado:", deliveryId);
                  return;
              }
              seenIdsRef.current.add(deliveryId);
              activeAlertsRef.current.add(deliveryId);
              try {
                 const { data } = await supabase
                   .from("deliveries")
                   .select("*, companies(name, address), orders(delivery_fee)")
                   .eq("id", deliveryId)
                   .single();

                 if (!data || (data.status !== "pending" && data.status !== "broadcasted") || data.driver_id) {
                     console.log("FCM ignorado: Corrida já foi aceita ou cancelada.");
                     return;
                 }
                 
                  const d = data as any;
                  const storeName = await fetchRealStoreName(d);
                  const immediatePickup = d.pickup_address || d.origin_address || d.store_address || d.companies?.address || storeName || "Local de Coleta";
                  const immediateDropoff = d.delivery_address || d.dropoff_address || d.address || "Endereço do cliente";
                  
                  const orderFee = d.orders?.delivery_fee ? Number(d.orders.delivery_fee) : 0;
                  const immediateValue = orderFee > 0 ? orderFee : Math.max(Number(d.delivery_fee) || 0, Number(d.value) || 0, Number(d.price) || 0, Number(d.total_value) || 0);
                 
                   const fcmFee = `R$ ${Number(immediateValue).toFixed(2).replace(".", ",")}`;
                   addNotificationRef.current({
                     type: "delivery",
                     title: "Nova corrida disponível",
                     description: `${storeName}\nColeta: ${immediatePickup}\nEntrega: ${immediateDropoff}\nGanhos: ${fcmFee}`,
                     deliveryId,
                     deliveryStatus: "pending",
                   });
              } catch (e) {
                 console.warn("Erro validando FCM status:", e);
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
        if (receivedListener) receivedListener.then((l: any) => l.remove()).catch(() => {});
        if (refreshListener) refreshListener.remove();
      };
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    let appStateListener: PluginListenerHandle | null = null;

    const handleDeclineEvent = (e: any) => {
      const deliveryId = e.detail?.deliveryId || e.detail?.id;
      if (deliveryId) {
        activeAlertsRef.current.delete(deliveryId);
        if (activeAlertsRef.current.size === 0) {
          stopAlert();
        }
        if (Capacitor.isNativePlatform()) {
          LocalNotifications.cancel({ notifications: [{ id: hashId(deliveryId) }] }).catch(() => {});
          // Remove também a notificação nativa postada pelo FCM na bandeja e no overlay flutuante.
          DeliveryOverlay.cancelDeliveryNotification({ deliveryId }).catch(() => {});
          DeliveryOverlay.hideDeliveryCard({ deliveryId }).catch(() => {});
        }
      }
    };
    window.addEventListener("delivery-declined", handleDeclineEvent);
    window.addEventListener("delivery-accepted", handleDeclineEvent);
    window.addEventListener("delivery-rejected", handleDeclineEvent);

    let nativeDeclineListener: any = null;
    let nativeAcceptListener: any = null;
    if (Capacitor.isNativePlatform()) {
      nativeDeclineListener = DeliveryOverlay.addListener("onDeliveryDeclined", ({ deliveryId }: { deliveryId: string }) => {
        if (deliveryId) {
          declineDeliveryLocally(deliveryId);
          handleDeclineEvent({ detail: { deliveryId } });
        }
      });
      nativeAcceptListener = DeliveryOverlay.addListener("onDeliveryAccepted", ({ deliveryId }: { deliveryId: string }) => {
        if (deliveryId) {
          acceptDeliveryLocally(deliveryId);
          handleDeclineEvent({ detail: { deliveryId } });
        }
      });
    }

    const notifyNewDelivery = async (rawDelivery: any) => {
      if (!rawDelivery?.id) return;
      if (!isOnlineRef.current) return;

      const declined = getDeclinedDeliveries();
      if (declined.has(rawDelivery.id)) return;

      const accepted = getAcceptedDeliveries();
      if (accepted.has(rawDelivery.id)) return;

      if (rawDelivery.driver_id && rawDelivery.driver_id !== null) return;
      if (rawDelivery.status && rawDelivery.status !== "pending" && rawDelivery.status !== "broadcasted") return;

      if (seenIdsRef.current.has(rawDelivery.id)) return;
      seenIdsRef.current.add(rawDelivery.id);
      activeAlertsRef.current.add(rawDelivery.id);

      // Dispara áudio contínuo apenas no navegador web (no app Android, o som é tocado exclusivamente pela notificação nativa da central)
      if (!Capacitor.isNativePlatform()) {
        try {
          startLoop();
        } catch (e) {
          console.warn("[Notify] som falhou:", e);
        }
      }

      let storeName = "É Pra Já Delivery";
      let pickup = "Retirada na Loja";
      let dropoff = "Endereço do cliente";
      let fee = 0;

      try {
        storeName = (await fetchRealStoreName(rawDelivery)) || storeName;
      } catch (e) {
        console.warn("[Notify] nome da loja falhou:", e);
      }
      pickup = rawDelivery.pickup_address || rawDelivery.origin_address || rawDelivery.store_address || rawDelivery.companies?.address || storeName || pickup;
      dropoff = rawDelivery.delivery_address || rawDelivery.dropoff_address || rawDelivery.address || dropoff;
      fee = Number(rawDelivery.delivery_fee || rawDelivery.value || rawDelivery.price || rawDelivery.total_value || 0);

      let delivery: any = rawDelivery;
      try {
        const { data: fullDelivery } = await supabase
          .from("available_deliveries")
          .select("*, companies(name, address)")
          .eq("id", rawDelivery.id)
          .maybeSingle();
        if (fullDelivery) delivery = fullDelivery;
      } catch (e) {
        console.warn("[Notify] detalhe da corrida falhou, usando payload bruto:", e);
      }

      let fullStoreName = storeName;
      try {
        fullStoreName = (await fetchRealStoreName(delivery)) || storeName;
      } catch {}
      const fullPickup = delivery.pickup_address || delivery.origin_address || delivery.store_address || delivery.companies?.address || fullStoreName || "Retirada na Loja";
      const fullDropoff = delivery.delivery_address || delivery.dropoff_address || delivery.address || "Endereço do cliente";

      const orderFee = delivery.orders?.delivery_fee ? Number(delivery.orders.delivery_fee) : 0;
      const value = orderFee > 0 ? orderFee : Math.max(Number(delivery.delivery_fee) || 0, Number(delivery.value) || 0, Number(delivery.price) || 0, Number(delivery.total_value) || 0, fee);

      const displayStore = fullStoreName || "É Pra Já Delivery";
      const title = `🏬 ${displayStore}`;
      const description = `${displayStore}\nColeta: ${fullPickup}\nEntrega: ${fullDropoff}\nGanhos: R$ ${Number(value).toFixed(2).replace(".", ",")}`;

      // 2) Toast desativado para não poluir a tela do entregador
      // 3) Central de notificações do app
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

      // 4) Notificação flutuante sobre outros apps (Overlay)
      if (Capacitor.isNativePlatform()) {
        try {
          DeliveryOverlay.showDeliveryCard({
            deliveryId: delivery.id,
            storeName: displayStore,
            pickup: fullPickup,
            dropoff: fullDropoff,
            fee: `R$ ${Number(value).toFixed(2).replace(".", ",")}`,
          }).catch(() => {});
        } catch {}
      }

      // 5) A notificação web
      if (!Capacitor.isNativePlatform() && permissionRef.current === "granted") {
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
        DeliveryOverlay.hideDeliveryCard({ deliveryId }).catch(() => {});
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
      // Sincroniza o estado online com o nativo (suprime alertas FCM offline)
      if (Capacitor.isNativePlatform()) {
        DeliveryOverlay.setDriverOnlineStatus({ isOnline: isOnlineRef.current }).catch(() => {});
      }

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
            if (Capacitor.isNativePlatform()) {
              DeliveryOverlay.setDriverOnlineStatus({ isOnline: isOnlineRef.current }).catch(() => {});
            }
            if (!isOnlineRef.current && wasOnline) {
              // Silenced when going offline
              activeAlertsRef.current.clear();
              stopAlert();
            }
          }
        )
        .subscribe();
      channelsRef.current.push(driverChannel);

      // Initial seed: marca corridas já existentes sem repetir alertas ao entrar/trocar de tela.
      if (isOnlineRef.current) {
        try {
          const { data: initial } = await supabase
            .from("available_deliveries")
            .select("*");

          if (initial && !cancelled) {
            initial.forEach((d: any) => seenIdsRef.current.add(d.id));
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
            // Auto-healing: para alertas de corridas que saíram do pool
            // (aceitas por outro entregador, canceladas), mesmo que o evento
            // realtime tenha se perdido.
            const availableIds = new Set(data.map((d: any) => d.id));
            Array.from(activeAlertsRef.current).forEach((id) => {
              if (!availableIds.has(id)) stopRingingFor(id);
            });
            // Notify new runs
            data.forEach((d: any) => notifyNewDelivery(d));
          }
        } catch (e) {
          console.warn("[Notify] polling falhou:", e);
        }
      };

      intervalRef.current = setInterval(pollDeliveries, 8000);

      // Listener de retorno ao app para forçar fetch imediato caso o WebSocket tenha morrido no background
      appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
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
              // Evita toast duplo quando o próprio entregador acabou de aceitar
              // (a Home já exibe "Corrida aceita!" no onSuccess da mutation).
              if (!getAcceptedDeliveries().has(d.id)) {
                toast({
                  title: "✅ Corrida confirmada!",
                  description: "A entrega foi confirmada. Vá até o ponto de retirada.",
                });
              }
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
                  playAlert();
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
      window.removeEventListener("delivery-accepted", handleDeclineEvent);
      window.removeEventListener("delivery-rejected", handleDeclineEvent);
      if (nativeDeclineListener) nativeDeclineListener.remove();
      if (nativeAcceptListener) nativeAcceptListener.remove();
      if (appStateListener) appStateListener.remove();
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user?.id]);
}


