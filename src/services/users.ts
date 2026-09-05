import { supabase } from "@/integrations/supabase/client";
import { safeRpc } from "@/lib/safeRpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

export type ProfileRow = Tables<"profiles">;
export type InvitationRow = Tables<"invitations">;

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, user_roles(role)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPendingProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, user_roles(role)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function approveUser(userId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ status: "active" as any })
    .eq("id", userId);
  if (error) throw error;
}

export async function rejectUser(userId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ status: "rejected" as any })
    .eq("id", userId);
  if (error) throw error;
}

export async function updateProfile(userId: string, updates: { id?: string; full_name?: string; phone?: string; document?: string; avatar_url?: string }) {
  const profileId = updates.id;
  const { id, ...realUpdates } = updates;
  const updatePayload: Record<string, any> = { 
    ...realUpdates, 
    updated_at: new Date().toISOString() 
  };

  // 1. Tenta atualizar pelo user_id (chave canônica do usuário auth no profiles)
  let { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("user_id", userId)
    .select();

  // 2. Se nenhuma linha foi afetada, tenta pelo id (caso o registro tenha id diferente ou user_id nulo)
  if (!error && (!data || data.length === 0)) {
    const targetId = profileId || userId;
    const res = await supabase
      .from("profiles")
      .update({
        ...updatePayload,
        user_id: userId
      })
      .eq("id", targetId)
      .select();
    data = res.data;
    error = res.error;
  }

  // 3. Se ainda não existir registro na tabela profiles, cria via upsert seguro
  if (!error && (!data || data.length === 0)) {
    const insertPayload: any = {
      id: profileId || userId,
      user_id: userId,
      ...realUpdates,
      status: "active",
      role: "driver",
      updated_at: new Date().toISOString()
    };
    const res = await supabase
      .from("profiles")
      .upsert(insertPayload, { onConflict: "user_id" })
      .select();
    data = res.data;
    error = res.error;
  }

  if (error) {
    console.error("[updateProfile] Error updating profile:", error);
    throw error;
  }

  // 4. Sincroniza também com a tabela delivery_drivers para manter os dados sincronizados
  try {
    const driverUpdates: Record<string, any> = {};
    if (realUpdates.full_name !== undefined) driverUpdates.full_name = realUpdates.full_name;
    if (realUpdates.phone !== undefined) driverUpdates.phone = realUpdates.phone;
    if (realUpdates.avatar_url !== undefined) driverUpdates.avatar_url = realUpdates.avatar_url;
    if (realUpdates.document !== undefined) driverUpdates.document = realUpdates.document;

    if (Object.keys(driverUpdates).length > 0) {
      driverUpdates.updated_at = new Date().toISOString();
      await supabase
        .from("delivery_drivers")
        .update(driverUpdates)
        .eq("user_id", userId);
    }
  } catch (syncErr) {
    console.warn("[updateProfile] Could not sync changes to delivery_drivers:", syncErr);
  }

  const result = data && data.length > 0 ? data[0] : { id: profileId || userId, user_id: userId, ...realUpdates };
  return result;
}

export async function uploadAvatar(userId: string, file: File) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
  
  await updateProfile(userId, { avatar_url: urlData.publicUrl });
  return urlData.publicUrl;
}

export async function createInvitation(email: string, role: "admin" | "company" | "driver" | "customer", invitedBy: string) {
  const { data, error } = await supabase
    .from("invitations")
    .insert({ email, role, invited_by: invitedBy })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchInvitations() {
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function validateInvitation(token: string) {
  // Use secure RPC to fetch invitation by token (bypasses direct SELECT RLS restrict)
  const { data, error } = await safeRpc("get_invitation_by_token", { _token: token });

  if (error) {
    console.error("[Invite] Supabase error:", error);
    throw new Error(error || "Erro ao validar convite");
  }
  if (!data) throw new Error("Convite não encontrado");
  if (data.status !== "pending") throw new Error("Convite inválido ou já utilizado");
  if (new Date(data.expires_at) < new Date()) throw new Error("Convite expirado");
  return data;
}

export async function acceptInvitation(token: string, userData: { email: string; password: string; fullName: string; phone: string; document: string }) {
  const invitation = await validateInvitation(token);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: { data: { full_name: userData.fullName } },
  });
  if (authError) throw authError;
  if (!authData.user) throw new Error("Erro ao criar conta");

  await supabase
    .from("profiles")
    .update({
      full_name: userData.fullName,
      phone: userData.phone,
      document: userData.document,
    })
    .eq("user_id", authData.user.id);

  await supabase.from("user_roles").insert({
    user_id: authData.user.id,
    role: invitation.role,
  });

  if (invitation.role === "driver") {
    await supabase.from("delivery_drivers").insert({
      user_id: authData.user.id,
      full_name: userData.fullName,
      phone: userData.phone,
      document: userData.document,
    });
  }

  if (invitation.role === "company") {
    await supabase.from("companies").insert({
      user_id: authData.user.id,
      name: userData.fullName,
    });
  }

  await supabase
    .from("invitations")
    .update({ status: "accepted" })
    .eq("token", token);

  return authData;
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
  });
}

export function usePendingProfiles() {
  return useQuery({
    queryKey: ["profiles", "pending"],
    queryFn: fetchPendingProfiles,
  });
}

export function useApproveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}

export function useRejectUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rejectUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}

export function useInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: fetchInvitations,
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role, invitedBy }: { email: string; role: "admin" | "company" | "driver" | "customer"; invitedBy: string }) =>
      createInvitation(email, role, invitedBy),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations"] }),
  });
}
