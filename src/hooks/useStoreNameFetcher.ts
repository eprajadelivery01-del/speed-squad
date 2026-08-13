import { supabase } from "@/integrations/supabase/client";

/**
 * Função utilitária para capturar e resolver com 100% de precisão o NOME REAL DA LOJA
 * que solicitou a entrega, buscando diretamente por:
 * 1. Campos diretos já presentes no registro
 * 2. Tabela companies (via company_id)
 * 3. Relação do pedido (via order_id) somente para descobrir company_id
 */
const storeNameCache = new Map<string, string>();
const FALLBACK_STORE_NAME = "É Pra Já Delivery";

function normalizeStoreName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.toLowerCase().includes("loja parceira")) return null;
  return normalized;
}

async function fetchCompanyName(companyId: string): Promise<string | null> {
  const cacheKey = `comp:${companyId}`;
  const cached = storeNameCache.get(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("companies")
    .select("name, trade_name")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    console.warn("[fetchRealStoreName] Erro ao buscar empresa por id:", error);
    return null;
  }

  const name = normalizeStoreName(data?.trade_name) || normalizeStoreName(data?.name);
  if (name) storeNameCache.set(cacheKey, name);
  return name;
}

export async function fetchRealStoreName(delivery: any): Promise<string> {
  if (!delivery) return FALLBACK_STORE_NAME;

  // 1. Tenta pegar direto do próprio objeto da entrega se enviado no payload
  const directName = normalizeStoreName(delivery.company_name || delivery.store_name || delivery.trade_name);
  if (directName) return directName;

  // 2. Se houver relação pré-carregada (companies)
  if (delivery.companies) {
    const relatedName = normalizeStoreName(delivery.companies.trade_name) || normalizeStoreName(delivery.companies.name);
    if (relatedName) return relatedName;
  }

  // 3. Se possuir company_id, verifica o cache antes de consultar o banco
  const companyId = delivery.company_id || delivery.companyId || delivery.store_id;
  if (companyId) {
    try {
      const companyName = await fetchCompanyName(companyId);
      if (companyName) return companyName;
    } catch (e) {
      console.warn("[fetchRealStoreName] Erro ao buscar empresa por id:", e);
    }
  }

  // 4. Se possuir order_id, verifica o cache antes de consultar o banco
  const orderId = delivery.order_id || delivery.orderId;
  if (orderId) {
    const cacheKey = `ord:${orderId}`;
    if (storeNameCache.has(cacheKey)) {
      return storeNameCache.get(cacheKey) ?? FALLBACK_STORE_NAME;
    }
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .select("company_id")
        .eq("id", orderId)
        .maybeSingle();

      if (error) {
        console.warn("[fetchRealStoreName] Erro ao buscar pedido por id:", error);
      } else if (order?.company_id) {
        const companyName = await fetchCompanyName(order.company_id);
        if (companyName) {
          storeNameCache.set(cacheKey, companyName);
          return companyName;
        }
      }
    } catch (e) {
      console.warn("[fetchRealStoreName] Erro ao buscar empresa por order_id:", e);
    }
  }

  return FALLBACK_STORE_NAME;
}
