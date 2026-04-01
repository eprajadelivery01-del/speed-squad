import { AdminLayout } from "@/components/admin/AdminLayout";
import { useCompanies } from "@/services/companies";

export default function CompaniesPage() {
  const { data: companies, isLoading } = useCompanies();

  return (
    <AdminLayout title="Empresas" subtitle="Gerenciamento de empresas parceiras">
      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Endereço</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : (companies ?? []).length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhuma empresa encontrada</td></tr>
              ) : (
                (companies ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{c.phone || "—"}</td>
                    <td className="px-4 py-3">{c.address || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${c.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {c.active ? "Ativa" : "Inativa"}
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
