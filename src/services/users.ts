import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateProfile(userId: string, updates: { full_name?: string; phone?: string; avatar_url?: string }) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadAvatar(userId: string, file: File) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
  
  await updateProfile(userId, { avatar_url: urlData.publicUrl });
  return urlData.publicUrl;
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
  });
}
