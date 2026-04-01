import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Region {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  color: string;
  price: number;
  city: string | null;
  geometry: any | null;
  created_at: string;
  updated_at: string;
}

async function fetchRegions(): Promise<Region[]> {
  const { data, error } = await supabase
    .from("regions")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Region[];
}

export function useRegions() {
  return useQuery({ queryKey: ["regions"], queryFn: fetchRegions });
}

export function useCreateRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (region: { name: string; color: string; price: number; city?: string; geometry: any }) => {
      const { data, error } = await supabase.from("regions").insert(region as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["regions"] }),
  });
}

export function useUpdateRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string; price?: number; city?: string; geometry?: any; active?: boolean }) => {
      const { data, error } = await supabase.from("regions").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["regions"] }),
  });
}

export function useDeleteRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("regions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["regions"] }),
  });
}
