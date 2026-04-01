import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DriverWithProfile {
  id: string;
  user_id: string;
  vehicle: string;
  plate: string | null;
  is_online: boolean;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
  };
}

export function useDrivers() {
  return useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("*, profiles(full_name, avatar_url, phone)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DriverWithProfile[];
    },
  });
}

export function useOnlineDrivers() {
  return useQuery({
    queryKey: ["drivers", "online"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("*, profiles(full_name, avatar_url, phone)")
        .eq("is_online", true);
      if (error) throw error;
      return data as DriverWithProfile[];
    },
    refetchInterval: 10000,
  });
}
