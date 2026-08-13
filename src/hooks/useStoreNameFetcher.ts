import { supabase } from "@/integrations/supabase/client";

/**
 * Função utilitária para capturar e resolver com 100% de precisão o NOME REAL DA LOJA
 * que solicitou a entrega, buscando diretamente por:
 * 1. Campos diretos já presentes no registro
 * 2. Tabela companies (via company_id)
 * 3. Relação do pedido (via order_id) somente para descobrir company_id
 */
const LOCAL_STORAGE_CACHE_KEY = "epraja_store_name_cache";

function loadLocalStorageCache(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([k, v]) => {
        if (typeof v === "string" && v) map.set(k, v);
      });
    }
  } catch (e) {}
  return map;
}

const storeNameCache = loadLocalStorageCache();

function setCacheItem(key: string, value: string) {
  storeNameCache.set(key, value);
  try {
    const obj: Record<string, string> = {};
    storeNameCache.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(obj));
  } catch (e) {}
}

function normalizeStoreName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.toLowerCase().includes("loja parceira")) return null;
  return normalized;
}

const pendingPromises = new Map<string, Promise<string | null>>();

async function fetchCompanyName(companyId: string, signal?: AbortSignal): Promise<string | null> {
  const cacheKey = `comp:${companyId}`;
  const cached = storeNameCache.get(cacheKey);
  if (cached) return cached;

  if (pendingPromises.has(cacheKey)) {
    return pendingPromises.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      if (signal?.aborted) return null;
      let query = supabase
        .from("companies")
        .select("id, name")
        .eq("id", companyId);

      if (signal) {
        query = query.abortSignal(signal);
      }

      const { data, error } = await query.maybeSingle();

      if (!error && data?.name) {
        const normalized = normalizeStoreName(data.name);
        if (normalized) {
          setCacheItem(cacheKey, normalized);
          return normalized;
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.warn("[STORE_NAME_DEBUG] Erro no fetchDirectCompany:", e);
      }
    } finally {
      pendingPromises.delete(cacheKey);
    }
    return null;
  })();

  pendingPromises.set(cacheKey, promise);
  return promise;
}

export async function fetchRealStoreName(delivery: any, signal?: AbortSignal): Promise<string> {
  if (!delivery) return "";
  if (signal?.aborted) return "";

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
    const companyName = await fetchCompanyName(companyId, signal);
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
      if (signal?.aborted) return "";
      let query = supabase
        .from("orders")
        .select("company_id")
        .eq("id", orderId);

      if (signal) query = query.abortSignal(signal);

      const { data: order, error } = await query.maybeSingle();

      if (!error && order?.company_id) {
        const companyName = await fetchCompanyName(order.company_id, signal);
        if (companyName) {
          setCacheItem(cacheKey, companyName);
          return companyName;
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.warn("[STORE_NAME_DEBUG] Erro ao consultar orders por order_id:", e);
      }
    }
  }

  return "";
}
