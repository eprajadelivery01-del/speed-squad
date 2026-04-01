import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Clock, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDrivers } from "@/services/drivers";
import { useToast } from "@/hooks/use-toast";

const typeLabels: Record<string, string> = {
  delay: "Atraso",
  damage: "Dano",
  absence: "Ausência",
  other: "Outro",
};

function useOccurrences() {
  return useQuery({
    queryKey: ["occurrences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_occurrences")
        .select("*, delivery_drivers(id, full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useResolveOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { error } = await supabase
        .from("delivery_occurrences")
        .update({ resolved, resolved_at: resolved ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["occurrences"] }),
  });
}

function useCreateOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (occ: { type: "delay" | "damage" | "absence" | "other"; description: string; driver_id: string; delivery_id: string }) => {
      const { error } = await supabase.from("delivery_occurrences").insert([occ]);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["occurrences"] }),
  });
}

export default function OccurrencesPage() {
  const { data: occurrences, isLoading } = useOccurrences();
  const resolveOcc = useResolveOccurrence();
  const createOcc = useCreateOccurrence();
  const { data: drivers } = useDrivers();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<{ type: "delay" | "damage" | "absence" | "other"; description: string; driver_id: string; delivery_id: string }>({ type: "other", description: "", driver_id: "", delivery_id: "" });

  const handleCreate = async () => {
    if (!form.driver_id || !form.description || !form.delivery_id) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    try {
      await createOcc.mutateAsync({ type: form.type, description: form.description, driver_id: form.driver_id, delivery_id: form.delivery_id });
      toast({ title: "Ocorrência registrada!" });
      setCreateOpen(false);
      setForm({ type: "other", description: "", driver_id: "", delivery_id: "" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const toggleResolved = async (id: string, currentResolved: boolean) => {
    try {
      await resolveOcc.mutateAsync({ id, resolved: !currentResolved });
      toast({ title: `Ocorrência ${!currentResolved ? "resolvida" : "reaberta"}!` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout title="Ocorrências" subtitle="Registro de ocorrências e problemas">
      <div className="flex items-center justify-between mb-4">
        <div />
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Registrar Ocorrência
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {(occurrences ?? []).map((occ: any) => {
            const driverName = occ.delivery_drivers?.full_name || "—";
            return (
              <div key={occ.id} className="rounded-2xl bg-card p-4 shadow-card">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", !occ.resolved ? "bg-destructive/10" : "bg-success/10")}>
                      <AlertTriangle className={cn("h-5 w-5", !occ.resolved ? "text-destructive" : "text-success")} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{typeLabels[occ.type] || occ.type}</span>
                        <button
                          onClick={() => toggleResolved(occ.id, occ.resolved)}
                          disabled={resolveOcc.isPending}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity",
                            !occ.resolved ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                          )}
                        >
                          {!occ.resolved ? <Clock className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                          {!occ.resolved ? "Aberta" : "Resolvida"}
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{occ.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">Entregador: {driverName}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{format(new Date(occ.created_at), "dd/MM/yyyy")}</span>
                </div>
              </div>
            );
          })}
          {(occurrences ?? []).length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mb-2 text-success" />
              <p className="text-sm">Nenhuma ocorrência registrada</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Ocorrência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary">
                <option value="delay">Atraso</option>
                <option value="damage">Dano</option>
                <option value="absence">Ausência</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Entregador *</label>
              <select value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary">
                <option value="">Selecione...</option>
                {(drivers ?? []).map((d) => (
                  <option key={d.id} value={d.id}>{d.full_name || "—"}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ID da Entrega *</label>
              <input
                value={form.delivery_id}
                onChange={(e) => setForm({ ...form, delivery_id: e.target.value })}
                placeholder="ID da entrega..."
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Descrição *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descreva a ocorrência..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCreateOpen(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={handleCreate} disabled={createOcc.isPending} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {createOcc.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Registrar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
