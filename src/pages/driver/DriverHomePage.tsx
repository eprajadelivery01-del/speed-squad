import { DriverLayout } from "@/components/driver/DriverLayout";
import { useAuth } from "@/hooks/useAuth";
import { Power, Loader2, MessageSquare, MapPin, ChevronRight, Truck, DollarSign, CheckCircle, Package } from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { findNearestCity } from "@/utils/location";
import { useCity } from "@/contexts/CityContext";
import { useDeliveries, useUpdateDeliveryStatus, useDriverEarningsSummary } from "@/services/deliveries";
import { useUniqueDeliveries } from "@/hooks/useUniqueDeliveries";
import { LocationConsentDialog } from "@/components/driver/LocationConsentDialog";
import { cn } from "@/lib/utils";
import { useAudioAlert } from "@/hooks/useAudioAlert";
import { translateDeliveryError } from "@/lib/errorMessages";
import { IncomingOrderScreen } from "@/components/driver/IncomingOrderScreen";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { DeliveryOverlay } from "@/plugins/DeliveryOverlay";
import { declineDeliveryLocally, acceptDeliveryLocally, getAcceptedDeliveries, getDeclinedDeliveries } from "@/hooks/useDriverNotifications";

export default function DriverHomePage() {
  const { stopAlert, unlockAudio } = useAudioAlert();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const metadataName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const displayName = profile?.full_name?.trim() || metadataName || user?.email?.split("@")[0] || "";
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [driverRecord, setDriverRecord] = useState<{ id: string, city_id?: string } | null>(null);
  const [commissionRate, setCommissionRate] = useState<number>(0.40);
  const [totalDeliveriesCount, setTotalDeliveriesCount] = useState<number>(0);
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(() => localStorage.getItem("nexus_location_consent") === "true");
  const [isDetecting, setIsDetecting] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isQueryingRef = useRef(false);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const todayStartIso = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }, []);
  const todayEndIso = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end.toISOString();
  }, []);

  const [rejectedLocalIds, setRejectedLocalIds] = useState<string[]>(() => {
    return Array.from(getDeclinedDeliveries());
  });
  const [activeIncomingOrder, setActiveIncomingOrder] = useState<any>(null);

  const { mutate: updateStatus, isPending: updatingStatus } = useUpdateDeliveryStatus();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const initOverlay = async () => {
        try {
          await (window as any).DeliveryOverlay?.requestOverlayPermission();
          setTimeout(() => {
             (window as any).DeliveryOverlay?.startOverlay().catch((e: any) => console.warn("Ainda sem permissão:", e));
          }, 1000);
        } catch(e) {}
      };
      initOverlay();

      const listener = App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
            (window as any).DeliveryOverlay?.startOverlay().catch(() => {
              // Se falhar ao iniciar (sem permissão), pede a permissão novamente
              (window as any).DeliveryOverlay?.requestOverlayPermission().catch((e: any) => console.warn("Erro ao pedir overlay:", e));
            });
        }
      });

      return () => {
        listener.then(l => l.remove());
      };
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("delivery_drivers")
      .select("id, is_online, commission_rate, city_id")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDriverRecord({ id: data.id, city_id: data.city_id });
          setIsOnline(data.is_online ?? false);
          setCommissionRate(data.commission_rate !== null && data.commission_rate !== undefined ? Number(data.commission_rate) : 0.40);
          
          // Fetch completed deliveries count
          supabase
            .from("deliveries")
            .select("id", { count: "exact", head: true })
            .eq("driver_id", data.id)
            .in("status", ["delivered", "completed"])
            .then(({ count }) => {
              setTotalDeliveriesCount(count || 0);
            });
        }
      });
  }, [user]);

  // Fetch today's stats based on driver using RPC
  const driverId = driverRecord?.id;
  const { data: earningsData } = useDriverEarningsSummary(driverId, todayStartIso, todayEndIso);

  const stats = {
    todayCount: earningsData?.total_deliveries || 0,
    todayEarnings: earningsData?.net_earnings || 0,
  };

  // Fetch broadcast deliveries (pending/broadcasted, no driver assigned)
  const { data: broadcastData, isLoading: loadingBroadcast } = useDeliveries({
    status: ["pending", "broadcasted"],
    driverId: driverId || undefined,
    cityId: driverRecord?.city_id || undefined,
    enabled: isOnline,
    staleTime: 5000,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const { selectedCity, setCity } = useCity();
  

  const updateLocation = useCallback(async (drivId: string) => {
    if (!navigator.geolocation) return;
    if (isQueryingRef.current) return;
    isQueryingRef.current = true;
    setIsDetecting(true);

    const handleCoordsUpdate = async (lat: number, lng: number) => {
      // Skip updates if location has not changed significantly (approx. 10 meters)
      if (lastCoordsRef.current) {
        const latDiff = Math.abs(lastCoordsRef.current.latitude - lat);
        const lngDiff = Math.abs(lastCoordsRef.current.longitude - lng);
        if (latDiff < 0.0001 && lngDiff < 0.0001) {
          setIsDetecting(false);
          isQueryingRef.current = false;
          return;
        }
      }
      lastCoordsRef.current = { latitude: lat, longitude: lng };

      const detectedCity = findNearestCity(lat, lng);
      if (detectedCity && detectedCity !== selectedCity) {
        setCity(detectedCity);
      }
      setIsDetecting(false);
      isQueryingRef.current = false;

      const { error: locError } = await supabase.from("delivery_drivers").update({
        latitude: lat,
        longitude: lng,
        updated_at: new Date().toISOString(),
      }).eq("id", drivId);
      if (locError) console.error("Erro ao atualizar GPS no BD:", locError);
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await handleCoordsUpdate(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn("Geolocation warning (high accuracy failed):", err.message);
        // Fallback once to low accuracy on failure/timeout
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            await handleCoordsUpdate(pos.coords.latitude, pos.coords.longitude);
          },
          (fallbackErr) => {
            console.warn("Geolocation warning (low accuracy fallback failed):", fallbackErr.message);
            setIsDetecting(false);
            isQueryingRef.current = false;
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, [selectedCity, setCity]);

  const startTracking = useCallback((drivId: string) => {
    updateLocation(drivId);
    // Increase polling fallback interval to 45 seconds to reduce concurrency and locks
    intervalRef.current = setInterval(() => updateLocation(drivId), 45000);
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          // Skip DB write if location has not changed significantly (approx. 10 meters)
          if (lastCoordsRef.current) {
            const latDiff = Math.abs(lastCoordsRef.current.latitude - lat);
            const lngDiff = Math.abs(lastCoordsRef.current.longitude - lng);
            if (latDiff < 0.0001 && lngDiff < 0.0001) {
              return;
            }
          }
          lastCoordsRef.current = { latitude: lat, longitude: lng };

          const detectedCity = findNearestCity(lat, lng);
          if (detectedCity && detectedCity !== selectedCity) {
            setCity(detectedCity);
          }

          const { error: locError } = await supabase.from("delivery_drivers").update({
            latitude: lat,
            longitude: lng,
            updated_at: new Date().toISOString(),
          }).eq("id", drivId);
          if (locError) console.error("Erro ao atualizar GPS (watch) no BD:", locError);
        },
        (err) => {
          console.warn("watchPosition warning:", err.message);
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
      );
    }
  }, [updateLocation, selectedCity, setCity]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    isQueryingRef.current = false;
  }, []);

  const handleAcceptConsent = async () => {
    localStorage.setItem("nexus_location_consent", "true");
    setHasConsent(true);
    setShowConsent(false);
    
    if (driverRecord && !isOnline) {
      setLoading(true);
      const { error } = await supabase.from("delivery_drivers").update({
        is_online: true,
      }).eq("id", driverRecord.id);
      
      if (!error) {
        startTracking(driverRecord.id);
        toast({ title: "Você está online!" });
        setIsOnline(true);
      } else {
        toast({ title: "Erro", description: "Falha de conexão. Tente novamente.", variant: "destructive" });
      }
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    unlockAudio(); // Destrava o áudio no clique do usuário
    sessionStorage.setItem("sound_enabled", "true");
    sessionStorage.setItem("epj_sound_enabled", "true");
    
    let currentDriverRecord = driverRecord;
    
    if (!currentDriverRecord) {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from("delivery_drivers")
        .select("id, is_online, commission_rate, city_id")
        .eq("user_id", user.id)
        .single();
      
      if (data) {
        currentDriverRecord = { id: data.id, city_id: data.city_id };
        setDriverRecord(currentDriverRecord);
      } else {
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    const newStatus = !isOnline;
    if (newStatus && !hasConsent) { setShowConsent(true); setLoading(false); return; }
    
    const { error } = await supabase.from("delivery_drivers").update({
      is_online: newStatus,
    }).eq("id", currentDriverRecord.id);
    
    if (error) { toast({ title: "Erro", description: "Falha de conexão. Tente novamente.", variant: "destructive" }); setLoading(false); return; }
    
    if (newStatus) { startTracking(currentDriverRecord.id); toast({ title: "Você está online!" }); }
    else { stopTracking(); toast({ title: "Você está offline" }); }
    
    setIsOnline(newStatus);
    setLoading(false);
  };

  const handleAcceptDelivery = (deliveryId: string) => {
    if (!driverRecord) return;
    stopAlert();
    updateStatus(
      { id: deliveryId, status: "accepted" as any, driverId: driverRecord.id },
      {
        onSuccess: () => {
          window.dispatchEvent(new CustomEvent("delivery-accepted", { detail: { id: deliveryId } }));
          setActiveIncomingOrder(null);
          toast({ title: "✅ Corrida aceita!", description: "Vá até o local de retirada." });
        },
        onError: (error: any) => {
          const { title, description } = translateDeliveryError(error, "accept");
          toast({ title, description, variant: "destructive" });
        },
      }
    );
  };

  const firstName = displayName ? displayName.split(/\s+/)[0] : "";
  const rawBroadcastDeliveries = broadcastData?.data ?? [];
  const broadcastDeliveries = useUniqueDeliveries(rawBroadcastDeliveries);

  const [acceptedLocalIds, setAcceptedLocalIds] = useState<string[]>(() => {
    return Array.from(getAcceptedDeliveries());
  });



  useEffect(() => {
    // Encontra a primeira corrida válida que não foi rejeitada nem aceita localmente
    const nextOrder = broadcastDeliveries.find((del: any) => !rejectedLocalIds.includes(del.id) && !acceptedLocalIds.includes(del.id));
    
    if (nextOrder && !activeIncomingOrder) {
      setActiveIncomingOrder(nextOrder);
    } else if (!nextOrder && activeIncomingOrder) {
      setActiveIncomingOrder(null);
    }
  }, [broadcastDeliveries, rejectedLocalIds, acceptedLocalIds, activeIncomingOrder]);

  // Listen for native popup acceptance/rejection
  useEffect(() => {
    const handleNativeAccept = (e: any) => {
      const id = e.detail?.id;
      if (id) {
        setAcceptedLocalIds(prev => [...prev, id]);
        if (activeIncomingOrder?.id === id) {
          setActiveIncomingOrder(null);
        }
      }
    };
    const handleNativeReject = (e: any) => {
      const id = e.detail?.id || e.detail?.deliveryId;
      if (id) {
        setRejectedLocalIds(prev => [...prev, id]);
        if (activeIncomingOrder?.id === id) {
          setActiveIncomingOrder(null);
        }
      }
    };
    
    window.addEventListener("delivery-accepted", handleNativeAccept);
    window.addEventListener("delivery-rejected", handleNativeReject);
    
    return () => {
      window.removeEventListener("delivery-accepted", handleNativeAccept);
      window.removeEventListener("delivery-rejected", handleNativeReject);
    };
  }, [activeIncomingOrder]);

  const handleRejectLocal = (deliveryId: string) => {
    stopAlert();
    declineDeliveryLocally(deliveryId);
    setRejectedLocalIds(prev => [...prev, deliveryId]);
    setActiveIncomingOrder(null);
  };

  const handleAcceptLocal = (deliveryId: string) => {
    setAcceptedLocalIds(prev => [...prev, deliveryId]);
    acceptDeliveryLocally(deliveryId);
    handleAcceptDelivery(deliveryId);
    setActiveIncomingOrder(null);
  };

  return (
    <DriverLayout>
      {activeIncomingOrder && (
        <IncomingOrderScreen 
          delivery={activeIncomingOrder} 
          onAccept={handleAcceptLocal} 
          onReject={handleRejectLocal} 
        />
      )}
      <div className="flex flex-col gap-5">
          {/* Greeting */}
        <div>
          <h2 className="text-2xl font-extrabold text-foreground">
            Olá, {firstName || "Entregador"} 👋
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isOnline ? "Você está recebendo corridas" : "Fique online para receber corridas"}
          </p>
        </div>

        {/* Status Bar */}
        <div className={cn(
          "flex items-center justify-between rounded-2xl px-4 py-3 border",
          isOnline
            ? "bg-success/10 border-success/20"
            : "bg-muted border-border"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-3 h-3 rounded-full",
              isOnline ? "bg-success animate-pulse" : "bg-muted-foreground"
            )} />
            <div>
              <p className={cn(
                "text-sm font-bold",
                isOnline ? "text-success" : "text-muted-foreground"
              )}>
                {isOnline ? "Online" : "Offline"}
              </p>
              {isOnline && (
                <p className="text-[10px] text-success/70 font-medium flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5" /> GPS ativo
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={loading}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              isOnline
                ? "text-primary hover:bg-primary/10"
                : "bg-primary text-primary-foreground shadow-md hover:opacity-90"
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Power className="h-4 w-4" />
            )}
            {isOnline ? "Desligar" : "Ligar"}
          </button>
        </div>

        {/* City Auto-detected */}
        {isOnline && (
          <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-2.5">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm font-semibold text-foreground">
              {isDetecting ? "📍 Detectando localização..." : selectedCity ? `📍 ${selectedCity}` : "📍 Aguardando GPS..."}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Truck className="h-3.5 w-3.5" />
              <p className="text-[10px] font-bold uppercase tracking-wide">Entregas hoje</p>
            </div>
            <p className="text-2xl font-extrabold text-foreground">{stats.todayCount}</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <span className="text-xs">💰</span>
              <p className="text-[10px] font-bold uppercase tracking-wide">Ganhos hoje</p>
            </div>
            <p className="text-2xl font-extrabold text-primary">R$ {stats.todayEarnings.toFixed(2)}</p>
          </div>
        </div>

        {/* Commission Platform Rate */}
        <div className="text-center bg-card/40 border border-border/50 rounded-2xl py-2.5 px-4 text-xs font-semibold text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Comissão plataforma: <span className="text-primary font-black">R$ {commissionRate.toFixed(2).replace('.', ',')}</span> por corrida</span>
          <span>Saldo devido: <span className="text-destructive font-black">R$ {(stats.todayCount * commissionRate).toFixed(2).replace('.', ',')}</span></span>
        </div>

        {/* Broadcast Deliveries Section */}
        {isOnline && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                🔥 Corridas disponíveis
                {broadcastDeliveries.length > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                    {broadcastDeliveries.length}
                  </span>
                )}
              </h3>
              {broadcastDeliveries.length > 0 && (
                <button onClick={stopAlert} className="text-[10px] font-black uppercase tracking-widest bg-muted text-muted-foreground px-3 py-1.5 rounded-lg border border-border hover:bg-muted/80 transition-colors">
                  Silenciar
                </button>
              )}
            </div>

            {loadingBroadcast ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : broadcastDeliveries.length === 0 ? (
              <div className="bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3.5 text-center">
                <p className="text-sm font-bold text-foreground">Aguardando novas corridas...</p>
                <p className="text-xs text-muted-foreground mt-0.5">Você será notificado quando houver entregas</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {broadcastDeliveries.map((del: any) => {
                  const hasPago = del.notes?.includes("[PAGO]");
                  const hasReceber = del.notes?.includes("[RECEBER:");
                  const paymentBadge = hasPago ? "✅ PAGO" : hasReceber ? del.notes.match(/\[RECEBER:.*?\]/)?.[0] : null;
                  
                  let cleanNotes = del.notes || "";
                  if (hasPago) cleanNotes = cleanNotes.replace("[PAGO]", "").trim();
                  if (hasReceber) cleanNotes = cleanNotes.replace(/\[RECEBER:.*?\]/, "").trim();
                  
                  const isProducts = cleanNotes.includes("[PRODUTOS]") || cleanNotes.includes("[ITENS:");
                  if (isProducts) {
                    cleanNotes = cleanNotes.replace("[PRODUTOS]", "").replace(/\[ITENS:.*?\]/, "").trim();
                  }

                  return (
                  <div key={del.id} className="relative bg-card/60 backdrop-blur-xl rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/20 dark:border-white/10 flex flex-col gap-5 overflow-hidden group">
                    {/* Background glow effect */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-[50px] pointer-events-none group-hover:bg-primary/30 transition-colors duration-500" />
                    
                    {/* Header: Store and Value */}
                    <div className="flex justify-between items-start z-10">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg">
                            Nova Corrida
                          </span>
                          {paymentBadge && (
                            <span className={cn(
                              "px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg",
                              hasPago ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                            )}>
                              {paymentBadge.replace(/[\[\]]/g, "")}
                            </span>
                          )}
                        </div>

                        <h4 className="text-xl font-extrabold text-foreground tracking-tight mt-1">{del.companies?.name || "Loja Parceira"}</h4>
                        <p className="text-sm font-medium text-muted-foreground">{del.customer_name}</p>
                      </div>
                      
                      {((del.delivery_fee != null && del.delivery_fee > 0) || (del.value != null && del.value > 0) || (del.price != null && del.price > 0)) && (
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Ganhos</span>
                          <div className="text-2xl font-black text-success tracking-tighter">
                            <span className="text-sm mr-0.5">R$</span>{Number(del.delivery_fee || del.value || del.price || 0).toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Route Timeline */}
                    <div className="relative flex flex-col gap-4 pl-3 py-1 z-10">
                      <div className="absolute left-[17px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-foreground/20 rounded-full" />
                      
                      {/* Pickup */}
                      <div className="flex items-start gap-4">
                        <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_0_4px_rgba(var(--primary),0.2)] mt-1.5 relative z-10" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Coleta</span>
                          <span className="text-sm font-semibold text-foreground mt-0.5">{del.pickup_address || "Retirada na loja"}</span>
                        </div>
                      </div>
                      
                      {/* Dropoff */}
                      <div className="flex items-start gap-4">
                        <div className="w-3 h-3 rounded-full bg-foreground border-2 border-background shadow-[0_0_0_2px_rgba(var(--foreground),0.2)] mt-1.5 relative z-10" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entrega</span>
                          <span className="text-sm font-semibold text-foreground mt-0.5">{del.dropoff_address || del.address}</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Details/Products */}
                    {cleanNotes && (
                      <div className={cn(
                        "relative p-3.5 rounded-2xl border z-10 overflow-hidden",
                        isProducts ? "bg-primary/5 border-primary/20" : "bg-muted/40 border-border/50"
                      )}>
                        <div className="flex items-start gap-3 relative z-10">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            isProducts ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground shadow-sm"
                          )}>
                            <Package className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {isProducts ? (
                              <>
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Conteúdo do Pedido</p>
                                <p className="text-xs font-semibold text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                  {cleanNotes}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs font-medium text-muted-foreground leading-relaxed italic">
                                "{cleanNotes}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      onClick={() => handleAcceptDelivery(del.id)}
                      disabled={updatingStatus}
                      className="relative w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-base text-white shadow-[0_8px_20px_rgba(var(--primary),0.3)] hover:shadow-[0_10px_25px_rgba(var(--primary),0.4)] hover:-translate-y-0.5 active:translate-y-0.5 transition-all z-10 overflow-hidden group/btn"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-[#ff4713]" />
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                      
                      <div className="relative flex items-center gap-2">
                        {updatingStatus ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                        ACEITAR CORRIDA
                      </div>
                    </button>
                  </div>
                )})}
              </div>
            )}
          </div>
        )}

        {/* Link to deliveries page */}
        <button
          onClick={() => navigate("/driver/deliveries")}
          className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Ver minhas entregas</p>
            <p className="text-xs text-muted-foreground">Entregas em andamento e agenda</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </button>
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => navigate("/driver/chat")}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center z-50 hover:scale-110 active:scale-95 transition-all"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      <LocationConsentDialog open={showConsent} onAccept={handleAcceptConsent} />
      {/* ── BONASOFT Watermark ── */}
      <div className="mt-16 pb-8 text-center opacity-40 select-none pointer-events-none">
        <p className="text-[11px] font-black uppercase tracking-[0.6em] text-muted-foreground ml-2">BONASOFT</p>
      </div>
    </DriverLayout>
  );
}


