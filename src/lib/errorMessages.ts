/**
 * errorMessages.ts
 * Traduz erros técnicos do Supabase/sistema para mensagens amigáveis ao usuário.
 * Jamais exiba erros brutos ao usuário — use sempre esta função.
 */

export interface FriendlyError {
  title: string;
  description: string;
}

/**
 * Traduz qualquer erro técnico em uma mensagem amigável para o entregador.
 */
export function translateDeliveryError(error: unknown, context?: "accept" | "update" | "collect" | "deliver"): FriendlyError {
  const raw = error instanceof Error ? error.message : String(error ?? "");

  // RLS / permissão bloqueada
  if (
    raw.includes("Row level security") ||
    raw.includes("RLS") ||
    raw.includes("blocked") ||
    raw.includes("permission") ||
    raw.includes("not authorized")
  ) {
    if (context === "accept") {
      return {
        title: "⚡ Corrida não disponível",
        description: "Esta corrida já foi aceita por outro entregador ou não está mais disponível. Aguarde uma nova.",
      };
    }
    return {
      title: "🔒 Sem permissão para atualizar",
      description: "Você não tem permissão para alterar esta entrega. Tente novamente ou contate o suporte.",
    };
  }

  // Corrida não encontrada / delivery not found
  if (
    raw.includes("delivery not found") ||
    raw.includes("not found") ||
    raw.includes("no rows") ||
    raw.includes("0 rows")
  ) {
    return {
      title: "❌ Corrida não encontrada",
      description: "Esta corrida não foi localizada no sistema. Pode ter sido cancelada. Atualize a tela.",
    };
  }

  // Corrida já aceita por outro
  if (
    raw.includes("já foi aceita") ||
    raw.includes("já aceita") ||
    raw.includes("already accepted")
  ) {
    return {
      title: "⚡ Corrida já aceita",
      description: "Outro entregador aceitou esta corrida antes de você. Aguarde a próxima disponível.",
    };
  }

  // Conflito de status / corrida cancelada
  if (raw.includes("cancelled") || raw.includes("cancelada")) {
    return {
      title: "🚫 Corrida cancelada",
      description: "Esta corrida foi cancelada pela loja. Aguarde novas solicitações.",
    };
  }

  // Erro de rede / timeout / offline
  if (
    raw.includes("Failed to fetch") ||
    raw.includes("NetworkError") ||
    raw.includes("timeout") ||
    raw.includes("offline") ||
    raw.includes("network")
  ) {
    return {
      title: "📶 Sem conexão",
      description: "Verifique sua internet e tente novamente. O aplicativo precisa de conexão para atualizar a entrega.",
    };
  }

  // Erro de autenticação / sessão expirada
  if (
    raw.includes("JWT") ||
    raw.includes("session") ||
    raw.includes("token") ||
    raw.includes("auth") ||
    raw.includes("login")
  ) {
    return {
      title: "🔐 Sessão expirada",
      description: "Sua sessão expirou. Saia e entre novamente no aplicativo.",
    };
  }

  // Mensagem personalizada do sistema (vinda do RPC)
  if (raw.length > 0 && raw.length < 120 && !raw.includes("{") && !raw.includes("Error:")) {
    return {
      title: "⚠️ Erro na entrega",
      description: raw,
    };
  }

  // Fallback genérico
  return {
    title: "⚠️ Algo deu errado",
    description: "Não foi possível atualizar a corrida. Tente novamente. Se o problema persistir, contate o suporte pelo WhatsApp.",
  };
}

/**
 * Traduz erros de login.
 */
export function translateLoginError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");

  if (/invalid login credentials/i.test(raw)) {
    return "E-mail ou senha incorretos. Verifique os dados e tente novamente.";
  }
  if (/email not confirmed/i.test(raw)) {
    return "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.";
  }
  if (/too many requests/i.test(raw)) {
    return "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.";
  }
  if (/network|fetch|offline/i.test(raw)) {
    return "Sem conexão com a internet. Verifique sua rede e tente novamente.";
  }
  return "Ocorreu um erro inesperado. Tente novamente.";
}
