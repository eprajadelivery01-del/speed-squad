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
import { useAudioAlert } from "@/hooks/useAudioAlert";
import { translateDeliveryError } from "@/lib/errorMessages";

export default function DriverDeliveriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [driverId, setDriverId] = useState<string | null>(null);
  const { mutate: updateStatus, isPending: updating } = useUpdateDeliveryStatus();
  const { stopAlert } = useAudioAlert();

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

  // Filter "Andamento": accepted and being worked on
  const inProgressDeliveries = myDeliveries.filter(d => 
    ["accepted", "collecting", "in_transit"].includes(d.status)
  );

  // Filter "Minha Agenda": assigned directly (pending/broadcasted) but not yet accepted
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

    if (nextStatus === "accepted") {
      stopAlert();
    }

    updateStatus(
      { id: deliveryId, status: nextStatus, driverId },
      {
        onSuccess: () => {
          toast({ title: "✅ Atualizado!", description: "Entrega atualizada com sucesso." });
        },
        onError: (error: any) => {
          const { title, description } = translateDeliveryError(
            error,
            nextStatus === "accepted" ? "accept" : "update"
          );
          toast({ title, description, variant: "destructive" });
        },
      }
    );
  };

  // We no longer need this separate filter here as we merged them above

  return (
    <DriverLayout>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Minhas Entregas</h1>

        <Tabs defaultValue="in-progress" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="in-progress">
              Andamento
              {inProgressDeliveries.length > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {inProgressDeliveries.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="mine">
              Minha Agenda
              {agendaDeliveries.length > 0 && (
                <span className="ml-1.5 bg-muted-foreground/20 text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {agendaDeliveries.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Andamento: deliveries in progress (accepted by driver) */}
          <TabsContent value="in-progress" className="mt-4">
            {loadingDeliveries || !driverId ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : inProgressDeliveries.length === 0 ? (
              <EmptyState
                icon={<Truck className="h-10 w-10" />}
                title="Nenhuma entrega em andamento"
                subtitle="Aceite corridas na agenda ou na tela inicial para vê-las aqui."
              />
            ) : (
              <div className="grid gap-4">
                {inProgressDeliveries.map((del) => (
                  <DeliveryCard key={del.id} delivery={del} onAction={() => handleAction(del.id, del.status)} loading={updating} isAssigned />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Minha Agenda: direct assignments */}
          <TabsContent value="mine" className="mt-4">
            {loadingDeliveries || !driverId ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : agendaDeliveries.length === 0 ? (
              <EmptyState icon={<Package className="h-10 w-10" />} title="Sua agenda está vazia" subtitle="Entregas direcionadas a você aparecerão aqui." />
            ) : (
              <div className="grid gap-4">
                {agendaDeliveries.map((del) => (
                  <DeliveryCard key={del.id} delivery={del} onAction={() => handleAction(del.id, del.status)} loading={updating} isAssigned />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      {/* ── BONASOFT Watermark ── */}
      <div className="mt-16 pb-8 text-center opacity-40 select-none pointer-events-none">
        <p className="text-[11px] font-black uppercase tracking-[0.6em] text-muted-foreground ml-2">BONASOFT</p>
      </div>
    </DriverLayout>
  );
}

function DeliveryCard({ delivery, onAction, loading, isAssigned }: { delivery: any, onAction: () => void, loading: boolean, isAssigned?: boolean }) {  
  const [showInfo, setShowInfo] = useState(false);

  const getButtonText = () => {
    switch (delivery.status) {
      case "pending":
      case "broadcasted": return "Aceitar Corrida";
      case "accepted": return "Cheguei no Local";
      case "collecting": return "Iniciar Entrega";
      case "in_transit": return "Concluir Entrega";
      case "delivered": return "Concluído";
      case "cancelled": return "Cancelado";
      default: return "Finalizar";
    }
  };

  const getButtonIcon = () => {
    switch (delivery.status) {
      case "pending":
      case "broadcasted": return <CheckCircle className="h-4 w-4" />;
      case "accepted": return <Package className="h-4 w-4" />;
      case "collecting": return <Play className="h-4 w-4" />;
      case "in_transit": return <CheckCircle className="h-4 w-4" />;
      default: return null;
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

  const hasPago = delivery.notes?.includes("[PAGO]");
  const hasReceber = delivery.notes?.includes("[RECEBER:");
  const paymentBadge = hasPago ? "✅ PAGO" : hasReceber ? delivery.notes.match(/\[RECEBER:.*?\]/)?.[0] : null;
  
  let cleanNotes = delivery.notes || "";
  if (hasPago) cleanNotes = cleanNotes.replace("[PAGO]", "").trim();
  if (hasReceber) cleanNotes = cleanNotes.replace(/\[RECEBER:.*?\]/, "").trim();
  
  const isProducts = cleanNotes.includes("[PRODUTOS]") || cleanNotes.includes("[ITENS:");
  if (isProducts) {
    cleanNotes = cleanNotes.replace("[PRODUTOS]", "").replace(/\[ITENS:.*?\]/, "").trim();
  }

  return (
    <div className="relative bg-card/60 backdrop-blur-xl rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/20 dark:border-white/10 flex flex-col gap-5 overflow-hidden group">
      {/* Background glow effect */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-[50px] pointer-events-none group-hover:bg-primary/30 transition-colors duration-500" />
      
      {/* Header: Store and Value */}
      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg">
              {getStatusLabel(delivery.status)}
            </span>
            {paymentBadge && (
              <span className={cn(
                "px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg",
                hasPago ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              )}>
                {paymentBadge.replace(/[\[\]]/g, "")}
              </span>
            )}
          </div>
          <h4 className="text-xl font-extrabold text-foreground tracking-tight mt-1">{delivery.companies?.name || "Loja Parceira"}</h4>
          <p className="text-sm font-medium text-muted-foreground">{delivery.customer_name}</p>
        </div>
        
        {(delivery.price != null || delivery.value != null) && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Ganhos</span>
            <div className="text-2xl font-black text-success tracking-tighter">
              <span className="text-sm mr-0.5">R$</span>{Number(delivery.price || delivery.value || 0).toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Route Timeline */}
      <div className="relative flex flex-col gap-4 pl-3 py-1 z-10">
        <div className="absolute left-[17px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-foreground/20 rounded-full" />
        
        {/* Pickup */}
        <div className="flex items-start gap-4">
          <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_0_4px_rgba(var(--primary),0.2)] mt-1.5 relative z-10" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Coleta</span>
            <span className="text-sm font-semibold text-foreground mt-0.5">{delivery.pickup_address || "Retirada na loja"}</span>
          </div>
        </div>
        
        {/* Dropoff */}
        <div className="flex items-start gap-4">
          <div className="w-3 h-3 rounded-full bg-foreground border-2 border-background shadow-[0_0_0_2px_rgba(var(--foreground),0.2)] mt-1.5 relative z-10" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entrega</span>
            <span className="text-sm font-semibold text-foreground mt-0.5">{delivery.dropoff_address || delivery.address}</span>
          </div>
        </div>
      </div>

      {/* Order Details/Products */}
      {cleanNotes && (
        <div className={cn(
          "relative p-3.5 rounded-2xl border z-10 overflow-hidden",
          isProducts ? "bg-primary/5 border-primary/20" : "bg-muted/40 border-border/50"
        )}>
          <div className="flex items-start gap-3 relative z-10">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              isProducts ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground shadow-sm"
            )}>
              <Package className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              {isProducts ? (
                <>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Conteúdo do Pedido</p>
                  <p className="text-xs font-semibold text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {cleanNotes}
                  </p>
                </>
              ) : (
                <p className="text-xs font-medium text-muted-foreground leading-relaxed italic">
                  "{cleanNotes}"
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Valor a cobrar do cliente */}
      {delivery.estimated_value != null && Number(delivery.estimated_value) > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Cobrar do cliente</span>
          </div>
          <span className="text-xl font-black text-amber-700 dark:text-amber-400">
            <span className="text-sm mr-0.5">R$</span>{Number(delivery.estimated_value).toFixed(2)}
          </span>
        </div>
      )}

      {!isDone && (
        <div className="flex items-center gap-2 mt-2 z-10">
          <button
            onClick={onAction}
            disabled={loading}
            className="relative flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-base text-white shadow-[0_8px_20px_rgba(var(--primary),0.3)] hover:shadow-[0_10px_25px_rgba(var(--primary),0.4)] hover:-translate-y-0.5 active:translate-y-0.5 transition-all overflow-hidden group/btn"
          >
            <div className={cn(
              "absolute inset-0 bg-gradient-to-r",
              delivery.status === "pending" || delivery.status === "broadcasted" 
                ? "from-primary to-[#ff4713]"
                : "from-success to-emerald-600"
            )} />
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
            
            <div className="relative flex items-center gap-2">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : getButtonIcon()}
              {getButtonText()}
            </div>
          </button>

          {delivery.customer_phone && (
            <a
              href={`https://wa.me/55${delivery.customer_phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-14 w-14 rounded-2xl bg-[#25D366] text-white hover:scale-105 active:scale-95 transition-all shadow-[0_8px_20px_rgba(37,211,102,0.3)] flex items-center justify-center shrink-0"
              title="Chamar Cliente no WhatsApp"
            >
              <MessageCircle className="h-6 w-6 text-white" />
            </a>
          )}

          <button onClick={() => setShowInfo(!showInfo)} className="h-14 w-14 rounded-2xl border-2 border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center justify-center shrink-0">
            <AlertCircle className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Customer Info Panel */}
      {showInfo && (
        <div className="bg-muted/50 rounded-xl p-4 flex flex-col gap-3 border border-border animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-primary" /> Contato
            </h4>
            <button onClick={() => setShowInfo(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-semibold text-foreground">{delivery.customer_name || "—"}</span>
            </div>

            {delivery.customer_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a href={`tel:${delivery.customer_phone}`} className="text-primary font-semibold underline">
                  {delivery.customer_phone}
                </a>
              </div>
            )}

            {delivery.customer_phone && (
              <a
                href={`https://wa.me/55${delivery.customer_phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#25D366]/10 text-[#25D366] font-bold text-sm px-3 py-2.5 rounded-xl hover:bg-[#25D366]/20 transition-colors w-full justify-center"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp do Cliente
              </a>
            )}

            {delivery.companies?.phone && (
              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-xs">Loja: </span>
                <a href={`tel:${delivery.companies.phone}`} className="text-primary font-semibold underline text-sm">
                  {delivery.companies.phone}
                </a>
              </div>
            )}

            {delivery.companies?.phone && (
              <a
                href={`https://wa.me/55${delivery.companies.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#25D366]/10 text-[#25D366] font-bold text-sm px-3 py-2.5 rounded-xl hover:bg-[#25D366]/20 transition-colors w-full justify-center"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp da Loja
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode, title: string, subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-card rounded-2xl border-2 border-dashed border-border">
      <div className="text-muted-foreground mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[240px]">{subtitle}</p>
    </div>
  );
}
