import { useState, useEffect } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useOccurrences, useReportOccurrence } from "@/services/occurrences";
import { useDeliveries } from "@/services/deliveries";
import { AlertTriangle, Plus, Loader2, FileText, CheckCircle, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { OccurrenceType } from "@/types/models";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function DriverOccurrencesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [selectedDelivery, setSelectedDelivery] = useState<string>("");
  const [occurrenceType, setOccurrenceType] = useState<OccurrenceType>("other");
  const [description, setDescription] = useState("");

  const { data: occurrences, isLoading: loadingOccurrences } = useOccurrences(driverId || undefined);
  const { data: myDeliveries } = useDeliveries({ driverId: driverId || undefined });
  const { mutate: report, isPending: reporting } = useReportOccurrence();

  useEffect(() => {
    if (user) {
      supabase
        .from("delivery_drivers")
        .select("id")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setDriverId(data.id);
        });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId) return;

    report(
      {
        driver_id: driverId,
        delivery_id: selectedDelivery || null,
        type: occurrenceType,
        description,
      },
      {
        onSuccess: () => {
          toast({ title: "Ocorrência enviada!", description: "Nossa equipe analisará o caso." });
          setIsModalOpen(false);
          setDescription("");
          setSelectedDelivery("");
        },
        onError: (err: any) => {
          toast({ title: "Erro", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <DriverLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Ocorrências</h1>
          
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl flex items-center gap-2 gradient-primary shadow-md">
                <Plus className="h-4 w-4" />
                Relatar Problema
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl mx-4">
              <DialogHeader>
                <DialogTitle>Nova Ocorrência</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Entrega Relacionada (opcional)</label>
                  <Select value={selectedDelivery} onValueChange={setSelectedDelivery}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione uma entrega" />
                    </SelectTrigger>
                    <SelectContent>
                      {myDeliveries?.data?.filter((d: any) => d.status !== "delivered" && d.status !== "cancelled").map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{d.customer_name} - {d.address}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Problema</label>
                  <Select value={occurrenceType} onValueChange={(v) => setOccurrenceType(v as OccurrenceType)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Tipo de problema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="motorcycle_issue">Problema Mecânico</SelectItem>
                      <SelectItem value="accident">Acidente</SelectItem>
                      <SelectItem value="robbery">Assalto/Roubo</SelectItem>
                      <SelectItem value="other">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição Detalhada</label>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o que aconteceu..."
                    className="w-full min-h-[100px] p-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                <Button type="submit" disabled={reporting} className="w-full gradient-primary py-6 rounded-2xl text-lg font-bold">
                  {reporting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                  Enviar Relato
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loadingOccurrences ? (
          <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : occurrences?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-card rounded-3xl border-2 border-dashed border-border">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-1">Tudo em ordem!</h3>
            <p className="text-sm text-muted-foreground">Você não tem nenhuma ocorrência registrada.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {occurrences?.map((occ: any) => (
              <div key={occ.id} className="bg-card p-5 rounded-2xl shadow-card border border-border flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-2 rounded-lg",
                      occ.status === "pending" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                    )}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">
                        {occ.type === "motorcycle_issue" ? "Problema Mecânico" : 
                         occ.type === "accident" ? "Acidente" : 
                         occ.type === "robbery" ? "Assalto/Roubo" : "Outro"}
                      </h3>
                      <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(occ.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    occ.status === "pending" ? "bg-warning/10 text-warning border border-warning/20" : "bg-success/10 text-success border border-success/20"
                  )}>
                    {occ.status === "pending" ? "Pendente" : "Resolvido"}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2 italic">"{occ.description}"</p>
                
                {occ.deliveries && (
                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium pt-2 border-t border-border/50">
                    <FileText className="h-3 w-3" />
                    Entrega: {occ.deliveries.customer_name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DriverLayout>
  );
}
