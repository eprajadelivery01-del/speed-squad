import { DriverLayout } from "@/components/driver/DriverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Power, MapPin, Truck, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function DriverHomePage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [driverRecord, setDriverRecord] = useState<{ id: string } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("delivery_drivers")
      .select("id, online")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDriverRecord({ id: data.id });
          setIsOnline(data.online ?? false);
        }
      });
  }, [user]);

  const updateLocation = useCallback(async (driverId: string) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await supabase
          .from("delivery_drivers")
          .update({
            current_latitude: pos.coords.latitude,
            current_longitude: pos.coords.longitude,
            last_location_update: new Date().toISOString(),
          })
          .eq("id", driverId);
      },
      (err) => console.warn("Geolocation error:", err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const startTracking = useCallback((driverId: string) => {
    updateLocation(driverId);
    intervalRef.current = setInterval(() => updateLocation(driverId), 10000);

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          await supabase
            .from("delivery_drivers")
            .update({
              current_latitude: pos.coords.latitude,
              current_longitude: pos.coords.longitude,
              last_location_update: new Date().toISOString(),
            })
            .eq("id", driverId);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }
  }, [updateLocation]);

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

  const handleToggle = async () => {
    if (!driverRecord) {
      toast({ title: "Erro", description: "Registro de entregador não encontrado", variant: "destructive" });
      return;
    }

    setLoading(true);
    const newStatus = !isOnline;

    const { error } = await supabase
      .from("delivery_drivers")
      .update({
        online: newStatus,
        ...(newStatus ? {} : { current_latitude: null, current_longitude: null }),
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

  return (
    <DriverLayout>
      <div className="flex flex-col items-center gap-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {profile?.full_name || "Entregador"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {isOnline ? "Você está online e recebendo corridas" : "Fique online para receber corridas"}
          </p>
        </div>

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
            <p className="text-2xl font-bold text-foreground">0</p>
            <p className="text-xs text-muted-foreground">entregas</p>
          </div>
          <div className="bg-card rounded-2xl p-4 text-center shadow-card">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
              <MapPin className="h-3.5 w-3.5" />
              Ganhos
            </div>
            <p className="text-2xl font-bold text-foreground">R$ 0</p>
            <p className="text-xs text-muted-foreground">hoje</p>
          </div>
        </div>

        <div className="w-full max-w-sm bg-card rounded-2xl p-6 text-center shadow-card">
          <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {isOnline ? "Aguardando novas corridas..." : "Fique online para ver corridas disponíveis"}
          </p>
        </div>
      </div>
    </DriverLayout>
  );
}
