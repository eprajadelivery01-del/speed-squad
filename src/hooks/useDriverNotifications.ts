import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
import { safeRpc } from "@/lib/safeRpc";

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

export const safeRemoveListener = (listener: any) => {
  if (!listener) return;
  try {
    if (typeof listener.then === "function") {
      listener.then((l: any) => {
        try {
          if (l && typeof l.remove === "function") {
            const res = l.remove();
            if (res && typeof res.catch === "function") res.catch(() => {});
          }
        } catch { }
      }).catch(() => { });
    } else if (typeof listener.remove === "function") {
      const res = listener.remove();
      if (res && typeof res.catch === "function") res.catch(() => {});
    }
  } catch { }
};

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const driverIdRef = useRef<string | null>(null);

  const acceptDeliveryGlobal = async (deliveryId: string) => {
    if (!deliveryId) return;
    console.log("[GlobalAccept] Aceitando corrida globalmente:", deliveryId);

    // 1. Imediatamente para som e cancela alertas/cards locais e nativos (0ms)
    stopAlert();
    activeAlertsRef.current.clear();
    seenIdsRef.current.add(deliveryId);
    acceptDeliveryLocally(deliveryId);

    if (Capacitor.isNativePlatform()) {
      try {
        LocalNotifications.cancel({ notifications: [{ id: hashId(deliveryId) }] }).catch(() => { });
        DeliveryOverlay.cancelDeliveryNotification({ deliveryId }).catch(() => { });
        DeliveryOverlay.hideDeliveryCard({ deliveryId }).catch(() => { });
        DeliveryOverlay.stopNativeAudio().catch(() => { });
      } catch { }
    }

    // 2. Garante que temos o driverId
    let driverIdToUse = driverIdRef.current || localStorage.getItem("driver_id");
    if (!driverIdToUse && user?.id) {
      try {
        const { data } = await supabase
          .from("delivery_drivers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data?.id) {
          driverIdToUse = data.id;
          driverIdRef.current = data.id;
          localStorage.setItem("driver_id", data.id);
        }
      } catch { }
    }

    // 3. Atualiza no Supabase imediatamente para 'accepted'
    if (driverIdToUse) {
      try {
        const { data, error } = await safeRpc("update_delivery_status_safe", {
          p_delivery_id: deliveryId,
          p_status: "accepted",
          p_driver_id: driverIdToUse,
        });

        if (error || (data as any)?.success === false) {
          console.warn("[GlobalAccept] safeRpc retornou erro/falha, aplicando fallback direto:", error || data);
          await supabase
            .from("deliveries")
            .update({ status: "accepted", driver_id: driverIdToUse, updated_at: new Date().toISOString() })
            .eq("id", deliveryId);
        }
      } catch (e) {
        console.warn("[GlobalAccept] Falha no safeRpc:", e);
        try {
          await supabase
            .from("deliveries")
            .update({ status: "accepted", driver_id: driverIdToUse, updated_at: new Date().toISOString() })
            .eq("id", deliveryId);
        } catch { }
      }
    }

    // 4. Invalida as queries do React Query para a aba de entregas atualizar instantaneamente
    queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    queryClient.refetchQueries({ queryKey: ["deliveries"] });
    window.dispatchEvent(new CustomEvent("delivery-accepted", { detail: { id: deliveryId, deliveryId } }));

    // 5. Navega para a aba de entregas em andamento
    try {
      if (typeof window !== "undefined" && !window.location.pathname.includes("/driver/deliveries")) {
        navigate("/driver/deliveries");
      }
    } catch { }
  };

  const acceptDeliveryGlobalRef = useRef(acceptDeliveryGlobal);
  acceptDeliveryGlobalRef.current = acceptDeliveryGlobal;

  // Trata deep links e parâmetros de URL com ação de aceite imediato
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get("action");
        const deliveryId = urlParams.get("deliveryId");
        if (action === "accept" && deliveryId) {
          console.log("[DeepLinkAccept] Executando aceite via URL:", deliveryId);
          acceptDeliveryGlobalRef.current(deliveryId);
        }
      }
    } catch { }
  }, []);

  // Permission setup
  useEffect(() => {
    let cancelled = false;

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

          const cachedDriverId = localStorage.getItem("driver_id");
          if (cachedDriverId) {
            await supabase
              .from("delivery_drivers")
              .update({ fcm_token: tokenVal } as any)
              .eq("id", cachedDriverId);
          }

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
        }).catch(() => { });
        const refreshPromise = DeliveryOverlay.addListener("onFcmTokenRefresh", ({ token }) => {
          if (token) syncFcmToken(token);
        });
        Promise.resolve(refreshPromise).then((listener) => {
          refreshListener = listener;
        }).catch(() => { });

        // Tenta sincronizar token já existente em cache quando o usuário carrega
        const cachedToken = localStorage.getItem("driver_fcm_token");
        if (cachedToken) {
          syncFcmToken(cachedToken);
        }

        // Solicita permissões e registra no PushNotifications
        PushNotifications.requestPermissions().then((result) => {
          if (result.receive === "granted" || (result as any).display === "granted") {
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
            if (seenIdsRef.current.has(deliveryId) || getDeclinedDeliveries().has(deliveryId) || getAcceptedDeliveries().has(deliveryId)) {
              console.log("[FCM_NATIVE_RECEIVED] duplicado/recusado/aceito ignorado:", deliveryId);
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
        safeRemoveListener(regListener);
        safeRemoveListener(errListener);
        safeRemoveListener(actListener);
        safeRemoveListener(receivedListener);
        safeRemoveListener(refreshListener);
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
          LocalNotifications.cancel({ notifications: [{ id: hashId(deliveryId) }] }).catch(() => { });
          // Remove também a notificação nativa postada pelo FCM na bandeja e no overlay flutuante.
          DeliveryOverlay.cancelDeliveryNotification({ deliveryId }).catch(() => { });
          DeliveryOverlay.hideDeliveryCard({ deliveryId }).catch(() => { });
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
          acceptDeliveryGlobalRef.current(deliveryId);
        }
      });
      const nativeCallResponseListener = DeliveryOverlay.addListener("onCallResponse", ({ status, deliveryId }: { status: string; deliveryId?: string }) => {
        if (!deliveryId) return;
        if (status === "accepted") {
          acceptDeliveryGlobalRef.current(deliveryId);
        } else if (status === "rejected" || status === "declined") {
          declineDeliveryLocally(deliveryId);
          handleDeclineEvent({ detail: { deliveryId } });
        }
      });

      DeliveryOverlay.getPendingAcceptedDelivery().then(({ deliveryId }) => {
        if (deliveryId) {
          console.log("[NativeAccept] Found pending accepted delivery on init:", deliveryId);
          acceptDeliveryGlobalRef.current(deliveryId);
        }
      }).catch(() => { });
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

      // ── EXTRAÇÃO IMEDIATA DOS DADOS BRUTOS (0ms de latência para o entregador) ──
      const initialStore = rawDelivery.companies?.name || rawDelivery.company_name || rawDelivery.store_name || rawDelivery.storeName || "É Pra Já Delivery";
      const initialPickup = rawDelivery.pickup_address || rawDelivery.origin_address || rawDelivery.store_address || rawDelivery.companies?.address || (initialStore !== "É Pra Já Delivery" ? initialStore : "Retirada na Loja");
      const initialDropoff = rawDelivery.delivery_address || rawDelivery.dropoff_address || rawDelivery.address || "Endereço do cliente";
      const rawFee = Number(rawDelivery.delivery_fee || rawDelivery.price || rawDelivery.value || rawDelivery.commission || rawDelivery.driver_fee || rawDelivery.total_value || 0);
      const initialFeeText = rawFee > 0 ? `R$ ${rawFee.toFixed(2).replace(".", ",")}` : "";

      // 1) DISPARO IMEDIATO DO POPUP/CARD NATIVO SOBRE A TELA
      if (Capacitor.isNativePlatform()) {
        try {
          DeliveryOverlay.showDeliveryCard({
            deliveryId: rawDelivery.id,
            storeName: initialStore,
            pickup: initialPickup,
            dropoff: initialDropoff,
            fee: initialFeeText,
          }).catch(() => { });
        } catch { }
      }

      // Central de notificações interna do app (imediata)
      try {
        addNotification({
          type: "delivery",
          title: "Nova corrida disponível",
          description: `${initialStore}\nColeta: ${initialPickup}\nEntrega: ${initialDropoff}\nGanhos: ${initialFeeText || "A calcular"}`,
          deliveryId: rawDelivery.id,
          deliveryStatus: "pending",
        });
      } catch (e) {
        console.warn("[Notify] central falhou:", e);
      }

      // 2) ENRIQUECIMENTO ASSÍNCRONO EM BACKGROUND (busca dados completos da loja e do pedido)
      Promise.all([
        fetchRealStoreName(rawDelivery).catch(() => initialStore),
        (async () => {
          try {
            return await supabase
              .from("available_deliveries")
              .select("*, companies(name, address), orders(delivery_fee)")
              .eq("id", rawDelivery.id)
              .maybeSingle();
          } catch {
            return { data: null };
          }
        })(),
      ]).then(([resolvedStore, fullRes]) => {
        if (cancelled || !activeAlertsRef.current.has(rawDelivery.id) || getAcceptedDeliveries().has(rawDelivery.id) || getDeclinedDeliveries().has(rawDelivery.id)) {
          return;
        }

        const fullDelivery = fullRes?.data || rawDelivery;
        const finalStore = resolvedStore || fullDelivery.companies?.name || initialStore;
        const finalPickup = fullDelivery.pickup_address || fullDelivery.origin_address || fullDelivery.store_address || fullDelivery.companies?.address || (finalStore !== "É Pra Já Delivery" ? finalStore : initialPickup);
        const finalDropoff = fullDelivery.delivery_address || fullDelivery.dropoff_address || fullDelivery.address || initialDropoff;

        const orderFee = fullDelivery.orders?.delivery_fee ? Number(fullDelivery.orders.delivery_fee) : 0;
        const finalFee = orderFee > 0 ? orderFee : Math.max(Number(fullDelivery.delivery_fee) || 0, Number(fullDelivery.value) || 0, Number(fullDelivery.price) || 0, Number(fullDelivery.commission) || 0, rawFee);
        const finalFeeText = finalFee > 0 ? `R$ ${finalFee.toFixed(2).replace(".", ",")}` : initialFeeText;

        // Atualiza o card nativo com nome real da loja e valor final
        if (Capacitor.isNativePlatform()) {
          DeliveryOverlay.showDeliveryCard({
            deliveryId: rawDelivery.id,
            storeName: finalStore,
            pickup: finalPickup,
            dropoff: finalDropoff,
            fee: finalFeeText,
          }).catch(() => { });
        }
      }).catch(() => { });
    };

    const stopRingingFor = (deliveryId: string) => {
      activeAlertsRef.current.delete(deliveryId);
      if (activeAlertsRef.current.size === 0) {
        stopAlert();
      }
      if (Capacitor.isNativePlatform()) {
        LocalNotifications.cancel({ notifications: [{ id: hashId(deliveryId) }] }).catch(() => { });
        DeliveryOverlay.hideDeliveryCard({ deliveryId }).catch(() => { });
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
      driverIdRef.current = driverId;
      isOnlineRef.current = driverRow.is_online ?? false;
      // Sincroniza o estado online com o nativo (suprime alertas FCM offline)
      if (Capacitor.isNativePlatform()) {
        DeliveryOverlay.setDriverOnlineStatus({ isOnline: isOnlineRef.current }).catch(() => { });
      }

      // Persiste driver_id + token no SharedPreferences nativo para que o aceite
      // funcione via HTTP mesmo quando o JS está morto (tela bloqueada, app killed)
      if (Capacitor.isNativePlatform()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const userToken = session?.access_token ?? "";
          DeliveryOverlay.saveDriverContext({ driverId, userToken }).catch(() => { });
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
              DeliveryOverlay.setDriverOnlineStatus({ isOnline: isOnlineRef.current }).catch(() => { });
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
        if (isActive) {
          if (Capacitor.isNativePlatform()) {
            DeliveryOverlay.getPendingAcceptedDelivery().then(({ deliveryId }) => {
              if (deliveryId) {
                console.log("[NativeAccept] Pending delivery accepted on resume:", deliveryId);
                acceptDeliveryGlobalRef.current(deliveryId);
              }
            }).catch(() => { });
          }
          if (isOnlineRef.current) {
            pollDeliveries();
          }
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
                } catch { }
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
                    }).catch(() => { });
                  } else {
                    try {
                      new Notification("💬 Nova mensagem", {
                        body: msg.content,
                        icon: "/logo.png",
                      });
                    } catch { }
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
      safeRemoveListener(nativeDeclineListener);
      safeRemoveListener(nativeAcceptListener);
      safeRemoveListener(appStateListener);
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user?.id]);
}


