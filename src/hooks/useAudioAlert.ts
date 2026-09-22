import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { DeliveryOverlay } from "../plugins/DeliveryOverlay";

// ═══════════════════════════════════════════════════════════════════
// Singleton Audio — Reprodução ÚNICA (Sem loop contínuo persistente)
// Regra #8: Arquivo oficial = /notification_sound.mp3 (432 KB)
// ═══════════════════════════════════════════════════════════════════
const ALERT_SOUND_URL = "/notification_sound.mp3";

let globalAudio: HTMLAudioElement | null = null;
let isUnlocked = false;
let lastPlayPromise: Promise<void> | null = null;
let pendingPlay = false;

if (typeof window !== "undefined") {
  globalAudio = new Audio();
  globalAudio.src = ALERT_SOUND_URL + "?v=" + Date.now();
  globalAudio.loop = false;
  globalAudio.load();

  // ── Unlock automático no primeiro toque/clique ──
  let isUnlocking = false;
  const unlockGlobalAudio = () => {
    if (isUnlocking || !globalAudio) return;

    if (isUnlocked && pendingPlay) {
      pendingPlay = false;
      globalAudio.loop = false;
      globalAudio.volume = 1.0;
      globalAudio.currentTime = 0;
      globalAudio.play().catch(() => {});
      return;
    }

    if (isUnlocked) return;

    isUnlocking = true;
    globalAudio.muted = true;
    globalAudio.volume = 0;
    const p = globalAudio.play();
    lastPlayPromise = p;
    p.then(() => {
        try {
          if (!pendingPlay) {
            globalAudio!.pause();
            globalAudio!.currentTime = 0;
          }
        } catch {}
        globalAudio!.muted = false;
        isUnlocked = true;
        isUnlocking = false;
        if (lastPlayPromise === p) lastPlayPromise = null;

        // Se uma corrida chegou enquanto aguardava unlock, toca uma única vez
        if (pendingPlay) {
          pendingPlay = false;
          globalAudio!.loop = false;
          globalAudio!.volume = 1.0;
          globalAudio!.currentTime = 0;
          globalAudio!.play().catch(() => {});
        }
      })
      .catch(() => {
        if (globalAudio) globalAudio.muted = false;
        if (lastPlayPromise === p) lastPlayPromise = null;
        isUnlocking = false;
      });
  };

  window.addEventListener("click", unlockGlobalAudio);
  window.addEventListener("touchstart", unlockGlobalAudio);
  window.addEventListener("keydown", unlockGlobalAudio);
}

/**
 * Dispara vibração física única no dispositivo do usuário (Haptics)
 */
export function triggerDeviceVibration(pattern: number[] = [500, 200, 500]) {
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
    if (isUnlocked || !globalAudio) return;
    globalAudio.muted = true;
    globalAudio.volume = 0;
    const p = globalAudio.play();
    lastPlayPromise = p;
    p.then(() => {
        try {
          globalAudio!.pause();
          globalAudio!.currentTime = 0;
        } catch {}
        globalAudio!.muted = false;
        isUnlocked = true;
        if (lastPlayPromise === p) lastPlayPromise = null;
      })
      .catch((e) => {
        if (globalAudio) globalAudio.muted = false;
        if (lastPlayPromise === p) lastPlayPromise = null;
        if (import.meta.env.DEV) console.warn("[AudioAlert] Falha ao destravar áudio:", e);
      });
  }, []);

  // ── Reprodução ÚNICA do alerta sonoro oficial ──
  const playAlert = useCallback(() => {
    if (globalAudio) {
      try {
        globalAudio.loop = false;
        globalAudio.currentTime = 0;
        globalAudio.volume = 1.0;
        const p = globalAudio.play();
        lastPlayPromise = p;
        p.then(() => {
            isUnlocked = true;
            pendingPlay = false;
            if (lastPlayPromise === p) lastPlayPromise = null;
          })
          .catch((e) => {
            if (lastPlayPromise === p) lastPlayPromise = null;
            pendingPlay = true;
            console.warn("[AudioAlert] Alerta sonoro pendente para o próximo toque:", e.message || e);
          });
      } catch (err) {
        console.warn("[AudioAlert] Erro ao disparar áudio:", err);
      }
    }
    triggerDeviceVibration();
  }, []);

  // ── startLoop alias seguro: executa reprodução única (sem loop) ──
  const startLoop = useCallback(() => {
    playAlert();
  }, [playAlert]);

  const stopLoop = useCallback(() => {
    pendingPlay = false;
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
  }, []);

  const stopAlert = useCallback(() => {
    stopLoop();
  }, [stopLoop]);

  return { unlockAudio, playAlert, startLoop, stopLoop, stopAlert, isPlaying: false };
}
