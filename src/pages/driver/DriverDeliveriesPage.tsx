import { useState, useEffect } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useDeliveries, useUpdateDeliveryStatus } from "@/services/deliveries";
import { Truck, MapPin, DollarSign, Package, Play, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function DriverDeliveriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [driverId, setDriverId] = useState<string | null>(null);
  const { mutate: updateStatus, isPending: updating } = useUpdateDeliveryStatus();

  // Get driver record
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

  // Available deliveries (no driver_id)
  const { data: availableData, isLoading: loadingAvailable } = useDeliveries({
    status: ["pending", "broadcasted"],
  });

  // My tasks (assigned to me)
  const { data: myData, isLoading: loadingMy } = useDeliveries({
    driverId: driverId || undefined,
  });

  const handleAction = (deliveryId: string, currentStatus: string) => {
    if (!driverId) return;

    let nextStatus: any = "";
    if (currentStatus === "pending" || currentStatus === "broadcasted") nextStatus = "accepted";
    else if (currentStatus === "accepted") nextStatus = "collecting";
    else if (currentStatus === "collecting") nextStatus = "in_route";
    else if (currentStatus === "in_route") nextStatus = "completed";

    updateStatus(
      { id: deliveryId, status: nextStatus, driverId },
      {
        onSuccess: () => {
          toast({
            title: "Sucesso!",
            description: `Entrega atualizada para ${nextStatus}`,
          });
        },
        onError: (error: any) => {
          toast({
            title: "Erro",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Pendente";
      case "broadcasted": return "Buscando";
      case "accepted": return "Aceito";
      case "collecting": return "Coletando";
      case "in_route": return "Em Rota";
      case "completed": return "Concluído";
      default: return status;
    }
  };

  return (
    <DriverLayout>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Minhas Entregas</h1>

        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available">Disponíveis</TabsTrigger>
            <TabsTrigger value="mine">Minha Agenda</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-4">
            {loadingAvailable ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : availableData?.data.length === 0 ? (
              <EmptyState icon={<Package className="h-10 w-10" />} title="Sem entregas disponíveis" subtitle="Aguarde novas oportunidades aparecerem por aqui." />
            ) : (
              <div className="grid gap-4">
                {availableData?.data.map((del) => (
                  <DeliveryCard key={del.id} delivery={del} onAction={() => handleAction(del.id, del.status)} loading={updating} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mine" className="mt-4">
            {loadingMy ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : myData?.data.filter(d => d.status !== "completed" && d.status !== "cancelled").length === 0 ? (
              <EmptyState icon={<Truck className="h-10 w-10" />} title="Sua agenda está vazia" subtitle="Aceite uma entrega na aba 'Disponíveis' para começar." />
            ) : (
              <div className="grid gap-4">
                {myData?.data.filter(d => d.status !== "completed" && d.status !== "cancelled").map((del) => (
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
  const getButtonText = () => {
    if (delivery.status === "pending" || delivery.status === "broadcasted") return "Aceitar Corrida";
    if (delivery.status === "accepted") return "Cheguei no Local";
    if (delivery.status === "collecting") return "Iniciar Entrega";
    if (delivery.status === "in_route") return "Concluir Entrega";
    return "Finalizar";
  };

  const getButtonIcon = () => {
    if (delivery.status === "pending" || delivery.status === "broadcasted") return <CheckCircle className="h-4 w-4" />;
    if (delivery.status === "accepted") return <Package className="h-4 w-4" />;
    if (delivery.status === "collecting") return <Play className="h-4 w-4" />;
    if (delivery.status === "in_route") return <CheckCircle className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="bg-card rounded-2xl p-5 shadow-card border border-border flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{delivery.companies?.name || "Empresa"}</span>
          <h2 className="text-lg font-bold text-foreground leading-tight">{delivery.customer_name}</h2>
        </div>
        <div className="bg-success/10 text-success px-2 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          {delivery.value.toFixed(2)}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>{delivery.address}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 pt-4 border-t border-border">
        <button
          onClick={onAction}
          disabled={loading}
          className={cn(
            "flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all",
            isAssigned ? "bg-success text-success-foreground" : "gradient-primary text-primary-foreground shadow-md hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : getButtonIcon()}
          {getButtonText()}
        </button>
        {isAssigned && (
          <button className="p-3 rounded-xl border border-border hover:bg-muted text-muted-foreground transition-colors">
            <AlertCircle className="h-5 w-5" />
          </button>
        )}
      </div>
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
