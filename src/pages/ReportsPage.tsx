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
  const { data, isLoading } = useDeliveries({
    status: statusFilter,
    companyId: companyFilter || undefined,
    driverId: driverFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    pageSize: 1000,
  });

  const deliveries = data?.data ?? [];
  const totalPrice = deliveries.reduce((s, d) => s + Number(d.price ?? 0), 0);
  const deliveredCount = deliveries.filter((d) => d.status === "delivered").length;

  const handleExport = () => {
    if (deliveries.length === 0) {
      toast({ title: "Nenhum dado para exportar", variant: "destructive" });
      return;
    }
    const headers = ["Data", "Cliente", "Empresa", "Destino", "Status", "Valor"];
    const rows = deliveries.map((d) => [
      format(new Date(d.created_at), "dd/MM/yyyy HH:mm"),
      d.customer_name || "",
      d.companies?.name || "",
      d.dropoff_address,
      d.status,
      Number(d.price ?? 0).toFixed(2),
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
    <AdminLayout title="Financeiro" subtitle="Relatórios financeiros">
      <div className="rounded-2xl bg-card p-4 shadow-card mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Filtros</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Data início</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Data fim</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Empresa</label>
            <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none">
              <option value="">Todas</option>
              {(companies ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Entregador</label>
            <select value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none">
              <option value="">Todos</option>
              {(drivers ?? []).map((d) => <option key={d.id} value={d.id}>{d.full_name || "—"}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none">
              <option value="all">Todos</option>
              <option value="delivered">Entregues</option>
              <option value="cancelled">Canceladas</option>
              <option value="pending">Pendentes</option>
              <option value="in_transit">Em Trânsito</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <SummaryCard label="Total Entregas" value={deliveries.length} icon={<BarChart3 className="h-5 w-5 text-primary" />} />
        <SummaryCard label="Entregues" value={deliveredCount} icon={<BarChart3 className="h-5 w-5 text-success" />} />
        <SummaryCard label="Faturamento" value={`R$ ${totalPrice.toFixed(2)}`} icon={<BarChart3 className="h-5 w-5 text-info" />} />
      </div>

      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm text-muted-foreground">{deliveries.length} registros</span>
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empresa</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Valor</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.slice(0, 50).map((d) => (
                  <tr key={d.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(d.created_at), "dd/MM HH:mm")}</td>
                    <td className="px-4 py-3">{d.customer_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.companies?.name || "—"}</td>
                    <td className="px-4 py-3"><StatusDot status={d.status} /></td>
                    <td className="px-4 py-3 font-medium">R$ {Number(d.price ?? 0).toFixed(2)}</td>
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
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-warning", accepted: "bg-info",
    collecting: "bg-accent", in_transit: "bg-primary", delivered: "bg-success", cancelled: "bg-destructive",
  };
  const labels: Record<string, string> = {
    pending: "Pendente", accepted: "Aceita",
    collecting: "Coletando", in_transit: "Em Trânsito", delivered: "Entregue", cancelled: "Cancelada",
  };
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className={`h-2 w-2 rounded-full ${colors[status] || "bg-muted"}`} />
      {labels[status] || status}
    </span>
  );
}
