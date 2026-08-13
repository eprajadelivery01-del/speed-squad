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

  try {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .maybeSingle();

    if (!error && data?.name) {
      const normalized = normalizeStoreName(data.name);
      if (normalized) {
        storeNameCache.set(cacheKey, normalized);
        return normalized;
      }
    }
  } catch (e) {
    console.warn("[STORE_NAME_DEBUG]Erro no fetchDirectCompany:", e);
  }

  return null;
}

export async function fetchRealStoreName(delivery: any): Promise<string> {
  if (!delivery) {
    console.warn("[STORE_NAME_DEBUG] delivery object is null/undefined");
    return "";
  }

  // 1. Tag [LOJA: ...] inserida nas observações
  if (delivery.notes && typeof delivery.notes === "string") {
    const match = delivery.notes.match(/\[(LOJA|EMPRESA|STORE):\s*([^\]]+)\]/i);
    if (match && match[2]) {
      const parsedName = normalizeStoreName(match[2]);
      if (parsedName) return parsedName;
    }
  }

  // 2. Propriedades diretas enviadas no objeto da entrega ou relacao pre-carregada
  const directName = normalizeStoreName(
    delivery.company_name || 
    delivery.store_name || 
    delivery.trade_name || 
    delivery.companies?.name || 
    delivery.companies?.trade_name ||
    delivery.companies?.company_name
  );
  if (directName) return directName;

  // 3. Consulta por ID da empresa se disponivel
  const companyId = delivery.company_id || delivery.companyId || delivery.store_id;
  if (companyId) {
    const companyName = await fetchCompanyName(companyId);
    if (companyName) return companyName;
  }

  // 4. Consulta por ID do pedido se disponivel
  const orderId = delivery.order_id || delivery.orderId;
  if (orderId) {
    const cacheKey = `ord:${orderId}`;
    if (storeNameCache.has(cacheKey)) {
      return storeNameCache.get(cacheKey) || "";
    }
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .select("company_id")
        .eq("id", orderId)
        .maybeSingle();

      if (!error && order?.company_id) {
        const companyName = await fetchCompanyName(order.company_id);
        if (companyName) {
          storeNameCache.set(cacheKey, companyName);
          return companyName;
        }
      }
    } catch (e) {
      console.warn("[STORE_NAME_DEBUG] Erro ao consultar orders por order_id:", e);
    }
  }

  console.warn("[STORE_NAME_DEBUG]", {
    delivery_id: delivery.id,
    order_id: delivery.order_id,
    company_id: delivery.company_id,
    resolved_store_name: null
  });

  return "";
}
