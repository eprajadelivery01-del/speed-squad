import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InvitationRow {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  invited_by: string;
  created_at: string;
}

export function useInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InvitationRow[];
    },
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role, invitedBy }: { email: string; role: string; invitedBy: string }) => {
      const token = crypto.randomUUID();
      const { error } = await supabase.from("invitations").insert({
        email, role, token, invited_by: invitedBy, status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invitations"] }),
  });
}

export function usePendingProfiles() {
  return useQuery({
    queryKey: ["pending-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles(role)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useApproveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").update({ status: "active" }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pending-profiles"] }),
  });
}

export function useRejectUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").update({ status: "rejected" }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pending-profiles"] }),
  });
}

export async function updateProfile(userId: string, data: { full_name: string; phone: string }) {
  const { error } = await supabase.from("profiles").update(data).eq("user_id", userId);
  if (error) throw error;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const filePath = `avatars/${userId}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  const url = data.publicUrl;

  await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", userId);
  return url;
}

export async function validateInvitation(token: string): Promise<InvitationRow> {
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();
  if (error || !data) throw new Error("Convite inválido ou expirado");
  return data as InvitationRow;
}

export async function acceptInvitation(
  token: string,
  params: { email: string; password: string; fullName: string; phone: string; document: string }
) {
  // 1. Create user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
  });
  if (signUpError) throw signUpError;
  const user = signUpData.user;
  if (!user) throw new Error("Erro ao criar usuário");

  // 2. Get invitation to know the role
  const { data: inv } = await supabase.from("invitations").select("role").eq("token", token).single();

  // 3. Create profile
  await supabase.from("profiles").upsert({
    user_id: user.id,
    full_name: params.fullName,
    phone: params.phone,
    document: params.document,
    status: "pending",
  } as any);

  // 4. Assign role
  if (inv?.role) {
    await supabase.from("user_roles").insert({ user_id: user.id, role: inv.role });
  }

  // 5. Mark invitation as accepted
  await supabase.from("invitations").update({ status: "accepted" }).eq("token", token);

  // Sign out so user confirms email
  await supabase.auth.signOut();
}
