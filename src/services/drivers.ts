import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type DriverWithProfile = {
  id: string;
  user_id: string;
  vehicle?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  online?: boolean;
  is_online?: boolean;
  rating: number;
  latitude: number | null;
  longitude: number | null;
  license_plate?: string | null;
  commission_rate?: number;
  created_at?: string;
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
    mutationFn: async ({ driverId, isOnline }: { driverId: string; isOnline: boolean }) => {
      const { error } = await supabase
        .from("delivery_drivers")
        .update({ online: isOnline, is_online: isOnline } as any)
        .eq("id", driverId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
}

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
      // Use RPC with row-level lock to prevent two drivers accepting the same delivery.
      const { data, error } = await supabase.rpc("update_delivery_status_safe" as any, {
        p_delivery_id: deliveryId,
        p_status: "accepted",
        p_driver_id: driverId,
      });
      if (error) throw error;
      if (data && (data as any).success === false) {
        throw new Error((data as any).error || "Não foi possível aceitar esta corrida.");
      }

      // Notifica o cliente via Edge Function informando que o entregador aceitou a corrida
      try {
        supabase.functions.invoke('notify-customer', {
          body: {
            deliveryId,
            deliveryStatus: 'accepted'
          }
        }).catch(e => console.warn('[useAcceptDelivery] Erro ao invocar notify-customer:', e));
      } catch {}

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

/**
 * Desvincula com segurança total o entregador de todas as entregas antes da exclusão da conta.
 * NUNCA exclui as entregas; define o driver_id como NULL para manter 100% do histórico
 * do lojista, do cliente e do financeiro intactos no sistema.
 */
export async function safeUnlinkAndPrepareDriverDeletion(userId: string) {
  if (!userId) return;

  try {
    // 1. Obter os identificadores do entregador (tanto em delivery_drivers quanto o próprio auth user_id)
    const { data: driverRecord } = await supabase
      .from("delivery_drivers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const targetIds = Array.from(new Set([driverRecord?.id, userId])).filter(Boolean) as string[];

    for (const dId of targetIds) {
      // 2. Corridas em andamento voltam para o pool geral (broadcasted) com driver_id NULL para não travar a loja
      try {
        await supabase
          .from("deliveries")
          .update({
            driver_id: null,
            status: "broadcasted" as any,
            accepted_at: null,
            collected_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("driver_id", dId)
          .in("status", ["accepted", "collecting", "in_route"] as any);
      } catch (err) {
        console.warn("[safeUnlink] Aviso ao resetar corridas ativas:", err);
      }

      // 3. TODAS as entregas (incluindo concluídas e canceladas) têm seu driver_id setado para NULL.
      // Isso protege 100% o histórico contra qualquer cascade delete e preserva o banco.
      try {
        await supabase
          .from("deliveries")
          .update({
            driver_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("driver_id", dId);
      } catch (err) {
        console.warn("[safeUnlink] Aviso ao desvincular entregas concluídas:", err);
      }

      // 4. Desvincular ocorrências e avaliações para manter integridade relacional
      try {
        await supabase.from("occurrences").update({ driver_id: null }).eq("driver_id", dId);
      } catch {}

      try {
        await supabase.from("delivery_occurrences").update({ driver_id: null }).eq("driver_id", dId);
      } catch {}

      try {
        await supabase.from("reviews").update({ driver_id: null }).eq("driver_id", dId);
      } catch {}

      try {
        await supabase.from("delivery_ratings").update({ driver_id: null }).eq("driver_id", dId);
      } catch {}

      // 5. Limpar registros efêmeros exclusivos do motorista
      try {
        await supabase.from("driver_location_history").delete().eq("driver_id", dId);
      } catch {}

      try {
        await supabase.from("driver_earnings").delete().eq("driver_id", dId);
      } catch {}
    }

    // 6. Desvincular o registro em delivery_drivers do auth.users antes da deleção de conta
    if (driverRecord?.id) {
      try {
        await supabase
          .from("delivery_drivers")
          .update({
            is_online: false,
            online: false,
            status: "deleted",
            user_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", driverRecord.id);
      } catch (err) {
        console.warn("[safeUnlink] Aviso ao sanitizar delivery_drivers:", err);
      }
    }
  } catch (err) {
    console.error("[safeUnlinkAndPrepareDriverDeletion] Falha no processo de desvinculação:", err);
  }
}

