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

// Register the native App plugin through Capacitor Core so the web bundle does
// not depend on @capacitor/app's published JavaScript entry being present.
export const App = registerPlugin<AppPlugin>("App");