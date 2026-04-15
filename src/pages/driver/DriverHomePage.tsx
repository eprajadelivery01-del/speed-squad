import { DriverLayout } from "@/components/driver/DriverLayout";
import { useAuth } from "@/hooks/useAuth";
import { Power, Loader2, MessageSquare, MapPin, ChevronRight, Truck, DollarSign, CheckCircle, Package } from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { findNearestCity } from "@/utils/location";
import { useCity } from "@/contexts/CityContext";
import { useCitiesWithRegions } from "@/services/regions";
import { LocationConsentDialog } from "@/components/driver/LocationConsentDialog";
import { useDeliveries, useUpdateDeliveryStatus } from "@/services/deliveries";
import { cn } from "@/lib/utils";

export default function DriverHomePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const metadataName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const displayName = profile?.full_name?.trim() || metadataName || user?.email?.split("@")[0] || "";
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [driverRecord, setDriverRecord] = useState<{ id: string } | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(() => localStorage.getItem("nexus_location_consent") === "true");
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
    enabled: isOnline,
    staleTime: 15000,
    refetchOnWindowFocus: false,
  });

  const { selectedCity, setCity } = useCity();
  const { data: activeCities } = useCitiesWithRegions();

  const updateLocation = useCallback(async (drivId: string) => {
    if (!navigator.geolocation) return;
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const detectedCity = findNearestCity(pos.coords.latitude, pos.coords.longitude);
        if (detectedCity && detectedCity !== selectedCity) setCity(detectedCity);
        setIsDetecting(false);
        const { error: locError } = await supabase.from("delivery_drivers").update({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
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
          const detectedCity = findNearestCity(pos.coords.latitude, pos.coords.longitude);
          if (detectedCity && detectedCity !== selectedCity) setCity(detectedCity);
          const { error: locError } = await supabase.from("delivery_drivers").update({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
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
    if (newStatus) { startTracking(driverRecord.id); toast({ title: "Você está online!" }); }
    else { stopTracking(); toast({ title: "Você está offline" }); }
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
  const broadcastDeliveries = broadcastData?.data ?? [];

  return (
    <DriverLayout>
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

        {/* City Selector */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <select
            value={selectedCity || ""}
            onChange={(e) => setCity(e.target.value || null)}
            className="flex-1 bg-card border border-border rounded-xl px-3 py-2.5 text-sm font-semibold outline-none appearance-none text-foreground"
          >
            <option value="">{isDetecting ? "📍 Detectando..." : "Selecione a cidade"}</option>
            {((activeCities ?? []) as string[]).map(city => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>

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

        {/* Broadcast Deliveries Section */}
        {isOnline && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                🔔 Corridas disponíveis
                {broadcastDeliveries.length > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                    {broadcastDeliveries.length}
                  </span>
                )}
              </h3>
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
                {broadcastDeliveries.map((del: any) => (
                  <div key={del.id} className="bg-card rounded-2xl p-4 shadow-card border border-border flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {del.companies?.name || "Empresa"}
                        </span>
                        <h4 className="text-base font-bold text-foreground leading-tight">{del.customer_name}</h4>
                      </div>
                      {del.value != null && (
                        <div className="bg-success/10 text-success px-2 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {Number(del.value).toFixed(2)}
                        </div>
                      )}
                    </div>

                    {del.pickup_address && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Package className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{del.pickup_address}</span>
                      </div>
                    )}

                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{del.dropoff_address || del.address}</span>
                    </div>

                    <button
                      onClick={() => handleAcceptDelivery(del.id)}
                      disabled={updatingStatus}
                      className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm gradient-primary text-primary-foreground shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Aceitar Corrida
                    </button>
                  </div>
                ))}
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
    </DriverLayout>
  );
}
