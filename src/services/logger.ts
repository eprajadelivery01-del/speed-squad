import { supabase } from "@/integrations/supabase/client";

export interface ErrorPayload {
  error_message: string;
  stack_trace?: string;
  url?: string;
  additional_info?: Record<string, any>;
}

let isReporting = false;

export async function reportErrorToTelegram(payload: ErrorPayload, appName = "App Entregador") {
  if (isReporting) return;
  
  // Ignore errors from Lovable preview environments to avoid false alarms
  const currentUrl = payload.url || window.location.href;
  if (currentUrl.includes("lovableproject.com")) {
    return;
  }

  // Ignore specific harmless user-facing errors (race conditions and validation toasts)
  const norm = (str: string) => (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const msgFull = norm(
    (payload.error_message || "") + " " + 
    (payload.stack_trace || "") + " " + 
    JSON.stringify(payload.additional_info || "")
  );

  const ignoreKeywords = [
    "ja foi aceita",
    "pertence a outro",
    "ja pertence",
    "outro entregador",
    "corrida aceita",
    "ops! ja foi aceita",
    "erro na entrega",
    "erro ao atualizar entrega",
    "erro ao atualizar",
    "senha",
    "invalida",
    "credenciais",
    "offline",
    "nao encontrada",
    "acesso negado",
    "exclusivo para entregadores",
    "permissao de sobreposicao",
    "deliveryoverlay is not defined",
    "driverrecord is not defined",
    "driverrecord"
  ];

  if (ignoreKeywords.some(kw => msgFull.includes(kw))) {
    return;
  }
  
  isReporting = true;

  try {
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    
    const requestBody = {
      app_name: appName,
      error_message: payload.error_message,
      stack_trace: payload.stack_trace || new Error().stack || "",
      user_id: user?.id || "Não autenticado",
      user_email: user?.email || "Anônimo",
      url: payload.url || window.location.pathname,
      additional_info: {
        userAgent: navigator.userAgent,
        screenResolution: `${window.innerWidth}x${window.innerHeight}`,
        time: new Date().toISOString(),
        ...payload.additional_info
      }
    };

    // Invoke the Supabase Edge Function
    await supabase.functions.invoke("telegram-logger", {
      body: requestBody
    });
  } catch (err) {
    console.error("Failed to report error to Telegram:", err);
  } finally {
    isReporting = false;
  }
}

export function initializeGlobalErrorHandlers(appName: string) {
  if (typeof window === "undefined") return;

  window.onerror = (message, source, lineno, colno, error) => {
    const errorMsg = String(message);
    if (errorMsg === 'Script error.') return false;

    reportErrorToTelegram({
      error_message: errorMsg,
      stack_trace: error?.stack || `At ${source}:${lineno}:${colno}`,
      url: window.location.href,
      additional_info: { source, lineno, colno }
    }, appName);
    return false;
  };

  window.onunhandledrejection = (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || "");

    // Silencia ReferenceErrors de código em cache desatualizado no dispositivo do entregador.
    // Exemplo: "driverRecord is not defined", "DeliveryOverlay is not defined", etc.
    if (msg.includes("is not defined") || msg.includes("Cannot read properties of undefined")) {
      return;
    }

    reportErrorToTelegram({
      error_message: `Unhandled Rejection: ${msg}`,
      stack_trace: reason?.stack || "No stack trace available",
      url: window.location.href,
      additional_info: {
        reason: typeof reason === "object" ? JSON.stringify(reason) : String(reason)
      }
    }, appName);
  };

  // Intercept programmatic console.error calls (including accessibility radix-ui warnings)
  const originalConsoleError = console.error;
  console.error = function (...args) {
    // Format error message cleanly
    const msg = args.map(a => {
      if (a instanceof Error) return a.message + "\n" + a.stack;
      return typeof a === "object" ? JSON.stringify(a) : String(a);
    }).join(" ");

    // Invoke original console logger
    originalConsoleError.apply(console, args);

    // Skip nested reporting to prevent loops
    if (isReporting) return;

    reportErrorToTelegram({
      error_message: `[Console Error] ${msg.slice(0, 1000)}`,
      stack_trace: new Error().stack || "Logged via console.error",
      url: window.location.href,
      additional_info: {
        isConsoleError: true
      }
    }, appName).catch(() => {});
  };
}
