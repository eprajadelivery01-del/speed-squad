import { DriverLayout } from "@/components/driver/DriverLayout";
import { useAuth } from "@/hooks/useAuth";
import { Power, Loader2, MessageSquare, MapPin } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { findNearestCity } from "@/utils/location";
import { useCity } from "@/contexts/CityContext";
import { useCitiesWithRegions } from "@/services/regions";
import { LocationConsentDialog } from "@/components/driver/LocationConsentDialog";
import { cn } from "@/lib/utils";

export default function DriverHomePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [driverRecord, setDriverRecord] = useState<{ id: string } | null>(null);
  const [stats, setStats] = useState({ todayCount: 0, todayEarnings: 0 });
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(() => localStorage.getItem("nexus_location_consent") === "true");
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
  const { data: activeCities } = useCitiesWithRegions();

  const updateLocation = useCallback(async (driverId: string) => {
    if (!navigator.geolocation) return;
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const detectedCity = findNearestCity(pos.coords.latitude, pos.coords.longitude);
        if (detectedCity && detectedCity !== selectedCity) setCity(detectedCity);
        setIsDetecting(false);
        await supabase.from("delivery_drivers").update({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          updated_at: new Date().toISOString(),
        }).eq("id", driverId);
      },
      (err) => { console.warn("Geolocation error:", err); setIsDetecting(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [selectedCity, setCity]);

  const startTracking = useCallback((driverId: string) => {
    updateLocation(driverId);
    intervalRef.current = setInterval(() => updateLocation(driverId), 10000);
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const detectedCity = findNearestCity(pos.coords.latitude, pos.coords.longitude);
          if (detectedCity && detectedCity !== selectedCity) setCity(detectedCity);
          await supabase.from("delivery_drivers").update({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            updated_at: new Date().toISOString(),
          }).eq("id", driverId);
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
    localStorage.setItem("nexus_location_consent", "true");
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

  const firstName = profile?.full_name?.split(" ")[0] || "Entregador";

  return (
    <DriverLayout>
      <div className="flex flex-col gap-6 pb-4">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Olá, {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isOnline ? "Você está online e recebendo corridas" : "Fique online para receber corridas"}
          </p>
        </div>

        {/* Status badge */}
        <div className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold w-fit",
          isOnline 
            ? "bg-success/10 text-success border border-success/20" 
            : "bg-muted text-muted-foreground border border-border"
        )}>
          <div className={cn("w-2.5 h-2.5 rounded-full", isOnline ? "bg-success animate-pulse" : "bg-muted-foreground")} />
          {isOnline ? "Online" : "Offline"}
        </div>

        {/* Power Button */}
        <div className="flex justify-center py-4">
          <button
            onClick={handleToggle}
            disabled={loading}
            className={cn(
              "w-36 h-36 rounded-full flex flex-col items-center justify-center gap-2 text-base font-bold transition-all duration-300 shadow-lg",
              isOnline
                ? "bg-success text-success-foreground shadow-success/30"
                : "bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:shadow-primary/30"
            )}
          >
            {loading ? <Loader2 className="h-7 w-7 animate-spin" /> : <Power className="h-7 w-7" />}
            {loading ? "..." : isOnline ? "ONLINE" : "FICAR ONLINE"}
          </button>
        </div>

        {/* City selector */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Cidade de Operação</p>
          </div>
          <select
            value={selectedCity || ""}
            onChange={(e) => setCity(e.target.value || null)}
            className="w-full max-w-xs bg-card border border-border rounded-xl px-4 py-2.5 text-sm font-semibold outline-none appearance-none text-center"
          >
            <option value="">{isDetecting ? "📍 Detectando..." : "Selecione sua cidade"}</option>
            {(activeCities ?? []).map(city => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 text-center shadow-card border border-border">
            <p className="text-2xl font-bold text-foreground">{stats.todayCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Entregas hoje</p>
          </div>
          <div className="bg-card rounded-2xl p-4 text-center shadow-card border border-border">
            <p className="text-2xl font-bold text-foreground">R$ {stats.todayEarnings.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Ganhos hoje</p>
          </div>
        </div>
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => navigate("/driver/chat")}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 flex items-center justify-center z-50 hover:scale-110 active:scale-95 transition-all"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      <LocationConsentDialog open={showConsent} onAccept={handleAcceptConsent} />
    </DriverLayout>
  );
}
