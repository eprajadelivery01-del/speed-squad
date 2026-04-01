import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatsCard } from "@/components/admin/StatsCard";
import { useDeliveryStats } from "@/services/deliveries";
import { useOnlineDrivers } from "@/services/drivers";
import { Truck, Package, CheckCircle, XCircle, DollarSign, Bike } from "lucide-react";

export default function DashboardPage() {
  const { data: stats } = useDeliveryStats();
  const { data: onlineDrivers } = useOnlineDrivers();

  return (
    <AdminLayout title="Dashboard" subtitle="Visão geral do sistema">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Corridas Hoje"
          value={stats?.total ?? 0}
          icon={<Package className="h-5 w-5 text-primary" />}
          iconBg="bg-primary/10"
        />
        <StatsCard
          title="Em Rota"
          value={stats?.inRoute ?? 0}
          icon={<Truck className="h-5 w-5 text-info" />}
          iconBg="bg-info/10"
        />
        <StatsCard
          title="Finalizadas"
          value={stats?.completed ?? 0}
          icon={<CheckCircle className="h-5 w-5 text-success" />}
          iconBg="bg-success/10"
        />
        <StatsCard
          title="Canceladas"
          value={stats?.cancelled ?? 0}
          icon={<XCircle className="h-5 w-5 text-destructive" />}
          iconBg="bg-destructive/10"
        />
        <StatsCard
          title="Faturamento Hoje"
          value={`R$ ${(stats?.revenue ?? 0).toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5 text-success" />}
          iconBg="bg-success/10"
        />
        <StatsCard
          title="Motoboys Online"
          value={onlineDrivers?.length ?? 0}
          icon={<Bike className="h-5 w-5 text-accent" />}
          iconBg="bg-accent/10"
        />
      </div>
    </AdminLayout>
  );
}
