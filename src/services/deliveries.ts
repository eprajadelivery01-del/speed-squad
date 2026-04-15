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
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  companies?: { name: string; phone: string | null } | null;
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
          query = query.in("status", status as any);
        } else {
          query = query.eq("status", status as any);
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
      return { data: (data ?? []) as DeliveryWithRelations[], count: count || 0 };
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
        pending: data.filter((d) => d.status === "pending").length,
        inTransit: data.filter((d) => d.status === ("in_transit" as any)).length,
        delivered: data.filter((d) => d.status === ("delivered" as any)).length,
        cancelled: data.filter((d) => d.status === "cancelled").length,
        todayRevenue: data.filter((d) => d.status === ("delivered" as any)).reduce((sum, d) => sum + Number(d.commission ?? 0), 0),
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
      const updates: {
        status: DeliveryStatus;
        updated_at: string;
        accepted_at?: string;
        driver_id?: string;
        collected_at?: string;
        completed_at?: string;
        cancelled_at?: string;
      } = { status, updated_at: now };

      if (status === "accepted") {
        updates.accepted_at = now;
        if (driverId) updates.driver_id = driverId;
      }
      if (status === "collecting") updates.collected_at = now;
      if (status === "delivered") updates.completed_at = now;
      if (status === "cancelled") updates.cancelled_at = now;

      const { error } = await supabase.from("deliveries").update(updates).eq("id", id);
      if (error) throw error;
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
