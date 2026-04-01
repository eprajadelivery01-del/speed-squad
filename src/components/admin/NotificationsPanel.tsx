import { Bell } from "lucide-react";
import { useDeliveries } from "@/services/deliveries";
import { format } from "date-fns";

export function NotificationsPanel() {
  const { data } = useDeliveries({ pageSize: 10 });
  const deliveries = data?.data ?? [];

  const getIcon = (status: string) => {
    switch (status) {
      case "pending": return "📦";
      case "accepted": return "✅";
      case "collecting": return "🏪";
      case "in_transit": return "🏍️";
      case "delivered": return "🎉";
      case "cancelled": return "❌";
      default: return "📦";
    }
  };

  const getTitle = (d: any) => {
    const name = d.companies?.name || "Empresa";
    switch (d.status) {
      case "pending": return `Novo pedido de ${name}`;
      case "accepted": return `Pedido aceito`;
      case "in_transit": return `Entrega em trânsito`;
      case "delivered": return `Entrega finalizada`;
      case "cancelled": return `Entrega cancelada`;
      default: return `Atualização: ${d.status}`;
    }
  };

  return (
    <div className="h-full rounded-2xl bg-card shadow-card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Notificações</h3>
        </div>
        <span className="text-xs text-muted-foreground">{deliveries.length} recentes</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {deliveries.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
          </div>
        ) : (
          deliveries.map((d) => (
            <div key={d.id} className="flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30">
              <span className="text-lg mt-0.5">{getIcon(d.status)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{getTitle(d)}</p>
                <p className="text-xs text-muted-foreground truncate">{d.customer_name} — R$ {Number(d.price ?? 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{format(new Date(d.updated_at), "dd/MM HH:mm")}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
