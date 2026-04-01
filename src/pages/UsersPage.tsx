import { AdminLayout } from "@/components/admin/AdminLayout";

export default function UsersPage() {
  return (
    <AdminLayout title="Usuários" subtitle="Gerenciamento de usuários do sistema">
      <div className="rounded-2xl bg-card p-8 shadow-card text-center">
        <p className="text-muted-foreground">Página de gerenciamento de usuários</p>
      </div>
    </AdminLayout>
  );
}
