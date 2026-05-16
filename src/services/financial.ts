import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

/**
 * FUNÇÕES
 */
export async function getWallet(userId: string) {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error; // Se não houver carteira ainda, criamos uma?
  
  if (!data) {
     const { data: newWallet, error: createError } = await supabase
       .from("wallets")
       .insert({ user_id: userId, balance: 0 })
       .select()
       .single();
     if (createError) throw createError;
     return newWallet;
  }
  
  return data;
}

export async function getTransactions(walletId: string) {
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("wallet_id", walletId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function requestWithdrawal(amount: number, userId: string) {
  // Validação: valor deve ser positivo e finito
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("Valor de saque inválido");
  }
  if (amount > 100000) throw new Error("Valor de saque excede o limite permitido");

  const wallet = await getWallet(userId);
  if (wallet.balance < amount) throw new Error("Saldo insuficiente");

  // Update condicional: só atualiza se o saldo ainda for suficiente (mitigação de race condition)
  const { data: updated, error: updateError } = await supabase
    .from("wallets")
    .update({ balance: wallet.balance - amount })
    .eq("id", wallet.id)
    .eq("user_id", userId)
    .gte("balance", amount)
    .select();

  if (updateError) throw updateError;
  if (!updated || updated.length === 0) {
    throw new Error("Saldo insuficiente ou operação concorrente detectada");
  }

  const { error: transError } = await supabase
    .from("financial_transactions")
    .insert({
      wallet_id: wallet.id,
      amount: -amount,
      type: "debit",
      description: "Saque solicitado",
    });

  if (transError) throw transError;
  return { success: true };
}

/**
 * HOOKS
 */
export function useWallet() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: () => (user?.id ? getWallet(user.id) : null),
    enabled: !!user?.id,
  });
}

export function useTransactions() {
  const { data: wallet } = useWallet();
  return useQuery({
    queryKey: ["transactions", wallet?.id],
    queryFn: () => (wallet?.id ? getTransactions(wallet.id) : null),
    enabled: !!wallet?.id,
  });
}

export function useWithdrawals() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      return requestWithdrawal(amount, user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet", user?.id] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
