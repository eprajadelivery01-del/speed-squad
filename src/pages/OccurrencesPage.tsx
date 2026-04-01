import { AdminLayout } from "@/components/admin/AdminLayout";

export default function OccurrencesPage() {
  return (
    <AdminLayout title="Ocorrências" subtitle="Registro de ocorrências e problemas">
      <div className="rounded-2xl bg-card p-8 shadow-card text-center">
        <p className="text-muted-foreground">Página de ocorrências</p>
      </div>
    </AdminLayout>
  );
}
