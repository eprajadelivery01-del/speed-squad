import { supabase } from "@/integrations/supabase/client";

/**
 * Função utilitária para capturar e resolver com 100% de precisão o NOME REAL DA LOJA
 * que solicitou a entrega, buscando diretamente por:
 * 1. Campos diretos no registro (company_name, store_name, trade_name)
 * 2. Tabela companies (via company_id)
 * 3. Tabela orders (via order_id)
 */
const storeNameCache = new Map<string, string>();

export async function fetchRealStoreName(delivery: any): Promise<string> {
  if (!delivery) return "É Pra Já Delivery";

  // 1. Tenta pegar direto do próprio objeto da entrega se enviado no payload
  const directName = delivery.company_name || delivery.store_name || delivery.trade_name;
  if (directName && typeof directName === "string" && directName.trim() !== "" && !directName.toLowerCase().includes("loja parceira")) {
    return directName.trim();
  }

  // 2. Se houver relação pré-carregada (companies)
  if (delivery.companies) {
    const foundRel = delivery.companies.trade_name || delivery.companies.name;
    if (foundRel && foundRel.trim() !== "" && !foundRel.toLowerCase().includes("loja parceira")) {
      return foundRel.trim();
    }
  }

  // 3. Se possuir company_id, verifica o cache antes de consultar o banco
  const companyId = delivery.company_id || delivery.companyId || delivery.store_id;
  if (companyId) {
    const cacheKey = `comp:${companyId}`;
    if (storeNameCache.has(cacheKey)) {
      return storeNameCache.get(cacheKey)!;
    }
    try {
      const { data: comp } = await supabase
        .from("companies")
        .select("name, trade_name")
        .eq("id", companyId)
        .maybeSingle();

      if (comp) {
        const found = comp.trade_name || comp.name;
        if (found && found.trim() !== "" && !found.toLowerCase().includes("loja parceira")) {
          const res = found.trim();
          storeNameCache.set(cacheKey, res);
          return res;
        }
      }
    } catch (e) {
      console.warn("[fetchRealStoreName] Erro ao buscar empresa por id:", e);
    }
  }

  // 4. Se possuir order_id, verifica o cache antes de consultar o banco
  const orderId = delivery.order_id || delivery.orderId;
  if (orderId) {
    const cacheKey = `ord:${orderId}`;
    if (storeNameCache.has(cacheKey)) {
      return storeNameCache.get(cacheKey)!;
    }
    try {
      const { data: ord } = await supabase
        .from("orders")
        .select("company_name, store_name, company_id")
        .eq("id", orderId)
        .maybeSingle();

      if (ord) {
        const found = ord.company_name || ord.store_name;
        if (found && found.trim() !== "" && !found.toLowerCase().includes("loja parceira")) {
          const res = found.trim();
          storeNameCache.set(cacheKey, res);
          return res;
        }
        if (ord.company_id) {
          const { data: comp } = await supabase
            .from("companies")
            .select("name, trade_name")
            .eq("id", ord.company_id)
            .maybeSingle();

          if (comp) {
            const foundComp = comp.trade_name || comp.name;
            if (foundComp && foundComp.trim() !== "" && !foundComp.toLowerCase().includes("loja parceira")) {
              const res = foundComp.trim();
              storeNameCache.set(cacheKey, res);
              return res;
            }
          }
        }
      }
    } catch (e) {
      console.warn("[fetchRealStoreName] Erro ao buscar empresa por order_id:", e);
    }
  }

  return "É Pra Já Delivery";
}
