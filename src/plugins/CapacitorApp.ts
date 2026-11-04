import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface AppState {
  isActive: boolean;
}

interface AppPlugin {
  addListener(
    eventName: "appStateChange",
    listenerFunc: (state: AppState) => void,
  ): Promise<PluginListenerHandle>;
}

// Fallback seguro para Web / PWA para evitar o erro '"App" plugin is not implemented on web'
class AppPluginWeb implements AppPlugin {
  async addListener(
    _eventName: "appStateChange",
    listenerFunc: (state: AppState) => void,
  ): Promise<PluginListenerHandle> {
    if (typeof document !== "undefined") {
      const handleVisibilityChange = () => {
        listenerFunc({ isActive: document.visibilityState === "visible" });
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return {
        remove: async () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
        },
      };
    }
    return {
      remove: async () => {},
    };
  }
}

// Register the native App plugin through Capacitor Core so the web bundle does
// not depend on @capacitor/app's published JavaScript entry being present.
export const App = registerPlugin<AppPlugin>("App", {
  web: () => new AppPluginWeb(),
});
