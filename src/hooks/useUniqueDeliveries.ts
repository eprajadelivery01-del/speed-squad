import { useMemo } from "react";
import type { DeliveryWithRelations } from "@/services/deliveries";

/**
 * useUniqueDeliveries
 * Hook para deduplicar entregas na interface.
 * Mantém apenas a verificação por ID para evitar duplicatas de race conditions (Realtime vs Polling),
 * removendo heurísticas agressivas que podem ocultar entregas legítimas.
 */
export function useUniqueDeliveries(deliveries: DeliveryWithRelations[] | undefined) {
  return useMemo(() => {
    if (!deliveries || deliveries.length === 0) return [];

    const seenIds = new Set<string>();
    
    return deliveries.filter((delivery) => {
      if (!delivery.id || seenIds.has(delivery.id)) {
        return false;
      }
      seenIds.add(delivery.id);
      return true;
    });
  }, [deliveries]);
}
