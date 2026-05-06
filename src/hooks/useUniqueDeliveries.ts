import { useMemo } from "react";
import type { DeliveryWithRelations } from "@/services/deliveries";

/**
 * useUniqueDeliveries
 * Hook para deduplicar entregas na interface do entregador.
 */
export function useUniqueDeliveries(deliveries: DeliveryWithRelations[]) {
  return useMemo(() => {
    if (!deliveries || deliveries.length === 0) return [];

    const seen = new Set<string>();
    const fuzzySeen = new Set<string>();
    
    return deliveries.filter((delivery) => {
      // 1. Deduplicação por ID
      if (seen.has(delivery.id)) return false;
      seen.add(delivery.id);

      // 2. Deduplicação por Heurística (Fuzzy Match)
      // Mesma empresa, cliente e valor criado no mesmo segundo
      const timestamp = new Date(delivery.created_at).getTime();
      const secondTimestamp = Math.floor(timestamp / 1000);
      
      const fuzzyKey = `${delivery.company_id}-${delivery.customer_name}-${delivery.commission}-${secondTimestamp}`;
      
      if (fuzzySeen.has(fuzzyKey)) {
        console.warn(`[Deduplication] Item duplicado ocultado no app: ${delivery.id} (${fuzzyKey})`);
        return false;
      }
      
      fuzzySeen.add(fuzzyKey);
      return true;
    });
  }, [deliveries]);
}
