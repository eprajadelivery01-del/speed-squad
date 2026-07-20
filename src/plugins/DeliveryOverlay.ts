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
// No Android, passamos a instância original diretamente para evitar qualquer perda de contexto do Capacitor
export const DeliveryOverlay: DeliveryOverlayPlugin = Capacitor.getPlatform() === 'android'
  ? DeliveryOverlayPluginRaw
  : {
      requestOverlayPermission: async () => {},
      startOverlay: async () => ({ success: false, reason: 'not_android' }),
      stopOverlay: async () => {},
      dismissIncomingCall: async () => {},
      testIncomingCall: async () => {},
      updateIncomingCall: async () => {},
      addListener: (eventName: any, listenerFunc: any) => {
        return Promise.resolve({ remove: async () => {} }) as any;
      }
    };

if (typeof window !== 'undefined') {
  (window as any).DeliveryOverlay = DeliveryOverlay;
}


