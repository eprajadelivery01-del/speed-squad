import { AdminLayout } from "@/components/admin/AdminLayout";
import { useDeliveries } from "@/services/deliveries";
import { DeliveryStatusBadge } from "@/components/admin/DeliveryStatusBadge";
import { format } from "date-fns";

export default function DeliveriesPage() {
  const { data, isLoading } = useDeliveries();
  const deliveries = data?.data ?? [];

  return (
    <AdminLayout title="Corridas (OS)" subtitle="Gerenciamento de entregas">
      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empresa</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : deliveries.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhuma entrega encontrada</td></tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={d.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{d.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">{d.customer_name}</td>
                    <td className="px-4 py-3">{d.companies?.name || "—"}</td>
                    <td className="px-4 py-3 font-medium">R$ {Number(d.value).toFixed(2)}</td>
                    <td className="px-4 py-3"><DeliveryStatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(d.created_at), "dd/MM/yyyy HH:mm")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
