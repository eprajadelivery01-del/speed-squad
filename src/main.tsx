import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeGlobalErrorHandlers } from "@/services/logger";

initializeGlobalErrorHandlers("App Entregador");

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("SW registration failed: ", err);
    });
  });
}
