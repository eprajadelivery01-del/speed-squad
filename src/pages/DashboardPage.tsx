import { AdminLayout } from "@/components/admin/AdminLayout";
import { MotoboysSidebar } from "@/components/admin/MotoboysSidebar";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";
import { useDeliveryStats, useDeliveries } from "@/services/deliveries";
import { useOnlineDrivers } from "@/services/drivers";
import { useCompanies } from "@/services/companies";
import { useAllRealtime } from "@/services/realtime";
import React, { useState } from "react";
import { useCity } from "@/contexts/CityContext";
import { useRegions } from "@/services/regions";
import { UnifiedMap } from "@/components/shared/UnifiedMap";
import { HeroMapSection } from "@/components/shared/HeroMapSection";
import {
  Package, Bike, Building2, DollarSign, TrendingUp, Clock, CheckCircle, Search, MapPin, Loader2, Navigation, ChevronRight
} from "lucide-react";

export default function DashboardPage() {

  const { data: stats } = useDeliveryStats();
  const { data: onlineDrivers } = useOnlineDrivers();
  const { data: companies } = useCompanies();
  const { data: inTransitData } = useDeliveries({ status: "in_route" });
  const { data: deliveredData } = useDeliveries({ status: "completed" });

  const { selectedCity, setCity } = useCity();
  const { data: regions } = useRegions(selectedCity || undefined);

  const inTransitCount = inTransitData?.count ?? 0;
  const deliveredCount = deliveredData?.count ?? 0;

  const [cityQuery, setCityQuery] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [searchingCity, setSearchingCity] = useState(false);

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
          name: r.display_name.split(",")[0],
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        }))
      );
    } catch {}
    setSearchingCity(false);
  };

  const selectCity = (city: { name: string; lat: number; lng: number }) => {
    setCity(city.name);
    setCitySuggestions([]);
    setCityQuery("");
  };

  return (
    <AdminLayout title="Dashboard">
      <HeroMapSection 
        title="Central de Comando Operacional" 
        subtitle="Gestão inteligente de frota e demanda regional." 
      />
      
      <div className="flex flex-col xl:flex-row gap-8 p-4 md:p-6 w-full min-h-0">
        <div className="hidden xl:block w-72 flex-shrink-0">
          <MotoboysSidebar />
        </div>

        <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Cities List Section (New) */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Cidades de Atendimento
              </h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-1 bg-muted rounded-full">
                {Array.from(new Set(regions?.map(r => r.city) || [])).length} Cidades Ativas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from(new Set(regions?.map(r => r.city) || [])).sort().map(city => {
                const cityRegions = regions?.filter(r => r.city === city) || [];
                const isActive = selectedCity === city;
                return (
                  <button
                    key={city}
                    onClick={() => setCity(city)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group",
                      isActive 
                        ? "bg-primary/5 border-primary shadow-lg shadow-primary/5" 
                        : "bg-background/50 border-border hover:border-primary/50 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                      )}>
                        <Navigation className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className={cn("text-sm font-black", isActive ? "text-primary" : "text-foreground")}>{city}</p>
                        <p className="text-[10px] font-medium text-muted-foreground">{cityRegions.length} Regiões cadastradas</p>
                      </div>
                    </div>
                    {isActive ? (
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                );
              })}
              
              {(!regions || regions.length === 0) && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  <p className="text-sm font-medium italic">Nenhuma cidade configurada no momento.</p>
                </div>
              )}
            </div>
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
