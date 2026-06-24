import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface IncomingOrderScreenProps {
  delivery: any;
  onAccept: (deliveryId: string) => void;
  onReject: (deliveryId: string) => void;
}

export function IncomingOrderScreen({ delivery, onAccept, onReject }: IncomingOrderScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    setSecondsLeft(30);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          onReject(delivery.id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [delivery?.id, onReject]);

  if (!delivery) return null;

  const pickup =
    delivery.pickup_address || delivery.origin_address || delivery.store_address || "Retirada na loja";
  const dropoff =
    delivery.delivery_address || delivery.dropoff_address || delivery.address || "Endereço do cliente";
  const value = Number(delivery.value) || Number(delivery.price) || Number(delivery.total_value) || 0;
  const storeName = delivery.companies?.name || "Loja Parceira";

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-card border border-white/20 dark:border-white/10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden flex flex-col relative">
        
        {/* Header Orange */}
        <div className="bg-primary text-primary-foreground p-4 flex justify-between items-center relative">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest bg-white/20 px-2 py-1 rounded-md">
              Nova Corrida
            </span>
          </div>
          <button onClick={() => onReject(delivery.id)} className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Store Name and Earnings */}
          <div className="flex justify-between items-start">
            <h4 className="text-2xl font-extrabold text-foreground tracking-tight">{storeName}</h4>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Ganhos</span>
              <div className="text-2xl font-black text-success tracking-tighter">
                <span className="text-sm mr-0.5">R$</span>{Number(value).toFixed(2).replace(".", ",")}
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_0_4px_rgba(var(--primary),0.2)] mt-1.5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Coleta</span>
                <span className="text-sm font-semibold text-foreground mt-0.5 leading-tight">{pickup}</span>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 rounded-full bg-destructive shadow-[0_0_0_4px_rgba(var(--destructive),0.2)] mt-1.5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-destructive">Entrega</span>
                <span className="text-sm font-semibold text-foreground mt-0.5 leading-tight">{dropoff}</span>
              </div>
            </div>
          </div>

          {/* Countdown */}
          <div className="text-center text-xs text-muted-foreground font-medium mt-2">
            Expira em <span className="text-foreground font-bold">{secondsLeft}s</span>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onReject(delivery.id)}
              className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground font-bold h-14 rounded-xl"
            >
              <X className="w-5 h-5" />
              RECUSAR
            </Button>
            <Button 
              size="lg" 
              onClick={() => onAccept(delivery.id)} 
              className="gap-2 bg-success hover:bg-success/90 text-white font-bold h-14 rounded-xl shadow-lg shadow-success/20"
            >
              <Check className="w-5 h-5" />
              ACEITAR
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IncomingOrderScreen;
