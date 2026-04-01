import { AdminLayout } from "@/components/admin/AdminLayout";

export default function ReviewsPage() {
  return (
    <AdminLayout title="Avaliações" subtitle="Avaliações de entregas">
      <div className="rounded-2xl bg-card p-8 shadow-card text-center">
        <p className="text-muted-foreground">Página de avaliações</p>
      </div>
    </AdminLayout>
  );
}
