import { AdminLayout } from "@/components/admin/AdminLayout";
import { useCompanies } from "@/services/companies";
import { EditCompanyDialog } from "@/components/admin/EditCompanyDialog";
import { CreateCompanyDialog } from "@/components/admin/CreateCompanyDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Power, Trash2, Edit2 } from "lucide-react";
import { useState } from "react";
import { GenerateInviteDialog } from "@/components/admin/GenerateInviteDialog";

export default function CompaniesPage() {
  const { data: companies, isLoading } = useCompanies();
  const qc = useQueryClient();
  const [editingCompany, setEditingCompany] = useState<any>(null);

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("companies").update({ active: !active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["companies"] });
    toast.success(active ? "Empresa desativada" : "Empresa ativada");
  };

  const deleteCompany = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta empresa?")) return;
    await supabase.from("companies").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["companies"] });
    toast.success("Empresa excluída");
  };



  return (
    <AdminLayout title="Empresas" subtitle="Gerenciamento de empresas parceiras">
      <div className="flex justify-end gap-3 mb-4">
        <GenerateInviteDialog />
        <CreateCompanyDialog />
      </div>
      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empresa</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Endereço</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : (companies ?? []).length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhuma empresa encontrada</td></tr>
              ) : (
                (companies ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                          {c.logo_url ? <img src={c.logo_url} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-primary">{c.name[0]}</span>}
                        </div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{c.phone || "—"}</td>
                    <td className="px-4 py-3">{c.email || "—"}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{c.address || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${c.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {c.active ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingCompany(c)}>
                            <Edit2 className="h-4 w-4 mr-2" />Editar Informações
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(c.id, !!c.active)}>
                            <Power className="h-4 w-4 mr-2" />{c.active ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteCompany(c.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {editingCompany && (
        <EditCompanyDialog
          company={editingCompany}
          open={!!editingCompany}
          onOpenChange={(open) => !open && setEditingCompany(null)}
        />
      )}
    </AdminLayout>
  );
}
