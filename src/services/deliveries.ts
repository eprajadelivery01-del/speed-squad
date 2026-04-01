import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Delivery, DeliveryStatus } from "@/types/models";

interface UseDeliveriesParams {
  status?: DeliveryStatus;
  pageSize?: number;
  page?: number;
}

export function useDeliveries(params?: UseDeliveriesParams) {
  const { status, pageSize = 50, page = 0 } = params || {};

  return useQuery({
    queryKey: ["deliveries", status, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from("deliveries")
        .select("*, companies(name, phone), drivers(*, profiles(full_name, avatar_url))", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (status) query = query.eq("status", status);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as Delivery[], count: count || 0 };
    },
  });
}

export function useDeliveryStats() {
  return useQuery({
    queryKey: ["delivery-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayRes, totalRes] = await Promise.all([
        supabase
          .from("deliveries")
          .select("status, value")
          .gte("created_at", today.toISOString()),
        supabase
          .from("deliveries")
          .select("id", { count: "exact", head: true }),
      ]);

      if (todayRes.error) throw todayRes.error;
      const data = todayRes.data;

      return {
        today: data.length,
        total: totalRes.count ?? 0,
        pending: data.filter((d) => d.status === "pending").length,
        inRoute: data.filter((d) => d.status === "in_route").length,
        completed: data.filter((d) => d.status === "completed").length,
        cancelled: data.filter((d) => d.status === "cancelled").length,
        todayRevenue: data
          .filter((d) => d.status === "completed")
          .reduce((sum, d) => sum + Number(d.value), 0),
        revenue: data
          .filter((d) => d.status === "completed")
          .reduce((sum, d) => sum + Number(d.value), 0),
      };
    },
    refetchInterval: 30000,
  });
}
