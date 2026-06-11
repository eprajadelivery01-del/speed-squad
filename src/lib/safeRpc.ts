import { supabase } from "@/integrations/supabase/client";

/**
 * safeRpc — Wrapper seguro para chamadas supabase.rpc()
 * 
 * Problema resolvido: Em certas versões do Supabase JS client, quando uma
 * função RPC não existe no banco, o retorno de supabase.rpc() pode não ser
 * um thenable padrão (Promise). Isso causa o erro:
 *   "y.rpc(...).catch is not a function"
 * no bundle minificado do app.
 * 
 * Este wrapper garante que:
 * 1. A chamada rpc() sempre retorna um resultado seguro
 * 2. Erros de runtime são capturados sem crashar o app
 * 3. Funções RPC inexistentes retornam erro silencioso
 */

interface SafeRpcResult<T = any> {
  data: T | null;
  error: string | null;
}

export async function safeRpc<T = any>(
  fnName: string,
  params?: Record<string, any>
): Promise<SafeRpcResult<T>> {
  try {
    // Call rpc and capture the result
    const rpcCall = params
      ? (supabase.rpc as any)(fnName, params)
      : (supabase.rpc as any)(fnName);

    // Validate that the result is thenable (a Promise)
    if (!rpcCall || typeof rpcCall.then !== "function") {
      return { data: null, error: `rpc("${fnName}") did not return a Promise` };
    }

    // Await the result safely
    const { data, error } = await rpcCall;

    if (error) {
      return { data: null, error: error.message || String(error) };
    }

    return { data: data as T, error: null };
  } catch (err: any) {
    // Capture any runtime error (including .catch is not a function)
    const message = err?.message || "Unknown RPC error";
    
    // Only log in development to keep production console clean
    if (import.meta.env.DEV) {
      console.warn(`[safeRpc] "${fnName}" failed:`, message);
    }

    return { data: null, error: message };
  }
}
