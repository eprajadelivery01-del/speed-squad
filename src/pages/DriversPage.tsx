import { AdminLayout } from "@/components/admin/AdminLayout";
import { useDrivers } from "@/services/drivers";

export default function DriversPage() {
  const { data: drivers, isLoading } = useDrivers();

  return (
    <AdminLayout title="Entregadores" subtitle="Gerenciamento de motoboys">
      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Veículo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Placa</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rating</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : (drivers ?? []).length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum entregador encontrado</td></tr>
              ) : (
                (drivers ?? []).map((d) => (
                  <tr key={d.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{d.profiles?.full_name || "—"}</td>
                    <td className="px-4 py-3">{d.vehicle}</td>
                    <td className="px-4 py-3">{d.plate || "—"}</td>
                    <td className="px-4 py-3">⭐ {Number(d.rating).toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${d.is_online ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {d.is_online ? "Online" : "Offline"}
                      </span>
                    </td>
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
