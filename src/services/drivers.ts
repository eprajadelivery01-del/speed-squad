import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type DriverWithProfile = {
  id: string;
  user_id: string;
  vehicle: string;
  is_online: boolean;
  rating: number;
  latitude: number | null;
  longitude: number | null;
  license_plate: string | null;
  commission_rate: number;
  created_at: string;
  profiles?: { full_name: string; phone: string | null; avatar_url: string | null } | null;
};

export async function fetchDrivers() {
  const { data: drivers, error: driversError } = await supabase
    .from("delivery_drivers")
    .select("*")
    .order("created_at", { ascending: false });
    
  if (driversError) throw driversError;
  if (!drivers) return [];

  const userIds = drivers.map(d => d.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, full_name, phone, avatar_url")
    .in("user_id", userIds);

  if (profilesError) {
    console.error("Erro ao buscar perfis dos motoristas:", profilesError);
    return drivers as unknown as DriverWithProfile[];
  }

  return drivers.map(driver => ({
    ...driver,
    profiles: profiles?.find(p => p.user_id === driver.user_id) || null
  })) as unknown as DriverWithProfile[];
}

export async function toggleDriverOnline(driverId: string, isOnline: boolean) {
  const { error } = await supabase
    .from("delivery_drivers")
    .update({ is_online: isOnline })
    .eq("id", driverId);
  if (error) throw error;
}

export async function updateDriverLocation(driverId: string, lat: number, lng: number) {
  const { error } = await supabase
    .from("delivery_drivers")
    .update({ latitude: lat, longitude: lng })
    .eq("id", driverId);
  if (error) throw error;
}

export function useDrivers() {
  return useQuery({
    queryKey: ["drivers"],
    queryFn: fetchDrivers,
  });
}

export function useOnlineDrivers() {
  return useQuery({
    queryKey: ["drivers", "online"],
    queryFn: async () => {
      const { data: drivers, error: driversError } = await supabase
        .from("delivery_drivers")
        .select("*")
        .eq("is_online", true);
      
      if (driversError) throw driversError;
      if (!drivers) return [];

      const userIds = drivers.map(d => d.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, avatar_url")
        .in("user_id", userIds);

      if (profilesError) {
        console.error("Erro ao buscar perfis dos motoristas online:", profilesError);
        return drivers as unknown as DriverWithProfile[];
      }

      return drivers.map(driver => ({
        ...driver,
        profiles: profiles?.find(p => p.user_id === driver.user_id) || null
      })) as unknown as DriverWithProfile[];
    },
  });
}

export function useToggleDriverOnline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ driverId, isOnline }: { driverId: string; isOnline: boolean }) =>
      toggleDriverOnline(driverId, isOnline),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
}

/**
 * NOVOS HOOKS (ENTREGADOR)
 */
export function useAvailableDeliveries(regionId?: string) {
  return useQuery({
    queryKey: ["deliveries", "available", regionId],
    queryFn: async () => {
      let query = supabase
        .from("deliveries")
        .select("*, companies(name)")
        .eq("status", "pending")
        .is("driver_id", null);
      
      if (regionId) query = query.eq("region_id", regionId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAcceptDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ deliveryId, driverId }: { deliveryId: string; driverId: string }) => {
      const { data, error } = await supabase
        .from("deliveries")
        .update({ 
          driver_id: driverId, 
          status: "accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", deliveryId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

export function useDriverEarnings(driverId?: string) {
  return useQuery({
    queryKey: ["driver-earnings", driverId],
    queryFn: async () => {
      if (!driverId) return { total: 0, count: 0 };
      const { data, error } = await supabase
        .from("deliveries")
        .select("commission")
        .eq("driver_id", driverId)
        .eq("status", "completed");
      if (error) throw error;
      
      const total = (data ?? []).reduce((sum, d) => sum + Number(d.commission), 0);
      return { total, count: data?.length ?? 0 };
    },
    enabled: !!driverId,
  });
}
