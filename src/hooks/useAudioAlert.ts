import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { DeliveryOverlay } from "../plugins/DeliveryOverlay";

// ═══════════════════════════════════════════════════════════════════
// Singleton Audio — idêntico ao padrão do Lojista (pronto-agora-hub)
// Regra #8: Arquivo oficial = /notification_sound.mp3 (432 KB)
// ═══════════════════════════════════════════════════════════════════
const ALERT_SOUND_URL = "/notification_sound.mp3";

let globalAudio: HTMLAudioElement | null = null;
let isUnlocked = false;
let vibrationInterval: any = null;
let activeNotification: Notification | null = null;
let lastPlayPromise: Promise<void> | null = null;
let pendingLoop = false; // Flag: se true, dispara som assim que o usuário clicar

if (typeof window !== "undefined") {
  globalAudio = new Audio();
  globalAudio.src = ALERT_SOUND_URL + "?v=" + Date.now();
  globalAudio.load();

  // ── Unlock automático no primeiro toque/clique ──
  let isUnlocking = false;
  const unlockGlobalAudio = () => {
    if (isUnlocking || !globalAudio) return;

    // Se já está desbloqueado mas tem som pendente, dispara o loop agora
    if (isUnlocked && pendingLoop) {
      pendingLoop = false;
      globalAudio.loop = true;
      globalAudio.volume = 1.0;
      globalAudio.play().catch(() => {});
      return;
    }

    if (isUnlocked) return;

    isUnlocking = true;
    globalAudio.volume = 0;
    const p = globalAudio.play();
    lastPlayPromise = p;
    p.then(() => {
        isUnlocked = true;
        isUnlocking = false;
        if (lastPlayPromise === p) lastPlayPromise = null;

        // Se enquanto esperava o unlock uma corrida chegou, toca agora
        if (pendingLoop) {
          pendingLoop = false;
          globalAudio!.loop = true;
          globalAudio!.volume = 1.0;
          globalAudio!.play().catch(() => {});
        }
      })
      .catch(() => {
        if (lastPlayPromise === p) lastPlayPromise = null;
        isUnlocking = false;
      });
  };

  // Não remove os listeners — mantém sempre ativos para capturar retry de pendingLoop
  window.addEventListener("click", unlockGlobalAudio);
  window.addEventListener("touchstart", unlockGlobalAudio);
  window.addEventListener("keydown", unlockGlobalAudio);
}

/**
 * Dispara vibração física no dispositivo do usuário (Haptics)
 */
export function triggerDeviceVibration(pattern: number[] = [500, 200, 500, 200, 800]) {
  const canVibrate = Capacitor.isNativePlatform() || isUnlocked;
  if (canVibrate && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn("[Vibration] Vibração não suportada:", e);
    }
  }
}

export function isAudioGloballyUnlocked(): boolean {
  return isUnlocked;
}

export function useAudioAlert() {
  const unlockAudio = useCallback(() => {
    if (globalAudio) {
      globalAudio.volume = 0;
      const p = globalAudio.play();
      lastPlayPromise = p;
      p.then(() => {
          isUnlocked = true;
          if (lastPlayPromise === p) lastPlayPromise = null;
        })
        .catch((e) => {
          if (lastPlayPromise === p) lastPlayPromise = null;
          if (import.meta.env.DEV) console.warn("[AudioAlert] Falha ao destravar áudio:", e);
        });
    }
  }, []);

  const playAlert = useCallback(() => {
    if (globalAudio) {
      globalAudio.currentTime = 0;
      globalAudio.volume = 1.0;
      const p = globalAudio.play();
      lastPlayPromise = p;
      p.then(() => {
          isUnlocked = true;
          if (lastPlayPromise === p) lastPlayPromise = null;
        })
        .catch((e) => {
          if (lastPlayPromise === p) lastPlayPromise = null;
          console.warn("[AudioAlert] Falha ao tocar alerta sonoro:", e);
        });
    }
    triggerDeviceVibration();
  }, []);

  // ── startLoop: Idêntico ao Lojista — sem currentTime=0 reset ──
  const startLoop = useCallback(() => {
    console.log("[AudioAlert] Tocando som oficial de notificação...");
    if (globalAudio) {
      // Se já está tocando em loop, não interrompe
      if (!globalAudio.paused && globalAudio.loop) {
        globalAudio.volume = 1.0;
        return;
      }
      globalAudio.loop = true;
      globalAudio.volume = 1.0;
      const p = globalAudio.play();
      lastPlayPromise = p;
      p.then(() => {
          isUnlocked = true;
          pendingLoop = false;
          if (lastPlayPromise === p) lastPlayPromise = null;
        })
        .catch((e) => {
          if (lastPlayPromise === p) lastPlayPromise = null;
          // Play bloqueado pelo navegador — marca como pendente para disparar no próximo clique
          pendingLoop = true;
          console.warn("[AudioAlert] Som pendente — tocará ao clicar na página.", e.message || e);
        });
    }

    // Vibração contínua independente do estado do áudio
    if (!vibrationInterval) {
      triggerDeviceVibration();
      vibrationInterval = setInterval(() => {
        triggerDeviceVibration();
      }, 3500);
    }
  }, []);

  const stopLoop = useCallback(() => {
    pendingLoop = false;
    DeliveryOverlay.stopNativeAudio().catch(() => {});
    if (globalAudio) {
      const performPause = () => {
        try {
          globalAudio!.pause();
          globalAudio!.currentTime = 0;
          globalAudio!.loop = false;
        } catch (e) {
          console.warn("[AudioAlert] Falha ao parar áudio:", e);
        }
      };

      if (lastPlayPromise) {
        lastPlayPromise.then(performPause).catch(performPause);
        lastPlayPromise = null;
      } else {
        performPause();
      }
    }

    if (vibrationInterval) {
      clearInterval(vibrationInterval);
      vibrationInterval = null;
    }
  }, []);

  const stopAlert = useCallback(() => {
    stopLoop();
  }, [stopLoop]);

  return { unlockAudio, playAlert, startLoop, stopLoop, stopAlert, isPlaying: false };
}
