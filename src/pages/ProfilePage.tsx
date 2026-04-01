import { AdminLayout } from "@/components/admin/AdminLayout";

export default function ProfilePage() {
  return (
    <AdminLayout title="Perfil" subtitle="Seu perfil">
      <div className="rounded-2xl bg-card p-8 shadow-card text-center">
        <p className="text-muted-foreground">Página de perfil</p>
      </div>
    </AdminLayout>
  );
}
