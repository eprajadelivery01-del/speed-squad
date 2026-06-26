import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { safeRpc } from "@/lib/safeRpc";
import type { DeliveryStatus } from "@/types/models";

export interface DeliveryWithRelations {
  id: string;
  company_id: string;
  driver_id: string | null;
  customer_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: DeliveryStatus;
  commission: number;
  notes: string | null;
  region_id: string | null;
  accepted_at: string | null;
  collected_at: string | null;
  delivered_at: string | null;
  completed_at?: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  companies?: { name: string; phone: string | null } | null;
  customer_phone?: string | null;
}

// DB enum uses: pending, broadcasted, accepted, collecting, in_route, completed, cancelled
// Some legacy rows may still contain "completed" or "in_transit" — normalize it to the UI formats.
const APP_TO_DB_STATUS: Record<string, string> = {
  delivered: "completed",
  in_transit: "in_route",
};

const DB_TO_APP_STATUS: Record<string, DeliveryStatus> = {
  completed: "delivered",
  in_route: "in_transit",
  in_transit: "in_transit" as any,
};

function toDbStatus(status: string) {
  return APP_TO_DB_STATUS[status] ?? status;
}

function toAppStatus(status: string) {
  return (DB_TO_APP_STATUS[status] ?? status) as DeliveryStatus;
}

interface UseDeliveriesParams {
  status?: string | string[];
  search?: string;
  companyId?: string;
  driverId?: string;
  dateFrom?: string;
  dateTo?: string;
  pageSize?: number;
  page?: number;
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number | false;
  cityId?: string;
}

export function useDeliveries(params?: UseDeliveriesParams) {
  const {
    status,
    search,
    companyId,
    driverId,
    dateFrom,
    dateTo,
    pageSize = 50,
    page = 0,
    enabled = true,
    staleTime = 0,
    refetchOnWindowFocus = true,
    refetchInterval,
    cityId,
  } = params || {};

  return useQuery({
    queryKey: ["deliveries", status, search, companyId, driverId, cityId, dateFrom, dateTo, page, pageSize],
    enabled,
    staleTime,
    refetchOnWindowFocus,
    refetchInterval: refetchInterval as any,
    queryFn: async () => {
      const isAvailableOnly = (status === "pending" || (Array.isArray(status) && status.includes("pending") && status.length === 1)) && !driverId;
      const targetTable = isAvailableOnly ? "available_deliveries" : "deliveries";

      let query = supabase
        .from(targetTable as any)
        .select("*, companies(name, phone)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (status && status !== "all") {
        if (Array.isArray(status)) {
          query = query.in("status", status.map(toDbStatus) as any);
        } else {
          query = query.eq("status", toDbStatus(status) as any);
        }
      }
      if (search) query = query.ilike("customer_name", `%${search}%`);
      if (companyId) query = query.eq("company_id", companyId);
      if (driverId) {
        if (status && (status === "pending" || (Array.isArray(status) && status.includes("pending")) || (Array.isArray(status) && status.includes("broadcasted")))) {
          // Show both unassigned and specifically assigned to this driver
          query = query.or(`driver_id.is.null,driver_id.eq.${driverId}`);
        } else {
          query = query.eq("driver_id", driverId);
        }
      } else if (status && (status === "pending" || (Array.isArray(status) && status.includes("pending")))) {
        // Only show items with no driver assigned when looking for pending/available
        query = query.is("driver_id", null);
      }
      if (cityId) {
        query = query.eq("city_id", cityId);
      }
      if (dateFrom) query = query.gte("created_at", new Date(dateFrom).toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const normalizedData = (data ?? []).map((delivery: any) => ({
        ...delivery,
        status: toAppStatus(delivery.status),
        delivered_at: delivery.delivered_at ?? delivery.completed_at ?? null,
      }));

      return { data: normalizedData as DeliveryWithRelations[], count: count || 0 };
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
        supabase.from("deliveries").select("status, commission").gte("created_at", today.toISOString()),
        supabase.from("deliveries").select("id", { count: "exact", head: true }),
      ]);

      if (todayRes.error) throw todayRes.error;
      const data = todayRes.data;

      return {
        today: data.length,
        total: totalRes.count ?? 0,
        pending: data.filter((d) => (d.status as string) === "pending" || (d.status as string) === "broadcasted").length,
        inTransit: data.filter((d) => (d.status as string) === "in_transit" || (d.status as string) === "collecting" || (d.status as string) === "accepted").length,
        delivered: data.filter((d) => (d.status as string) === "delivered" || (d.status as string) === "completed").length,
        cancelled: data.filter((d) => (d.status as string) === "cancelled").length,
        todayRevenue: data.filter((d) => (d.status as string) === "delivered" || (d.status as string) === "completed").reduce((sum, d) => sum + Number(d.commission ?? 0), 0),
      };
    },
    refetchInterval: 30000,
  });
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, driverId }: { id: string; status: DeliveryStatus; driverId?: string }) => {
      const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === "accepted") {
        updates.accepted_at = new Date().toISOString();
        if (driverId) updates.driver_id = driverId;
      }
      if (status === "collecting") updates.collected_at = new Date().toISOString();
      if (status === "delivered") updates.delivered_at = new Date().toISOString();
      if (status === "cancelled") updates.cancelled_at = new Date().toISOString();

      let query = supabase.from("deliveries").update(updates as any).eq("id", id);
      if (status === "accepted") {
        query = query.in("status", ["pending", "broadcasted"] as any).or(`driver_id.is.null,driver_id.eq.${driverId}`);
      }
      // Request exact count so we know if 0 rows were updated (meaning someone else took it)
      const { error, data } = await query.select("id");
      if (error) throw error;
      if (status === "accepted" && (!data || data.length === 0)) {
        throw new Error("Esta corrida já foi aceita por outro entregador.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
    },
  });
}

export function useReassignDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, driverId }: { id: string; driverId: string | null }) => {
      const { error } = await supabase.from("deliveries").update({ driver_id: driverId, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deliveries"] }),
  });
}

export interface DriverEarningsSummary {
  total_deliveries: number;
  gross_earnings: number;
  platform_fee: number;
  net_earnings: number;
}

export function useDriverEarningsSummary(driverId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["driver-earnings-summary", driverId, startDate, endDate],
    enabled: !!driverId && !!startDate && !!endDate,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_driver_earnings_summary", {
        p_driver_id: driverId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        console.error("Error fetching earnings summary via RPC:", error);
        return {
          total_deliveries: 0,
          gross_earnings: 0,
          platform_fee: 0,
          net_earnings: 0,
        } as DriverEarningsSummary;
      }

      if (data && data.length > 0) {
        const item = data[0];
        return {
          total_deliveries: Number(item.total_deliveries || 0),
          gross_earnings: Number(item.gross_earnings || 0),
          platform_fee: Number(item.platform_fee || 0),
          net_earnings: Number(item.net_earnings || 0),
        } as DriverEarningsSummary;
      }

      return {
        total_deliveries: 0,
        gross_earnings: 0,
        platform_fee: 0,
        net_earnings: 0,
      } as DriverEarningsSummary;
    },
  });
}
