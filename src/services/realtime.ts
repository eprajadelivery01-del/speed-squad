import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAllRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("all-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, () => {
        queryClient.invalidateQueries({ queryKey: ["deliveries"] });
        queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, () => {
        queryClient.invalidateQueries({ queryKey: ["drivers"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "companies" }, () => {
        queryClient.invalidateQueries({ queryKey: ["companies"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
}

export function useDeliveriesRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("deliveries-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, () => {
        queryClient.invalidateQueries({ queryKey: ["deliveries"] });
        queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
}
