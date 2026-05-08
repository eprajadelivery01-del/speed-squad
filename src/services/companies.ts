import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export async function fetchCompanies() {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
  });
}

export async function fetchCompanyByUserId(userId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId);
  
  if (error) throw error;
  if (!data || data.length === 0) return null;
  
  return data.find(c => !c.name.toLowerCase().includes("teste")) || data[0];
}

export function useCompany(userId?: string) {
  return useQuery({
    queryKey: ["company", userId],
    queryFn: () => (userId ? fetchCompanyByUserId(userId) : null),
    enabled: !!userId,
  });
}
