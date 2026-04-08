import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useDeliveries } from "@/services/deliveries";
import { useCompanies } from "@/services/companies";
import { useDrivers } from "@/services/drivers";
import { BarChart3, Download, Loader2, Filter } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function ReportsPage() {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: companies } = useCompanies();
  const { data: drivers } = useDrivers();
  const { data: data, isLoading } = useDeliveries({
    status: statusFilter,
    companyId: companyFilter || undefined,
    driverId: driverFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    pageSize: 1000,
  });

  const deliveries = data?.data ?? [];
  const totalValue = deliveries.reduce((s, d) => s + Number(d.value ?? 0), 0);
  const totalCommission = deliveries.reduce((s, d) => s + Number((d as any).commission ?? 0), 0);
  const completedCount = deliveries.filter((d) => d.status === "completed").length;

  const handleExport = () => {
    if (deliveries.length === 0) {
      toast({ title: "Nenhum dado para exportar", variant: "destructive" });
      return;
    }
    const headers = ["Data", "Cliente", "Empresa", "Endereço", "Status", "Valor", "Comissão"];
    const rows = deliveries.map((d) => [
      format(new Date(d.created_at), "dd/MM/yyyy HH:mm"),
      d.customer_name,
      (d as any).companies?.name || "",
      d.address,
      d.status,
      Number(d.value ?? 0).toFixed(2),
      Number((d as any).commission ?? 0).toFixed(2),
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Relatório exportado!" });
  };

  return (
    <AdminLayout title="Financeiro / Relatórios" subtitle="Análise de dados e exportação">
      {/* Filters */}
      <div className="bg-card rounded-xl p-4 shadow-card border border-border mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Data início</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Data fim</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Empresa</label>
            <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none">
              <option value="">Todas</option>
              {(companies ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Entregador</label>
            <select value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none">
              <option value="">Todos</option>
              {(drivers ?? []).map((d) => <option key={d.id} value={d.id}>{d.profiles?.full_name || "—"}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none">
              <option value="all">Todos</option>
              <option value="completed">Finalizadas</option>
              <option value="cancelled">Canceladas</option>
              <option value="pending">Pendentes</option>
              <option value="in_route">Em Rota</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total de Corridas" value={deliveries.length} icon={<BarChart3 className="h-5 w-5 text-primary" />} />
        <SummaryCard label="Finalizadas" value={completedCount} icon={<BarChart3 className="h-5 w-5 text-success" />} />
        <SummaryCard label="Valor Total" value={`R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={<BarChart3 className="h-5 w-5 text-info" />} />
        <SummaryCard label="Comissões" value={`R$ ${totalCommission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={<BarChart3 className="h-5 w-5 text-warning" />} />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="text-sm font-semibold text-foreground">{deliveries.length} registros</span>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3">Data</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden md:table-cell">Empresa</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3">Status</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground p-3">Valor</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground p-3">Comissão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deliveries.slice(0, 50).map((d) => (
                  <tr key={d.id} className="hover:bg-muted/30">
                    <td className="p-3 text-xs text-muted-foreground">{format(new Date(d.created_at), "dd/MM HH:mm")}</td>
                    <td className="p-3 text-sm text-foreground">{d.customer_name}</td>
                    <td className="p-3">{(d as any).companies?.name || "—"}</td>
                    <td className="p-3"><StatusDot status={d.status} /></td>
                    <td className="p-3 text-sm text-foreground text-right font-semibold">R$ {Number(d.value ?? 0).toFixed(2)}</td>
                    <td className="p-3 text-sm text-muted-foreground text-right">R$ {Number((d as any).commission ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl p-4 shadow-card border border-border">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">{icon}</div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
          <p className="text-lg font-display font-extrabold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-warning",
    broadcasted: "bg-info",
    accepted: "bg-info",
    collecting: "bg-accent",
    in_route: "bg-primary",
    completed: "bg-success",
    cancelled: "bg-destructive",
  };
  const labels: Record<string, string> = {
    pending: "Pendente",
    broadcasted: "Enviada",
    accepted: "Aceita",
    collecting: "Coletando",
    in_route: "Em Rota",
    completed: "Finalizada",
    cancelled: "Cancelada",
  };
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
      <span className={`w-2 h-2 rounded-full ${colors[status] || "bg-muted"}`} />
      {labels[status] || status}
    </span>
  );
}
