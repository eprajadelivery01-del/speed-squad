import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface DeliveryOverlayPlugin {
  requestOverlayPermission(): Promise<void>;
  startOverlay(): Promise<void>;
  stopOverlay(): Promise<void>;
  dismissIncomingCall(): Promise<void>;
  testIncomingCall(options: { details: string }): Promise<void>;
  addListener(
    eventName: 'onCallResponse',
    listenerFunc: (response: { status: 'accepted' | 'rejected' }) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

export const DeliveryOverlay = registerPlugin<DeliveryOverlayPlugin>('DeliveryOverlay');
