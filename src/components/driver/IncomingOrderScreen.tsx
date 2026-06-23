import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Package, Check, X } from "lucide-react";

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
    delivery.pickup_address || delivery.origin_address || delivery.store_address || "Local de retirada";
  const dropoff =
    delivery.delivery_address || delivery.dropoff_address || delivery.address || "Local de entrega";
  const value = delivery.commission ?? delivery.driver_earnings ?? delivery.total_value ?? 0;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-card border rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-primary text-primary-foreground p-4 text-center">
          <p className="text-xs uppercase tracking-wider opacity-80">Nova corrida</p>
          <p className="text-3xl font-extrabold mt-1">
            R$ {Number(value).toFixed(2).replace(".", ",")}
          </p>
          <p className="text-xs mt-1 opacity-80">Expira em {secondsLeft}s</p>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-3">
            <Package className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Retirada</p>
              <p className="text-sm font-medium">{pickup}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <MapPin className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Entrega</p>
              <p className="text-sm font-medium">{dropoff}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onReject(delivery.id)}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Recusar
            </Button>
            <Button size="lg" onClick={() => onAccept(delivery.id)} className="gap-2">
              <Check className="w-4 h-4" />
              Aceitar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IncomingOrderScreen;
