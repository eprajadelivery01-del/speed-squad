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

// DB enum uses: pending, broadcasted, accepted, collecting, in_transit, delivered, cancelled, returned
// Some legacy rows may still contain "completed" — normalize it to "delivered" for the UI.
const APP_TO_DB_STATUS: Record<string, string> = {
  delivered: "completed",
  in_transit: "in_transit",
};

const DB_TO_APP_STATUS: Record<string, DeliveryStatus> = {
  completed: "delivered",
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
  } = params || {};

  return useQuery({
    queryKey: ["deliveries", status, search, companyId, driverId, dateFrom, dateTo, page, pageSize],
    enabled,
    staleTime,
    refetchOnWindowFocus,
    queryFn: async () => {
      let query = supabase
        .from("deliveries")
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
        query = query.eq("driver_id", driverId);
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

      const updates: Record<string, string> = { status: dbStatus, updated_at: now };

      if (status === "accepted") {
        updates.accepted_at = now;
        if (driverId) updates.driver_id = driverId;
      }
      if (status === "collecting") updates.collected_at = now;
      if (status === "delivered") updates.delivered_at = now;
      if (dbStatus === "cancelled") updates.cancelled_at = now;

      if (!id) throw new Error("ID da entrega é obrigatório");

      const { data: delivery, error: fetchErr } = await supabase.from("deliveries").select("order_id").eq("id", id).maybeSingle();
      
      const { error } = await supabase.from("deliveries").update(updates as any).eq("id", id);
      if (error) throw error;

      // Update linked order status to keep customer informed
      let orderStatus = "";
      if (status === "accepted") orderStatus = "confirmed";
      if (status === "collecting") orderStatus = "preparing";
      if (status === "in_transit") orderStatus = "delivering";
      if (status === "delivered") orderStatus = "delivered";
      if (dbStatus === "cancelled") orderStatus = "cancelled";

      if (orderStatus) {
        // Try updating by order_id if available
        if (delivery?.order_id) {
          const { error: err1 } = await supabase.from("orders").update({ status: orderStatus }).eq("id", delivery.order_id);
          if (err1) console.error("Error updating order by id:", err1);
        }
        // Also update by delivery_id as a fallback/backup
        const { error: err2 } = await supabase.from("orders").update({ status: orderStatus }).eq("delivery_id", id);
        if (err2) console.error("Error updating order by delivery_id:", err2);
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
