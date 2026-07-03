import { registerPlugin, PluginListenerHandle, Capacitor } from '@capacitor/core';

export interface DeliveryOverlayPlugin {
  requestOverlayPermission(): Promise<void>;
  startOverlay(): Promise<{ success: boolean; reason?: string }>;
  stopOverlay(): Promise<void>;
  dismissIncomingCall(): Promise<void>;
  testIncomingCall(options: { details: string; deliveryId: string }): Promise<void>;
  updateIncomingCall(options: { details: string; deliveryId: string }): Promise<void>;
  addListener(
    eventName: 'onCallResponse',
    listenerFunc: (response: { status: 'accepted' | 'rejected'; deliveryId: string }) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

const DeliveryOverlayPluginRaw = registerPlugin<DeliveryOverlayPlugin>('DeliveryOverlay');

// Wrapper seguro para evitar o erro "UNIMPLEMENTED" no iOS e Web
export const DeliveryOverlay: DeliveryOverlayPlugin = {
  requestOverlayPermission: async () => {
    if (Capacitor.getPlatform() !== 'android') return;
    return DeliveryOverlayPluginRaw.requestOverlayPermission().catch(e => console.warn('DeliveryOverlay requestOverlayPermission falhou', e));
  },
  startOverlay: async () => {
    if (Capacitor.getPlatform() !== 'android') return { success: false, reason: 'not_android' };
    return DeliveryOverlayPluginRaw.startOverlay().catch(e => {
      console.warn('DeliveryOverlay startOverlay falhou', e);
      return { success: false, reason: e?.message };
    });
  },
  stopOverlay: async () => {
    if (Capacitor.getPlatform() !== 'android') return;
    return DeliveryOverlayPluginRaw.stopOverlay().catch(e => console.warn('DeliveryOverlay stopOverlay falhou', e));
  },
  dismissIncomingCall: async () => {
    if (Capacitor.getPlatform() !== 'android') return;
    return DeliveryOverlayPluginRaw.dismissIncomingCall().catch(e => console.warn('DeliveryOverlay dismissIncomingCall falhou', e));
  },
  testIncomingCall: async (options) => {
    if (Capacitor.getPlatform() !== 'android') return;
    return DeliveryOverlayPluginRaw.testIncomingCall(options).catch(e => console.warn('DeliveryOverlay testIncomingCall falhou', e));
  },
  updateIncomingCall: async (options) => {
    if (Capacitor.getPlatform() !== 'android') return;
    return DeliveryOverlayPluginRaw.updateIncomingCall(options).catch(e => console.warn('DeliveryOverlay updateIncomingCall falhou', e));
  },
  addListener: (eventName, listenerFunc) => {
    if (Capacitor.getPlatform() !== 'android') {
      // Retorna um mock de PluginListenerHandle que não faz nada
      return Promise.resolve({ remove: async () => {} }) as any;
    }
    return DeliveryOverlayPluginRaw.addListener(eventName, listenerFunc);
  }
};

if (typeof window !== 'undefined') {
  (window as any).DeliveryOverlay = DeliveryOverlay;
}

