import { useMemo } from "react";
import type { DeliveryWithRelations } from "@/services/deliveries";

/**
 * useUniqueDeliveries
 * Hook para deduplicar entregas na interface do entregador.
 */
export function useUniqueDeliveries(deliveries: DeliveryWithRelations[]) {
  return useMemo(() => {
    if (!deliveries || deliveries.length === 0) return [];

    const seenIds = new Set<string>();
    const fuzzyKeys = new Set<string>();
    
    return deliveries.filter((delivery) => {
      // 1. Verificação Primária: ID Único
      if (!delivery.id || seenIds.has(delivery.id)) {
        return false;
      }
      seenIds.add(delivery.id);

      // 2. Verificação Secundária (Heurística): Evita "Double Inserts" no banco/realtime
      const createdAt = new Date(delivery.created_at).getTime();
      const secondPrecision = Math.floor(createdAt / 1000);
      
      const fuzzyKey = [
        delivery.company_id,
        delivery.customer_name,
        delivery.value || delivery.price || 0,
        secondPrecision
      ].join('|');

      if (fuzzyKeys.has(fuzzyKey)) {
        console.warn(`[Anti-Duplicidade] Entrega duplicada detectada e ocultada no app: ${delivery.id}`);
        return false;
      }

      fuzzyKeys.add(fuzzyKey);
      return true;
    });
  }, [deliveries]);
}
