import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export async function fetchRegions() {
  const { data, error } = await supabase
    .from("regions")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createRegion(region: any) {
  const { data, error } = await supabase
    .from("regions")
    .insert(region)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRegion(id: string, updates: any) {
  const { data, error } = await supabase
    .from("regions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRegion(id: string) {
  const { error } = await supabase
    .from("regions")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export function useRegions() {
  return useQuery({
    queryKey: ["regions"],
    queryFn: fetchRegions,
  });
}

export function useCreateRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRegion,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["regions"] }),
  });
}

export function useUpdateRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      updateRegion(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["regions"] }),
  });
}

export function useDeleteRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteRegion,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["regions"] }),
  });
}
