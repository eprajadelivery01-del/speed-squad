import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeGlobalErrorHandlers, reportErrorToTelegram } from "@/services/logger";
import { toast as sonnerToast } from "sonner";
import { Capacitor } from "@capacitor/core";

initializeGlobalErrorHandlers("App Entregador");

// Patch sonner toast.error globally to automatically capture all user-facing errors
const originalError = sonnerToast.error;
sonnerToast.error = function (message: any, options: any) {
  const text = typeof message === "string" ? message : JSON.stringify(message);
  
  if (text.includes("offline")) {
    return originalError.apply(this, arguments as any);
  }

  /*
  reportErrorToTelegram({
    error_message: `Alerta para o Usuário: ${text}`,
    stack_trace: `Sonner toast.error exibido na tela do entregador.`,
    url: window.location.href,
    additional_info: {
      isUserFacingAlert: true,
      options: options ? JSON.stringify(options) : ""
    }
  }, "App Entregador").catch(() => {});
  */
  
  return originalError.apply(this, arguments as any);
};

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento raiz do aplicativo não encontrado.");
}

createRoot(rootElement).render(<App />);

// Register Service Worker for PWA (Web only - not in native app)
if ("serviceWorker" in navigator) {
  const isPreviewHost = /(^|\.)lovable(project)?\.(app|com)$/.test(window.location.hostname);
  const mustDisableServiceWorker =
    import.meta.env.DEV || Capacitor.isNativePlatform() || isPreviewHost;

  if (mustDisableServiceWorker) {
    // O cache de módulos do servidor de desenvolvimento pode misturar versões do React.
    Promise.all([
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister()))),
      "caches" in window
        ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        : Promise.resolve([]),
    ]).catch((error) => {
      console.warn("Falha ao remover cache antigo do aplicativo:", error);
    });
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        reg.update().catch(() => {});
      }).catch((err) => {
        console.warn("SW registration failed: ", err);
      });
    });
  }
}
