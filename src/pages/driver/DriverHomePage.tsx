import { DriverLayout } from "@/components/driver/DriverLayout";
import { useAuth } from "@/hooks/useAuth";
import { Power, Loader2, MessageSquare, MapPin, ChevronRight, Truck, DollarSign, CheckCircle, Package } from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { findNearestCity } from "@/utils/location";
import { useCity } from "@/contexts/CityContext";
import { useDeliveries, useUpdateDeliveryStatus } from "@/services/deliveries";
import { useUniqueDeliveries } from "@/hooks/useUniqueDeliveries";
import { WhatsAppBubble } from "@/components/chat/WhatsAppBubble";
import { LocationConsentDialog } from "@/components/driver/LocationConsentDialog";
import { cn } from "@/lib/utils";

export default function DriverHomePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wakeLock, setWakeLock] = useState<any>(null);

  // Request Wake Lock to keep screen on
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        const lock = await (navigator as any).wakeLock.request('screen');
        setWakeLock(lock);
        console.log('[WakeLock] Screen Wake Lock is active');
      } catch (err: any) {
        console.error(`[WakeLock] ${err.name}, ${err.message}`);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLock) {
      wakeLock.release().then(() => {
        setWakeLock(null);
        console.log('[WakeLock] Screen Wake Lock was released');
      });
    }
  };

  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, []);

  const metadataName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const displayName = profile?.full_name?.trim() || metadataName || user?.email?.split("@")[0] || "";
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [driverRecord, setDriverRecord] = useState<{ id: string } | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(() => localStorage.getItem("epraja_location_consent") === "true");
  const [isDetecting, setIsDetecting] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const todayStartIso = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }, []);

  const { mutate: updateStatus, isPending: updatingStatus } = useUpdateDeliveryStatus();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("delivery_drivers")
      .select("id, is_online")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDriverRecord({ id: data.id });
          setIsOnline(data.is_online ?? false);
        }
      });
  }, [user]);

  // Fetch today's stats based on driver
  const driverId = driverRecord?.id;
  const { data: todayStatsData } = useDeliveries({
    driverId: driverId || undefined,
    dateFrom: todayStartIso,
    enabled: !!driverId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const stats = {
    todayCount: todayStatsData?.data.filter(d => (d as any).status === "delivered").length ?? 0,
    todayEarnings: todayStatsData?.data
      .filter(d => (d as any).status === "delivered")
      .reduce((acc, d) => acc + (Number((d as any).value) || Number(d.commission) || 0), 0) ?? 0,
  };

  // Fetch broadcast deliveries (pending/broadcasted, no driver assigned)
  const { data: broadcastData, isLoading: loadingBroadcast } = useDeliveries({
    status: ["pending", "broadcasted"],
    driverId: driverId || undefined,
    enabled: isOnline,
    staleTime: 5000,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const { selectedCity, setCity } = useCity();
  
  const updateLocation = useCallback(async (drivId: string) => {
    if (!navigator.geolocation) return;
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Basic sanity check to avoid (0,0) or invalid GPS defaults
        if (latitude === 0 && longitude === 0) {
          setIsDetecting(false);
          return;
        }

        const detectedCity = findNearestCity(latitude, longitude);
        if (detectedCity && detectedCity !== selectedCity) setCity(detectedCity);
        setIsDetecting(false);
        const { error: locError } = await supabase.from("delivery_drivers").update({
          latitude,
          longitude,
          updated_at: new Date().toISOString(),
        }).eq("id", drivId);
        if (locError) console.error("Erro ao atualizar GPS no BD:", locError);
      },
      (err) => { console.warn("Geolocation error:", err); setIsDetecting(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [selectedCity, setCity]);

  const startTracking = useCallback((drivId: string) => {
    updateLocation(drivId);
    intervalRef.current = setInterval(() => updateLocation(drivId), 10000);
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          if (latitude === 0 && longitude === 0) return;

          const detectedCity = findNearestCity(latitude, longitude);
          if (detectedCity && detectedCity !== selectedCity) setCity(detectedCity);
          const { error: locError } = await supabase.from("delivery_drivers").update({
            latitude,
            longitude,
            updated_at: new Date().toISOString(),
          }).eq("id", drivId);
          if (locError) console.error("Erro ao atualizar GPS (watch) no BD:", locError);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }
  }, [updateLocation, selectedCity, setCity]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
  }, []);

  const handleAcceptConsent = () => {
    localStorage.setItem("epraja_location_consent", "true");
    setHasConsent(true);
    setShowConsent(false);
  };

  const handleToggle = async () => {
    if (!driverRecord) return;
    setLoading(true);
    const newStatus = !isOnline;
    if (newStatus && !hasConsent) { setShowConsent(true); setLoading(false); return; }
    const { error } = await supabase.from("delivery_drivers").update({
      is_online: newStatus,
      ...(newStatus ? {} : { latitude: null, longitude: null }),
    }).eq("id", driverRecord.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); setLoading(false); return; }
    if (newStatus) { 
      startTracking(driverRecord.id); 
      requestWakeLock();
      toast({ title: "Você está online!", description: "Novas entregas aparecerão aqui." }); 
    }
    else { 
      stopTracking(); 
      releaseWakeLock();
      toast({ title: "Você está offline", description: "Fique online para receber pedidos." }); 
    }
    setIsOnline(newStatus);
    setLoading(false);
  };

  const handleAcceptDelivery = (deliveryId: string) => {
    if (!driverId) return;
    updateStatus(
      { id: deliveryId, status: "accepted" as any, driverId },
      {
        onSuccess: () => {
          toast({ title: "✅ Corrida aceita!", description: "Vá até o local de retirada." });
        },
        onError: (error: any) => {
          toast({ title: "Erro", description: error.message, variant: "destructive" });
        },
      }
    );
  };

  const firstName = displayName ? displayName.split(/\s+/)[0] : "";
  const rawBroadcastDeliveries = broadcastData?.data ?? [];
  const broadcastDeliveries = useUniqueDeliveries(rawBroadcastDeliveries);

  return (
    <DriverLayout>
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header Section with Profile & Status */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Olá, <span className="text-primary">{firstName || "Entregador"}</span>!
              </h2>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
                {isOnline ? "✅ Você está captando rotas" : "😴 Fique online para trabalhar"}
              </p>
            </div>
            <div className="relative">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                isOnline ? "bg-primary text-white shadow-xl shadow-primary/30" : "bg-muted text-muted-foreground"
              )}>
                {isOnline ? <Truck className="h-6 w-6 animate-bounce" /> : <Power className="h-6 w-6" />}
              </div>
              {isOnline && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-background animate-pulse" />
              )}
            </div>
          </div>

          {/* Quick Toggle Button - Premium Style */}
          <button
            onClick={handleToggle}
            disabled={loading}
            className={cn(
              "w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg",
              isOnline 
                ? "bg-muted text-foreground border border-border" 
                : "bg-primary text-white shadow-primary/20 hover:shadow-primary/40"
            )}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Power className="h-5 w-5" />
                {isOnline ? "Encerrar Expediente" : "Ficar Online Agora"}
              </>
            )}
          </button>
        </div>

        {/* Dynamic Location Bar */}
        {isOnline && (
          <div className="bg-foreground/[0.03] border border-foreground/[0.05] rounded-2xl p-4 flex items-center gap-3 animate-in zoom-in-95 duration-500">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs font-bold text-foreground">
              {isDetecting ? "Buscando localização..." : selectedCity ? `Atuando em ${selectedCity}` : "Aguardando GPS..."}
            </p>
            <div className="ml-auto flex gap-1">
              <div className="w-1 h-1 rounded-full bg-success animate-pulse" />
              <div className="w-1 h-1 rounded-full bg-success animate-pulse delay-75" />
              <div className="w-1 h-1 rounded-full bg-success animate-pulse delay-150" />
            </div>
          </div>
        )}

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm hover:border-primary/20 transition-all group">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Truck className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Entregas</span>
            </div>
            <p className="text-3xl font-black text-foreground tracking-tighter">{stats.todayCount}</p>
            <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">Total de hoje</p>
          </div>

          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm hover:border-primary/20 transition-all group">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="h-4 w-4 text-success" />
              </div>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ganhos</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-black text-success">R$</span>
              <p className="text-3xl font-black text-foreground tracking-tighter">{stats.todayEarnings.toFixed(2).replace(".", ",")}</p>
              {isOnline && wakeLock && (
                <span className="text-[8px] font-black text-success bg-success/10 px-1.5 py-0.5 rounded-full ml-1 uppercase tracking-tighter">
                  Always On
                </span>
              )}
            </div>
            <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">Saldo do dia</p>
          </div>
        </div>

        {/* Available Deliveries - The "Core" of the App */}
        {isOnline && (
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                🚀 Corridas Disponíveis
                {broadcastDeliveries.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white animate-pulse">
                    {broadcastDeliveries.length}
                  </span>
                )}
              </h3>
            </div>

            {loadingBroadcast ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest">Varrendo mapa...</p>
              </div>
            ) : broadcastDeliveries.length === 0 ? (
              <div className="bg-muted/50 border-2 border-dashed border-border rounded-3xl p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 opacity-50">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-black text-foreground">Sem chamados ativos</p>
                <p className="text-[11px] text-muted-foreground mt-1 px-4 leading-relaxed font-bold">
                  Continue online. Novas corridas aparecerão aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {broadcastDeliveries.map((del: any) => (
                  <div key={del.id} className="bg-card border-2 border-border rounded-[2.5rem] p-6 shadow-xl hover:border-primary/30 transition-all flex flex-col gap-5 relative overflow-hidden group">
                    {/* Price Tag Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                            {del.companies?.name || "Marketplace"}
                          </span>
                        </div>
                        <h4 className="text-xl font-black text-foreground tracking-tight">{del.customer_name}</h4>
                      </div>
                      <div className="bg-success text-white px-4 py-2 rounded-2xl text-lg font-black tracking-tighter shadow-lg shadow-success/20 flex items-baseline gap-0.5">
                        <span className="text-[10px]">R$</span>
                        {Number(del.value || 0).toFixed(2).replace(".", ",")}
                      </div>
                    </div>

                    {/* Route Details */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Package className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Retirada</span>
                          <span className="text-xs font-bold text-foreground leading-snug">{del.pickup_address || "Endereço da Loja"}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                          <MapPin className="h-3.5 w-3.5 text-success" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Entrega</span>
                          <span className="text-xs font-bold text-foreground leading-snug">{del.dropoff_address || del.address}</span>
                        </div>
                      </div>
                    </div>

                    {/* Items/Notes Preview */}
                    {del.notes && (
                      <div className="bg-muted/40 p-4 rounded-2xl border border-border/50">
                        <div className="flex items-start gap-2">
                          <Package className="h-4 w-4 text-primary shrink-0 opacity-50" />
                          <p className="text-[11px] font-bold text-muted-foreground leading-tight italic">
                            {del.notes.includes("[ITENS:") 
                              ? del.notes.replace(/\[ITENS:\s*(.*?)\]/g, '$1')
                              : del.notes}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Accept Button - Big & Impactful */}
                    <button
                      onClick={() => handleAcceptDelivery(del.id)}
                      disabled={updatingStatus}
                      className="w-full h-16 rounded-[1.5rem] bg-foreground text-background font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-foreground/90 transition-all flex items-center justify-center gap-3 group-hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                    >
                      {updatingStatus ? <Loader2 className="h-6 w-6 animate-spin" /> : <ChevronRight className="h-6 w-6" />}
                      Aceitar Agora
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation Footer Shortcut */}
        <button
          onClick={() => navigate("/driver/deliveries")}
          className="w-full h-20 bg-card border border-border rounded-3xl p-5 flex items-center gap-4 hover:border-primary/20 transition-all active:scale-[0.99]"
        >
          <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center shrink-0">
            <Truck className="h-6 w-6 text-foreground opacity-70" />
          </div>
          <div className="flex flex-col text-left">
            <p className="text-sm font-black text-foreground uppercase tracking-tight">Minhas Entregas</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Acompanhar ativas e histórico</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
        </button>
      </div>

      {/* Floating Action Button for Chat */}
      <button
        onClick={() => navigate("/driver/chat")}
        className="fixed bottom-24 right-6 w-16 h-16 rounded-[2rem] bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center z-50 hover:scale-110 active:scale-90 transition-all border-4 border-white/20 backdrop-blur-sm"
      >
        <MessageSquare className="h-7 w-7" />
        {/* Badge could be added here if chat notifications are active */}
      </button>

      <LocationConsentDialog open={showConsent} onAccept={handleAcceptConsent} />
    </DriverLayout>
  );
}
