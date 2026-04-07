import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDeliveriesRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`deliveries-realtime-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries" },
        () => {
          qc.invalidateQueries({ queryKey: ["deliveries"] });
          qc.invalidateQueries({ queryKey: ["delivery-stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

export function useDriversRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`drivers-realtime-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_drivers" },
        () => {
          qc.invalidateQueries({ queryKey: ["drivers"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

export function useOrdersRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`orders-realtime-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          qc.invalidateQueries({ queryKey: ["orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

export function useAllRealtime() {
  useDeliveriesRealtime();
  useDriversRealtime();
  useOrdersRealtime();
}
