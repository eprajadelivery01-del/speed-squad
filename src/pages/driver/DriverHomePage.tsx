import { DriverLayout } from "@/components/driver/DriverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Power, MapPin, Truck, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HeroMapSection } from "@/components/shared/HeroMapSection";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UnifiedMap } from "@/components/shared/UnifiedMap";
import { useRegions } from "@/services/regions";
import { useCity, CITY_COORDS } from "@/contexts/CityContext";
import { cn } from "@/lib/utils";
import { LocationConsentDialog } from "@/components/driver/LocationConsentDialog";
import { findNearestCity } from "@/utils/location";

export default function DriverHomePage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [driverRecord, setDriverRecord] = useState<{ id: string } | null>(null);
  const [stats, setStats] = useState({ todayCount: 0, todayEarnings: 0 });
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(() => {
    return localStorage.getItem("nexus_location_consent") === "true";
  });
  const [isDetecting, setIsDetecting] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("delivery_drivers")
      .select("id, is_online")
      .eq("user_id", user.id)
      .single()
      .then(async ({ data }) => {
        if (data) {
          setDriverRecord({ id: data.id });
          setIsOnline(data.is_online ?? false);
          
          // Fetch Stats
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const { data: deliveries } = await supabase
            .from("deliveries")
            .select("value, status")
            .eq("driver_id", data.id)
            .gte("created_at", today.toISOString());
            
          if (deliveries) {
            const completed = deliveries.filter(d => d.status === "completed");
            setStats({
              todayCount: deliveries.length,
              todayEarnings: completed.reduce((acc, d) => acc + (Number(d.value) || 0), 0)
            });
          }
        }
      });
  }, [user]);

  const { selectedCity, setCity } = useCity();


  const updateLocation = useCallback(async (driverId: string) => {
    if (!navigator.geolocation) return;
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const detectedCity = findNearestCity(pos.coords.latitude, pos.coords.longitude);
        if (detectedCity && detectedCity !== selectedCity) {
          console.log(`[AutoCity] Detected city: ${detectedCity}`);
          setCity(detectedCity);
        }
        setIsDetecting(false);

        await supabase
          .from("delivery_drivers")
          .update({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            updated_at: new Date().toISOString(),
          })
          .eq("id", driverId);
      },
      (err) => console.warn("Geolocation error:", err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [selectedCity, setCity]);

  const startTracking = useCallback((driverId: string) => {
    updateLocation(driverId);
    intervalRef.current = setInterval(() => updateLocation(driverId), 10000);

    if (navigator.geolocation) {
      setIsDetecting(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const detectedCity = findNearestCity(pos.coords.latitude, pos.coords.longitude);
          if (detectedCity && detectedCity !== selectedCity) {
            setCity(detectedCity);
          }
          setIsDetecting(false);

          await supabase
            .from("delivery_drivers")
            .update({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              updated_at: new Date().toISOString(),
            })
            .eq("id", driverId);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }
  }, [updateLocation, selectedCity, setCity]);

  // Proactive detection on mount
  useEffect(() => {
    if (hasConsent && driverRecord) {
      updateLocation(driverRecord.id);
    }
  }, [hasConsent, driverRecord, updateLocation]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

  const handleAcceptConsent = () => {
    localStorage.setItem("nexus_location_consent", "true");
    setHasConsent(true);
    setShowConsent(false);
  };

  const handleToggle = async () => {
    if (!driverRecord) {
      toast({ title: "Erro", description: "Registro de entregador não encontrado", variant: "destructive" });
      return;
    }

    setLoading(true);
    const newStatus = !isOnline;

    if (newStatus && !hasConsent) {
      setShowConsent(true);
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("delivery_drivers")
      .update({
        is_online: newStatus,
        ...(newStatus ? {} : { latitude: null, longitude: null }),
      })
      .eq("id", driverRecord.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (newStatus) {
      startTracking(driverRecord.id);
      toast({ title: "Você está online!", description: "Sua localização está sendo compartilhada" });
    } else {
      stopTracking();
      toast({ title: "Você está offline", description: "Localização desativada" });
    }

    setIsOnline(newStatus);
    setLoading(false);
  };

  const { data: regions } = useRegions(selectedCity || undefined);

  return (
    <DriverLayout>
      <HeroMapSection 
        title={`Olá, ${profile?.full_name || "Entregador"} 👋`} 
        subtitle={isOnline ? "Você está online e recebendo corridas" : "Fique online para receber corridas"} 
        showActions={false}
        variant="driver"
        onExpand={() => setIsMapExpanded(true)}
        isDetecting={isDetecting}
      />
      
      <div className="flex flex-col items-center gap-6 py-6 px-4 relative z-10 bg-background">

        <button
          onClick={handleToggle}
          disabled={loading}
          className={`w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2 text-lg font-bold transition-all duration-300 shadow-lg ${
            isOnline
              ? "bg-success text-success-foreground shadow-success/30"
              : "bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:shadow-primary/30"
          }`}
        >
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Power className="h-8 w-8" />
          )}
          {loading ? "Atualizando..." : isOnline ? "ONLINE" : "FICAR ONLINE"}
        </button>

        {/* Manual City Selector - FALLBACK */}
        <div className="flex flex-col items-center gap-2 w-full max-w-sm px-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cidade de Operação</p>
          <select 
            value={selectedCity || ""} 
            onChange={(e) => setCity(e.target.value || null)}
            className="w-full bg-card border border-border rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none text-center"
          >
            <option value="">{isDetecting ? "📍 Detectando..." : "Selecione sua cidade"}</option>
            {Object.keys(CITY_COORDS).map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          {!selectedCity && !isDetecting && (
             <p className="text-[10px] text-yellow-500 font-medium">Não detectamos sua cidade. Selecione acima.</p>
          )}
          {isDetecting && (
             <p className="text-[10px] text-primary animate-pulse font-medium">Acessando GPS do navegador...</p>
          )}
        </div>

        {isOnline && (
          <div className="flex items-center gap-2 text-sm text-success">
            <MapPin className="h-4 w-4 animate-pulse" />
            Localização sendo compartilhada em tempo real
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          <div className="bg-card rounded-2xl p-4 text-center shadow-card">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
              <Truck className="h-3.5 w-3.5" />
              Hoje
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.todayCount}</p>
            <p className="text-xs text-muted-foreground">entregas</p>
          </div>
          <div className="bg-card rounded-2xl p-4 text-center shadow-card">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
              <MapPin className="h-3.5 w-3.5" />
              Ganhos
            </div>
            <p className="text-2xl font-bold text-foreground">R$ {stats.todayEarnings.toFixed(2).replace(".", ",")}</p>
            <p className="text-xs text-muted-foreground">hoje</p>
          </div>
        </div>

        <div className="w-full max-w-sm bg-card rounded-2xl p-6 text-center shadow-card border border-border">
          <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {isOnline ? "Aguardando novas corridas..." : "Fique online para ver corridas disponíveis"}
          </p>
        </div>
      </div>

      <Dialog open={isMapExpanded} onOpenChange={setIsMapExpanded}>
        <DialogContent className="max-w-[95vw] w-full h-[80vh] p-0 overflow-hidden rounded-3xl sm:rounded-3xl">
          <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-md border-b border-border">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Mapa de Entregas - {selectedCity || "Global"}
            </DialogTitle>
          </DialogHeader>
          <div className="w-full h-full pt-14">
            <UnifiedMap regions={regions ?? []} interactive={true} />
          </div>
        </DialogContent>
      </Dialog>

      <LocationConsentDialog 
        open={showConsent} 
        onAccept={handleAcceptConsent} 
      />
    </DriverLayout>
  );
}
