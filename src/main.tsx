const isPreviewHost = /(^|\.)lovable(project)?\.(app|com)$/.test(window.location.hostname);
const mustDisableServiceWorker = import.meta.env.DEV || isPreviewHost;

async function clearStaleRuntime(): Promise<boolean> {
  if (!mustDisableServiceWorker || !("serviceWorker" in navigator)) return true;

  const wasControlled = Boolean(navigator.serviceWorker.controller);
  const registrations = await navigator.serviceWorker.getRegistrations();

  await Promise.all([
    ...registrations.map((registration) => registration.unregister()),
    "caches" in window
      ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      : Promise.resolve([]),
  ]);

  // Desregistrar não remove o controle da aba atual; uma única recarga limpa isso.
  if (wasControlled && sessionStorage.getItem("runtime-cache-cleared") !== "1") {
    sessionStorage.setItem("runtime-cache-cleared", "1");
    window.location.reload();
    return false;
  }

  sessionStorage.removeItem("runtime-cache-cleared");
  return true;
}

async function bootstrap() {
  try {
    if (!(await clearStaleRuntime())) return;
  } catch (error) {
    console.warn("Falha ao remover cache antigo do aplicativo:", error);
  }

  // React só é importado depois que qualquer runtime antigo deixou de controlar a página.
  await import("./application.tsx");

  if (!mustDisableServiceWorker && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        registration.update().catch(() => {});
      }).catch((error) => {
        console.warn("SW registration failed:", error);
      });
    });
  }
}

void bootstrap();
