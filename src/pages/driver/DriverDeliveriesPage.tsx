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

    updateStatus(
      { id: deliveryId, status: nextStatus, driverId },
      {
        onSuccess: () => {
          toast({ title: "Sucesso!", description: "A entrega foi atualizada com sucesso." });
        },
        onError: (error: any) => {
          toast({ title: "Erro no servidor", description: error.message, variant: "destructive" });
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

  return (
    <div className="bg-card rounded-2xl p-5 shadow-card border border-border flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{delivery.companies?.name || "Empresa"}</span>
          <h2 className="text-lg font-bold text-foreground leading-tight">{delivery.customer_name}</h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          {delivery.value != null && (
            <div className="bg-success/10 text-success px-2 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {Number(delivery.value).toFixed(2)}
            </div>
          )}
          <span className="text-[10px] font-bold text-muted-foreground uppercase">{getStatusLabel(delivery.status)}</span>
        </div>
      </div>

      <div className="space-y-2">
        {delivery.pickup_address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>{delivery.pickup_address}</span>
          </div>
        )}
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>{delivery.dropoff_address || delivery.address}</span>
        </div>

        {delivery.notes && (
          <div className={cn(
            "p-3 rounded-xl border border-border text-sm leading-relaxed",
            delivery.notes.includes("[ITENS:") ? "bg-primary/5 border-primary/20" : "bg-muted/30"
          )}>
            <div className="flex items-start gap-2">
              <Package className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                {delivery.notes.includes("[ITENS:") ? (
                  <>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Itens do Pedido</p>
                    <p className="font-bold text-foreground">{delivery.notes.replace(/\[ITENS:\s*(.*?)\]/g, '$1')}</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">{delivery.notes}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Valor a cobrar do cliente */}
      {delivery.estimated_value != null && Number(delivery.estimated_value) > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-bold text-amber-700 dark:text-amber-400">Cobrar do cliente</span>
          </div>
          <span className="text-lg font-extrabold text-amber-700 dark:text-amber-400">
            R$ {Number(delivery.estimated_value).toFixed(2)}
          </span>
        </div>
      )}

      {!isDone && (
        <div className="flex items-center gap-2 mt-2 pt-4 border-t border-border">
          <button
            onClick={onAction}
            disabled={loading}
            className={cn(
              "flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all",
              "bg-success text-success-foreground"
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : getButtonIcon()}
            {getButtonText()}
          </button>

          {delivery.customer_phone && (
            <a
              href={`https://wa.me/55${delivery.customer_phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-[#25D366] text-white hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center shrink-0"
              title="Chamar Cliente no WhatsApp"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.588 1.978 14.12 .951 11.5 .951c-5.442 0-9.866 4.372-9.87 9.802 0 1.714.46 3.393 1.332 4.888L1.97 22.012l6.096-1.597h-.002zm11.366-7.46c-.328-.164-1.944-.959-2.242-1.068-.298-.11-.515-.164-.73.164-.216.329-.838 1.068-1.027 1.287-.19.219-.38.246-.708.082-1.344-.672-2.316-1.171-3.114-2.54-.21-.362.21-.336.6-.112.35.201.402.242.493.425.09.182.046.343-.021.48-.069.137-.588 1.41-.806 1.946-.212.524-.426.452-.588.461-.137.008-.296.01-.454.01-.158 0-.417.06-.635.297-.218.238-.83 1.097-.83 2.675 0 1.579 1.148 3.1 1.307 3.31.158.21 2.26 3.45 5.474 4.839.764.33 1.36.527 1.824.675.768.243 1.467.209 2.02.127.616-.093 1.944-.795 2.217-1.562.272-.767.272-1.423.19-1.562-.081-.137-.298-.219-.626-.383z"/>
              </svg>
            </a>
          )}

          <button onClick={() => setShowInfo(!showInfo)} className="p-3 rounded-xl border border-border hover:bg-muted text-muted-foreground transition-colors">
            <AlertCircle className="h-5 w-5" />
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
