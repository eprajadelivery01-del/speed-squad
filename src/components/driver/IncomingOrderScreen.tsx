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

  // Timer logic removed because users hate it


  if (!delivery) return null;

  const pickup =
    delivery.pickup_address || delivery.origin_address || delivery.store_address || "Retirada na loja";
  const dropoff =
    delivery.delivery_address || delivery.dropoff_address || delivery.address || "Endereço do cliente";
  const value = Math.max(
    Number(delivery.delivery_fee) || 0,
    Number(delivery.price) || 0,
    Number(delivery.commission) || 0,
    Number(delivery.driver_earnings) || 0,
    Number(delivery.total_value) || 0,
    Number(delivery.value) || 0
  );
  const storeName = delivery.companies?.name || "Loja Parceira";

  // Calculation for "Cobrar do cliente"
  let chargeAmount = Number(delivery.estimated_value || 0);
  let chargeMethod = "";
  let showCharge = false;

  if (delivery.orders && Array.isArray(delivery.orders) && delivery.orders.length > 0) {
    const orderTotal = delivery.orders.reduce((acc: number, o: any) => acc + Number(o.total || 0), 0);
    if (orderTotal > 0) {
      chargeAmount = orderTotal;
      const methods = new Set(delivery.orders.map((o: any) => o.payment_method).filter(Boolean));
      if (methods.has('machine')) chargeMethod = "Máquina Móvel";
      else if (methods.has('money') || methods.has('cash')) chargeMethod = "Dinheiro";
      else if (methods.has('pix')) chargeMethod = "PIX";
      else if (methods.has('card')) chargeMethod = "Cartão Online";
      
      if (chargeMethod === "Máquina Móvel" || chargeMethod === "Dinheiro" || chargeMethod === "PIX") {
         showCharge = true;
      }
    }
  } else if (chargeAmount > 0) {
    showCharge = true;
  }

  return (
    <div className="fixed top-4 left-0 right-0 z-[100] flex justify-center p-4 pointer-events-none animate-in slide-in-from-top-8 fade-in duration-300">
      <div className="pointer-events-auto w-full max-w-md bg-[#111827] border border-white/10 rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.3)] overflow-hidden flex flex-col relative">
        
        {/* Header Orange */}
        <div className="bg-[#f97316] text-white p-4 flex justify-between items-center relative">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest bg-black/20 px-2 py-1 rounded-md">
              Nova Corrida
            </span>
          </div>
          <button onClick={() => onReject(delivery.id)} className="p-1 rounded-full bg-black/10 hover:bg-black/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Store Name and Earnings */}
          <div className="flex justify-between items-start">
            <h4 className="text-2xl font-extrabold text-white tracking-tight">{storeName}</h4>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Ganhos</span>
              <div className="text-2xl font-black text-[#22c55e] tracking-tighter">
                <span className="text-sm mr-0.5">R$</span>{Number(value).toFixed(2).replace(".", ",")}
              </div>
            </div>
          </div>
          
          {/* Valor a cobrar */}
          {showCharge && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-widest text-amber-500">Cobrar do cliente</span>
                <span className="text-xl font-black text-amber-500">
                  <span className="text-sm mr-0.5">R$</span>{chargeAmount.toFixed(2)}
                </span>
              </div>
              {chargeMethod && (
                <div className="flex justify-end">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                    {chargeMethod}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Addresses */}
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 rounded-full bg-[#f97316] shadow-[0_0_0_4px_rgba(249,115,22,0.2)] mt-1.5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#f97316]">Coleta</span>
                <span className="text-sm font-semibold text-gray-200 mt-0.5 leading-tight">{pickup}</span>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 rounded-full bg-[#ef4444] shadow-[0_0_0_4px_rgba(239,68,68,0.2)] mt-1.5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#ef4444]">Entrega</span>
                <span className="text-sm font-semibold text-gray-200 mt-0.5 leading-tight">{dropoff}</span>
              </div>
            </div>
          </div>

          {/* Countdown removed */}

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onReject(delivery.id)}
              className="gap-2 border-[#ef4444] bg-[#ef4444] text-white hover:bg-[#dc2626] hover:text-white font-bold h-14 rounded-xl"
            >
              <X className="w-5 h-5" />
              RECUSAR
            </Button>
            <Button 
              size="lg" 
              onClick={() => onAccept(delivery.id)} 
              className="gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold h-14 rounded-xl shadow-lg shadow-green-500/20"
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
