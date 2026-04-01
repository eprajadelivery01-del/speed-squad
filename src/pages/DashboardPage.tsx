import { AdminLayout } from "@/components/admin/AdminLayout";
import { MotoboysSidebar } from "@/components/admin/MotoboysSidebar";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";
import { MapView } from "@/components/admin/MapView";
import { useDeliveryStats, useDeliveries } from "@/services/deliveries";
import { useOnlineDrivers } from "@/services/drivers";
import { useCompanies } from "@/services/companies";
import { useAllRealtime } from "@/services/realtime";
import { useState, useEffect } from "react";
import {
  Package, Bike, Building2, DollarSign, TrendingUp, Clock, CheckCircle, Search, MapPin, Loader2
} from "lucide-react";

const CITY_STORAGE_KEY = "epj_selected_city";

export default function DashboardPage() {
  useAllRealtime();

  const { data: stats } = useDeliveryStats();
  const { data: onlineDrivers } = useOnlineDrivers();
  const { data: companies } = useCompanies();
  const { data: inTransitData } = useDeliveries({ status: "in_transit" });
  const { data: deliveredData } = useDeliveries({ status: "delivered" });

  const inTransitCount = inTransitData?.count ?? 0;
  const deliveredCount = deliveredData?.count ?? 0;

  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [searchingCity, setSearchingCity] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CITY_STORAGE_KEY);
    if (stored) {
      try { setSelectedCity(JSON.parse(stored)); } catch {}
    }
  }, []);

  const searchCity = async () => {
    if (cityQuery.length < 2) return;
    setSearchingCity(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}&limit=5&addressdetails=1`
      );
      const data = await res.json();
      setCitySuggestions(
        data.map((r: any) => ({
          name: r.display_name.split(",").slice(0, 3).join(","),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        }))
      );
    } catch {}
    setSearchingCity(false);
  };

  const selectCity = (city: { name: string; lat: number; lng: number }) => {
    setSelectedCity(city);
    localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(city));
    setCitySuggestions([]);
    setCityQuery("");
  };

  return (
    <AdminLayout title="Dashboard" subtitle="Visão geral do sistema">
      <div className="flex gap-4 h-[calc(100vh-130px)]">
        <div className="hidden xl:block w-72 flex-shrink-0">
          <MotoboysSidebar />
        </div>

        <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
          <div className="relative">
            <div className="rounded-2xl bg-card shadow-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                {selectedCity ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">{selectedCity.name}</span>
                    <button
                      onClick={() => { setSelectedCity(null); localStorage.removeItem(CITY_STORAGE_KEY); }}
                      className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      value={cityQuery}
                      onChange={(e) => setCityQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchCity()}
                      placeholder="Selecionar cidade..."
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                    <button onClick={searchCity} className="p-1">
                      {searchingCity ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Search className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                )}
              </div>

              {citySuggestions.length > 0 && (
                <div className="border-t border-border">
                  {citySuggestions.map((city, i) => (
                    <button
                      key={i}
                      onClick={() => selectCity(city)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border last:border-0"
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={<Package className="h-5 w-5" />} label="Corridas Hoje" value={stats?.today ?? 0} iconBg="bg-warning/10" iconColor="text-warning" />
            <StatCard icon={<Clock className="h-5 w-5" />} label="Em Trânsito" value={inTransitCount} iconBg="bg-primary/10" iconColor="text-primary" pulse />
            <StatCard icon={<Bike className="h-5 w-5" />} label="Motoboys Online" value={onlineDrivers?.length ?? 0} iconBg="bg-success/10" iconColor="text-success" pulse />
            <StatCard icon={<DollarSign className="h-5 w-5" />} label="Faturamento" value={`R$ ${(stats?.todayRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} iconBg="bg-info/10" iconColor="text-info" />
          </div>

          <div className="flex gap-3 flex-wrap">
            <MiniStat icon={<CheckCircle className="h-3.5 w-3.5 text-success" />} label="Entregues" value={deliveredCount} />
            <MiniStat icon={<Building2 className="h-3.5 w-3.5 text-primary" />} label="Empresas" value={companies?.length ?? 0} />
            <MiniStat icon={<TrendingUp className="h-3.5 w-3.5 text-accent" />} label="Total Geral" value={stats?.total ?? 0} />
          </div>

          <div className="flex-1 rounded-2xl overflow-hidden shadow-card min-h-[300px]">
            <MapView centerCity={selectedCity} />
          </div>
        </div>

        <div className="hidden xl:block w-80 flex-shrink-0">
          <NotificationsPanel />
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ icon, label, value, iconBg, iconColor, pulse }: {
  icon: React.ReactNode; label: string; value: string | number;
  iconBg: string; iconColor: string; pulse?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} ${iconColor} ${pulse ? "animate-pulse" : ""}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-card-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 shadow-card text-sm">
      {icon}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
