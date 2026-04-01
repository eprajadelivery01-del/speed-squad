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
  const { data, error } = await supabase
    .from("delivery_drivers")
    .select("*, profiles:user_id(full_name, phone, avatar_url)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DriverWithProfile[];
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
      const { data, error } = await supabase
        .from("delivery_drivers")
        .select("*, profiles:user_id(full_name, phone, avatar_url)")
        .eq("is_online", true);
      if (error) throw error;
      return (data ?? []) as unknown as DriverWithProfile[];
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
