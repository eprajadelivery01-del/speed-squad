import { AdminLayout } from "@/components/admin/AdminLayout";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { useDrivers } from "@/services/drivers";
import { useCompanies } from "@/services/companies";
import { useProfiles } from "@/services/users";
import { useState } from "react";
import { Users, Building2, Bike, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "all" | "drivers" | "companies";

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>("all");
  const { data: drivers, isLoading: loadingDrivers } = useDrivers();
  const { data: companies, isLoading: loadingCompanies } = useCompanies();
  const { data: profiles, isLoading: loadingProfiles } = useProfiles();

  return (
    <AdminLayout title="Usuários" subtitle="Gerenciamento de usuários do sistema">
      <div className="space-y-4">
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {([
            { key: "all" as const, icon: Users, label: "Todos" },
            { key: "drivers" as const, icon: Bike, label: "Entregadores" },
            { key: "companies" as const, icon: Building2, label: "Empresas" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                tab === t.key ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "all" && (
          loadingProfiles ? <LoadingGrid /> : (
            <div className="rounded-2xl bg-card shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Telefone</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(profiles ?? []).map((p) => (
                      <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{p.full_name || "—"}</td>
                        <td className="px-4 py-3">{p.phone || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary">
                            {p.role || "customer"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(profiles ?? []).length === 0 && <EmptyState text="Nenhum usuário encontrado" />}
            </div>
          )
        )}

        {tab === "drivers" && (
          loadingDrivers ? <LoadingGrid /> : (
            <div className="grid gap-3">
              {(drivers ?? []).map((driver) => (
                <div key={driver.id} className="rounded-2xl bg-card p-4 shadow-card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {driver.avatar_url ? (
                          <img src={driver.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-primary">
                            {(driver.full_name || "?").split(" ").map(n => n[0]).join("")}
                          </span>
                        )}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${driver.online ? "bg-success" : "bg-muted-foreground/30"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{driver.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{driver.phone || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{driver.vehicle_type || "—"}</span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-warning" /> {Number(driver.rating).toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
              {(drivers ?? []).length === 0 && <EmptyState text="Nenhum entregador cadastrado" />}
            </div>
          )
        )}

        {tab === "companies" && (
          loadingCompanies ? <LoadingGrid /> : (
            <div className="grid gap-3">
              {(companies ?? []).map((company) => (
                <div key={company.id} className="rounded-2xl bg-card p-4 shadow-card">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{company.name}</p>
                      <p className="text-xs text-muted-foreground">{company.phone || "—"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{company.address || "—"}</p>
                </div>
              ))}
              {(companies ?? []).length === 0 && <EmptyState text="Nenhuma empresa cadastrada" />}
            </div>
          )
        )}
      </div>
    </AdminLayout>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-card p-4 shadow-card animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Users className="h-8 w-8 mb-2" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
