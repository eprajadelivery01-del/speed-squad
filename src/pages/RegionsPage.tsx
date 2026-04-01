import { AdminLayout } from "@/components/admin/AdminLayout";

export default function RegionsPage() {
  return (
    <AdminLayout title="Regiões" subtitle="Gerenciamento de regiões de entrega">
      <div className="rounded-2xl bg-card p-8 shadow-card text-center">
        <p className="text-muted-foreground">Página de gerenciamento de regiões</p>
      </div>
    </AdminLayout>
  );
}
