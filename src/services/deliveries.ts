import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  } = params || {};

  return useQuery({
    queryKey: ["deliveries", status, search, companyId, driverId, dateFrom, dateTo, page, pageSize],
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
      const now = new Date().toISOString();
      const dbStatus = toDbStatus(status);

      if (!id) throw new Error("ID da entrega é obrigatório");

      // Combination 1: dbStatus + completed_at (Ideal normalized database state)
      const updates1: Record<string, unknown> = { status: dbStatus, updated_at: now };
      if (status === "accepted") {
        updates1.accepted_at = now;
        if (driverId) updates1.driver_id = driverId;
      }
      if (status === "collecting") updates1.collected_at = now;
      if (status === "delivered") updates1.completed_at = now;
      if (dbStatus === "cancelled") updates1.cancelled_at = now;

      const res1 = await supabase.from("deliveries").update(updates1 as any).eq("id", id);

      if (res1.error) {
        console.warn("First update failed, trying fallback combination 2 (dbStatus + delivered_at):", res1.error);

        // Combination 2: dbStatus + delivered_at
        const updates2: Record<string, unknown> = { status: dbStatus, updated_at: now };
        if (status === "accepted") {
          updates2.accepted_at = now;
          if (driverId) updates2.driver_id = driverId;
        }
        if (status === "collecting") updates2.collected_at = now;
        if (status === "delivered") updates2.delivered_at = now;
        if (dbStatus === "cancelled") updates2.cancelled_at = now;

        const res2 = await supabase.from("deliveries").update(updates2 as any).eq("id", id);

        if (res2.error) {
          console.warn("Second update failed, trying fallback combination 3 (appStatus + completed_at):", res2.error);

          // Combination 3: appStatus (status) + completed_at
          const updates3: Record<string, unknown> = { status: status, updated_at: now };
          if (status === "accepted") {
            updates3.accepted_at = now;
            if (driverId) updates3.driver_id = driverId;
          }
          if (status === "collecting") updates3.collected_at = now;
          if (status === "delivered") updates3.completed_at = now;
          if (status === "cancelled") updates3.cancelled_at = now;

          const res3 = await supabase.from("deliveries").update(updates3 as any).eq("id", id);

          if (res3.error) {
            console.warn("Third update failed, trying fallback combination 4 (appStatus + delivered_at):", res3.error);

            // Combination 4: appStatus (status) + delivered_at (Legacy and default database states)
            const updates4: Record<string, unknown> = { status: status, updated_at: now };
            if (status === "accepted") {
              updates4.accepted_at = now;
              if (driverId) updates4.driver_id = driverId;
            }
            if (status === "collecting") updates4.collected_at = now;
            if (status === "delivered") updates4.delivered_at = now;
            if (status === "cancelled") updates4.cancelled_at = now;

            const res4 = await supabase.from("deliveries").update(updates4 as any).eq("id", id);

            if (res4.error) {
              throw res4.error; // If all fail, propagate the error
            }
          }
        }
      }

      // Update linked order status to keep customer informed
      let orderStatus = "";
      if (status === "accepted") orderStatus = "confirmed";
      if (status === "collecting") orderStatus = "preparing";
      if (status === "in_transit") orderStatus = "delivering";
      if (status === "delivered") orderStatus = "delivered";
      if (dbStatus === "cancelled") orderStatus = "cancelled";

      if (orderStatus) {
        const { error: orderError } = await supabase.from("orders").update({ status: orderStatus as any }).eq("delivery_id", id);
        if (orderError) console.error("Error updating order status:", orderError);
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
