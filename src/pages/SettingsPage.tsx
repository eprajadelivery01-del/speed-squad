import { AdminLayout } from "@/components/admin/AdminLayout";

export default function SettingsPage() {
  return (
    <AdminLayout title="Configurações" subtitle="Configurações do sistema">
      <div className="rounded-2xl bg-card p-8 shadow-card text-center">
        <p className="text-muted-foreground">Página de configurações</p>
      </div>
    </AdminLayout>
  );
}
