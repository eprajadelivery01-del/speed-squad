import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type DriverRow = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  document: string | null;
  avatar_url: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  online: boolean;
  rating: number;
  total_deliveries: number;
  current_latitude: number | null;
  current_longitude: number | null;
  status: string | null;
  company_id: string | null;
  created_at: string;
};

export async function fetchDrivers() {
  const { data, error } = await supabase
    .from("delivery_drivers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DriverRow[];
}

export async function toggleDriverOnline(driverId: string, online: boolean) {
  const { error } = await supabase
    .from("delivery_drivers")
    .update({ online })
    .eq("id", driverId);
  if (error) throw error;
}

export async function updateDriverLocation(driverId: string, lat: number, lng: number) {
  const { error } = await supabase
    .from("delivery_drivers")
    .update({ current_latitude: lat, current_longitude: lng, last_location_update: new Date().toISOString() })
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
        .select("*")
        .eq("online", true);
      if (error) throw error;
      return (data ?? []) as DriverRow[];
    },
  });
}

export function useToggleDriverOnline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ driverId, online }: { driverId: string; online: boolean }) =>
      toggleDriverOnline(driverId, online),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
}
