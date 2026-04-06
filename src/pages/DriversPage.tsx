import { AdminLayout } from "@/components/admin/AdminLayout";
import { useDrivers } from "@/services/drivers";
import { EditDriverDialog } from "@/components/admin/EditDriverDialog";
import { CreateDriverDialog } from "@/components/admin/CreateDriverDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Power, Trash2, UserCheck, UserX, Edit2 } from "lucide-react";
import { useState } from "react";

export default function DriversPage() {
  const { data: drivers, isLoading } = useDrivers();
  const qc = useQueryClient();
  const [editingDriver, setEditingDriver] = useState<any>(null);

  const toggleOnline = async (id: string, online: boolean) => {
    await supabase.from("delivery_drivers").update({ online: !online } as any).eq("id", id);
    qc.invalidateQueries({ queryKey: ["drivers"] });
    toast.success(online ? "Entregador ficou offline" : "Entregador ficou online");
  };

  const toggleStatus = async (id: string, status: string) => {
    const newStatus = status === "active" ? "suspended" : "active";
    await supabase.from("delivery_drivers").update({ status: newStatus } as any).eq("id", id);
    qc.invalidateQueries({ queryKey: ["drivers"] });
    toast.success(newStatus === "active" ? "Entregador ativado" : "Entregador suspenso");
  };

  const deleteDriver = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este entregador?")) return;
    await supabase.from("delivery_drivers").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["drivers"] });
    toast.success("Entregador excluído");
  };

  const vehicleLabel: Record<string, string> = {
    motorcycle: "🏍️ Moto", bicycle: "🚲 Bicicleta", car: "🚗 Carro", van: "🚐 Van", truck: "🚛 Caminhão",
  };

import { GenerateInviteDialog } from "@/components/admin/GenerateInviteDialog";

export default function DriversPage() {
  const { data: drivers, isLoading } = useDrivers();
  const qc = useQueryClient();
  const [editingDriver, setEditingDriver] = useState<any>(null);

  return (
    <AdminLayout title="Entregadores" subtitle="Gerenciamento de motoboys">
      <div className="flex justify-end gap-3 mb-4">
        <GenerateInviteDialog />
        <CreateDriverDialog />
      </div>
      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entregador</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Veículo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Placa</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rating</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Online</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : (drivers ?? []).length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhum entregador encontrado</td></tr>
              ) : (
                (drivers ?? []).map((d) => (
                  <tr key={d.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {d.avatar_url ? <img src={d.avatar_url} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-primary">{(d.full_name || "?")[0]}</span>}
                        </div>
                        <span className="font-medium">{d.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{vehicleLabel[d.vehicle_type || "motorcycle"] || d.vehicle_type}</td>
                    <td className="px-4 py-3 font-mono text-xs">{d.vehicle_plate || "—"}</td>
                    <td className="px-4 py-3">{d.phone || "—"}</td>
                    <td className="px-4 py-3">⭐ {Number(d.rating).toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${d.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {d.status === "active" ? "Ativo" : d.status === "suspended" ? "Suspenso" : d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${d.online ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        <span className={`w-2 h-2 rounded-full ${d.online ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
                        {d.online ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingDriver(d)}>
                            <Edit2 className="h-4 w-4 mr-2" />Editar Informações
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleOnline(d.id, !!d.online)}>
                            <Power className="h-4 w-4 mr-2" />{d.online ? "Colocar Offline" : "Colocar Online"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(d.id, d.status || "active")}>
                            {d.status === "active" ? <><UserX className="h-4 w-4 mr-2" />Suspender</> : <><UserCheck className="h-4 w-4 mr-2" />Ativar</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteDriver(d.id)}>
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
      {editingDriver && (
        <EditDriverDialog
          driver={editingDriver}
          open={!!editingDriver}
          onOpenChange={(open) => !open && setEditingDriver(null)}
        />
      )}
    </AdminLayout>
  );
}
