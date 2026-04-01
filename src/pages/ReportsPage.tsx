import { AdminLayout } from "@/components/admin/AdminLayout";

export default function ReportsPage() {
  return (
    <AdminLayout title="Financeiro" subtitle="Relatórios financeiros">
      <div className="rounded-2xl bg-card p-8 shadow-card text-center">
        <p className="text-muted-foreground">Página de relatórios financeiros</p>
      </div>
    </AdminLayout>
  );
}
