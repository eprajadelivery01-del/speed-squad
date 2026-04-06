import { useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { useDrivers } from "@/services/drivers";
import { useCompanies } from "@/services/companies";

export function MotoboysSidebar() {
  const [search, setSearch] = useState("");
  const [showOnline, setShowOnline] = useState(true);
  const [showOffline, setShowOffline] = useState(true);
  const [showLocais, setShowLocais] = useState(true);

  const { data: drivers } = useDrivers();
  const { data: companies } = useCompanies();

  const allDrivers = drivers ?? [];
  const online = allDrivers.filter((d) => d.is_online);
  const offline = allDrivers.filter((d) => !d.is_online);

  const filterBySearch = (name: string) => !search || name.toLowerCase().includes(search.toLowerCase());

  return (
    <div className="h-full rounded-2xl bg-card shadow-card flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">👤</span>
          <h3 className="text-sm font-bold text-foreground">Motoboys e Locais</h3>
        </div>
      </div>

      <div className="px-4 py-2">
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
            placeholder="Buscar..."
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div>
          <button onClick={() => setShowOnline(!showOnline)} className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:bg-muted/50">
            Motoboys Online ({online.length})
            {showOnline ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showOnline && online.filter((d) => filterBySearch(d.profiles?.full_name || "")).map((driver) => (
            <div key={driver.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center text-sm overflow-hidden">
                  {driver.profiles?.avatar_url ? <img src={driver.profiles?.avatar_url} alt="" className="h-full w-full object-cover" /> : "🏍️"}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{driver.profiles?.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{driver.vehicle || "—"}</p>
                </div>
              </div>
              <span className="h-2 w-2 rounded-full bg-success" />
            </div>
          ))}
        </div>

        <div>
          <button onClick={() => setShowOffline(!showOffline)} className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:bg-muted/50">
            Motoboys Offline ({offline.length})
            {showOffline ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showOffline && offline.filter((d) => filterBySearch(d.profiles?.full_name || "")).map((driver) => (
            <div key={driver.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm overflow-hidden">
                  {driver.profiles?.avatar_url ? <img src={driver.profiles?.avatar_url} alt="" className="h-full w-full object-cover" /> : "🏍️"}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{driver.profiles?.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{driver.vehicle || "—"}</p>
                </div>
              </div>
              <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            </div>
          ))}
        </div>

        <div>
          <button onClick={() => setShowLocais(!showLocais)} className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:bg-muted/50">
            Locais Ativos ({companies?.length ?? 0})
            {showLocais ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showLocais && (companies ?? []).filter((c) => filterBySearch(c.name)).map((company) => (
            <div key={company.id} className="flex items-center gap-2 px-4 py-2 hover:bg-muted/30">
              <span className="text-lg">🏪</span>
              <div>
                <p className="text-sm font-medium text-foreground">{company.name}</p>
                <p className="text-xs text-muted-foreground">{company.phone || "—"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
