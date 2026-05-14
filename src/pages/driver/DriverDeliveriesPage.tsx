import { useState, useEffect } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useDeliveries, useUpdateDeliveryStatus } from "@/services/deliveries";
import { Truck, MapPin, DollarSign, Package, Play, CheckCircle, AlertCircle, Loader2, Phone, User, X, MessageCircle, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUniqueDeliveries } from "@/hooks/useUniqueDeliveries";

function DeliveryCard({ delivery, onAction, loading }: { delivery: any, onAction: () => void, loading: boolean }) {  
  const [showInfo, setShowInfo] = useState(false);

  const getButtonText = () => {
    switch (delivery.status) {
      case "pending":
      case "broadcasted": return "Aceitar Corrida";
      case "accepted": return "Cheguei no Local";
      case "collecting": return "Iniciar Entrega";
      case "in_transit": return "Concluir Entrega";
      default: return "Finalizar";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "accepted": return "Aceito";
      case "collecting": return "Coletando";
      case "in_transit": return "Em Rota";
      case "delivered": return "Concluído";
      case "cancelled": return "Cancelado";
      default: return status;
    }
  };

  const isDone = delivery.status === "delivered" || delivery.status === "cancelled";

  return (
    <div className="bg-card border-2 border-border rounded-[2.5rem] p-6 shadow-xl hover:border-primary/30 transition-all flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              delivery.status === "in_transit" ? "bg-success animate-pulse" : "bg-primary"
            )} />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {delivery.companies?.name || "Marketplace"}
            </span>
          </div>
          <h2 className="text-xl font-black text-foreground tracking-tight">{delivery.customer_name}</h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          {delivery.value != null && (
            <div className="bg-primary text-white px-3 py-1.5 rounded-xl text-sm font-black tracking-tighter shadow-lg shadow-primary/10 flex items-baseline gap-0.5">
              <span className="text-[9px]">R$</span>
              {Number(delivery.value).toFixed(2).replace(".", ",")}
            </div>
          )}
          <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-full mt-1">
            {getStatusLabel(delivery.status)}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {delivery.pickup_address && (
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Package className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Retirada</span>
              <span className="text-xs font-bold text-foreground leading-snug">{delivery.pickup_address}</span>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-lg bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="h-3.5 w-3.5 text-success" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Entrega</span>
            <span className="text-xs font-bold text-foreground leading-snug">{delivery.dropoff_address || delivery.address}</span>
          </div>
        </div>

        {delivery.notes && (
          <div className="bg-muted/40 p-4 rounded-2xl border border-border/50">
            <div className="flex items-start gap-2">
              <Package className="h-4 w-4 text-primary shrink-0 opacity-50" />
              <p className="text-[11px] font-bold text-muted-foreground leading-tight italic">
                {delivery.notes.includes("[ITENS:") 
                  ? delivery.notes.replace(/\[ITENS:\s*(.*?)\]/g, '$1')
                  : delivery.notes}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Valor a cobrar do cliente - VIP ALERT */}
      {delivery.estimated_value != null && Number(delivery.estimated_value) > 0 && (
        <div className="bg-amber-500 text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest">Cobrar do cliente</span>
          </div>
          <span className="text-xl font-black tracking-tighter">
            R$ {Number(delivery.estimated_value).toFixed(2).replace(".", ",")}
          </span>
        </div>
      )}

      {!isDone && (
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={onAction}
            disabled={loading}
            className={cn(
              "flex-1 h-16 rounded-[1.5rem] flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest transition-all shadow-2xl active:scale-95 disabled:opacity-50",
              delivery.status === "in_transit" 
                ? "bg-success text-white shadow-success/20" 
                : "bg-foreground text-background"
            )}
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ChevronRight className="h-6 w-6" />}
            {getButtonText()}
          </button>
          <button 
            onClick={() => setShowInfo(!showInfo)} 
            className="w-16 h-16 rounded-[1.5rem] border-2 border-border flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-90 transition-all"
          >
            <Phone className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Customer Info Panel - Premium Overlay style */}
      {showInfo && (
        <div className="bg-foreground text-background rounded-3xl p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Contatos Diretos
            </h4>
            <button onClick={() => setShowInfo(false)} className="p-1 rounded-full bg-white/10 text-white/50">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase">Cliente</span>
                <span className="text-sm font-black text-white">{delivery.customer_name || "—"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a href={`tel:${delivery.customer_phone}`} className="h-12 bg-white/10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-white hover:bg-white/20">
                  <Phone className="h-4 w-4" /> Ligar
                </a>
                <a 
                  href={`https://wa.me/55${delivery.customer_phone?.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 bg-[#25D366] rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-white shadow-lg shadow-[#25D366]/20"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </div>
            </div>

            {delivery.companies?.phone && (
              <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white/40 uppercase">Estabelecimento</span>
                  <span className="text-sm font-black text-white">{delivery.companies.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a href={`tel:${delivery.companies.phone}`} className="h-12 bg-white/10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-white hover:bg-white/20">
                    <Phone className="h-4 w-4" /> Ligar
                  </a>
                  <a 
                    href={`https://wa.me/55${delivery.companies.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 bg-primary rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-white shadow-lg shadow-primary/20"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode, title: string, subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-10 text-center bg-muted/30 rounded-[3rem] border-2 border-dashed border-border animate-in fade-in duration-700">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6 text-muted-foreground/30">{icon}</div>
      <h3 className="text-xl font-black text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed font-bold">{subtitle}</p>
    </div>
  );
}

export default function DriverDeliveriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [driverId, setDriverId] = useState<string | null>(null);
  const { mutate: updateStatus, isPending: updating } = useUpdateDeliveryStatus();

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

  const { data: myData, isLoading: loadingDeliveries } = useDeliveries({
    driverId: driverId || undefined,
    enabled: !!driverId,
  });
  const rawMyDeliveries = myData?.data ?? [];
  const myDeliveries = useUniqueDeliveries(rawMyDeliveries);

  const inProgressDeliveries = myDeliveries.filter(d => 
    ["accepted", "collecting", "in_transit"].includes(d.status)
  );

  const agendaDeliveries = myDeliveries.filter(d => 
    ["pending", "broadcasted"].includes(d.status)
  );

  const handleAction = (deliveryId: string, currentStatus: string) => {
    if (!driverId) return;

    let nextStatus: any = "";
    if (currentStatus === "pending" || currentStatus === "broadcasted") nextStatus = "accepted";
    else if (currentStatus === "accepted") nextStatus = "collecting";
    else if (currentStatus === "collecting") nextStatus = "in_transit" as any;
    else if (currentStatus === ("in_transit" as any)) nextStatus = "delivered" as any;

    if (!nextStatus) {
      toast({
        title: "Atenção",
        description: `Não foi possível determinar o próximo passo para o status "${currentStatus}".`,
        variant: "destructive",
      });
      return;
    }

    updateStatus(
      { id: deliveryId, status: nextStatus, driverId },
      {
        onSuccess: () => {
          toast({ title: "✅ Atualizado!", description: "Status alterado com sucesso." });
        },
        onError: (error: any) => {
          toast({ title: "Erro", description: error.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <DriverLayout>
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black text-foreground tracking-tight">Minha Rota</h1>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Gerencie suas entregas ativas e agendadas</p>
        </div>

        <Tabs defaultValue="in-progress" className="w-full">
          <TabsList className="flex bg-muted/50 p-1.5 rounded-[1.5rem] border border-border/50">
            <TabsTrigger value="in-progress" className="flex-1 rounded-2xl font-black text-[10px] uppercase tracking-widest h-11 data-[state=active]:bg-foreground data-[state=active]:text-background transition-all">
              Andamento
              {inProgressDeliveries.length > 0 && (
                <span className="ml-2 bg-primary text-white text-[9px] h-5 w-5 flex items-center justify-center rounded-full">
                  {inProgressDeliveries.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="mine" className="flex-1 rounded-2xl font-black text-[10px] uppercase tracking-widest h-11 data-[state=active]:bg-foreground data-[state=active]:text-background transition-all">
              Agenda
              {agendaDeliveries.length > 0 && (
                <span className="ml-2 bg-muted-foreground/20 text-muted-foreground text-[9px] h-5 w-5 flex items-center justify-center rounded-full">
                  {agendaDeliveries.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="in-progress" className="mt-6 flex flex-col gap-5 outline-none">
            {loadingDeliveries || !driverId ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest">Carregando entregas...</p>
              </div>
            ) : inProgressDeliveries.length === 0 ? (
              <EmptyState
                icon={<Truck className="h-12 w-12" />}
                title="Sem entregas ativas"
                subtitle="Você não tem nenhuma entrega em andamento no momento."
              />
            ) : (
              <div className="grid gap-5">
                {inProgressDeliveries.map((del) => (
                  <DeliveryCard key={del.id} delivery={del} onAction={() => handleAction(del.id, del.status)} loading={updating} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mine" className="mt-6 flex flex-col gap-5 outline-none">
            {loadingDeliveries || !driverId ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest">Consultando agenda...</p>
              </div>
            ) : agendaDeliveries.length === 0 ? (
              <EmptyState 
                icon={<Package className="h-12 w-12" />} 
                title="Agenda Vazia" 
                subtitle="Nenhuma entrega foi direcionada especificamente para você hoje." 
              />
            ) : (
              <div className="grid gap-5">
                {agendaDeliveries.map((del) => (
                  <DeliveryCard key={del.id} delivery={del} onAction={() => handleAction(del.id, del.status)} loading={updating} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DriverLayout>
  );
}

