import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * useDriverRealtime
 * Targeted hook for Driver App to monitor relevant changes.
 */
export function useDriverRealtime(driverId?: string, regionId?: string) {
  const qc = useQueryClient();

  useEffect(() => {
    console.log("[Realtime] Iniciando canais do entregador...");

    const sessionId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID().substring(0, 8) 
      : Math.random().toString(36).substring(2, 10);

    // Monitor for any delivery updates manually (since Postgres filter on region/driver is done client side in invalidation)
    const deliverablesChannel = supabase
      .channel(`driver-deliveries-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries" },
        (payload) => {
          console.log("[Realtime] Mudança em deliveries:", payload.eventType);
          qc.invalidateQueries({ queryKey: ["deliveries"] });
          qc.invalidateQueries({ queryKey: ["delivery-stats"] });
        }
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel(`driver-messages-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          qc.invalidateQueries({ queryKey: ["messages"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(deliverablesChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [qc]);
}

export function useAllRealtime() { 
  useDriverRealtime();
}
