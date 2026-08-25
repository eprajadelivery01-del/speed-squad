import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";

// Singleton instances to be used globally outside React lifecycle
const ALERT_SOUND_URL = "/notification_sound.mp3";

let globalAudio: HTMLAudioElement | null = null;
let isUnlocked = false;
let vibrationInterval: any = null;
let activeNotification: Notification | null = null;
let lastPlayPromise: Promise<void> | null = null;

if (typeof window !== "undefined") {
  globalAudio = new Audio();
  globalAudio.src = ALERT_SOUND_URL + "?v=" + Date.now();
  globalAudio.load();

  let isUnlocking = false;
  const unlockGlobalAudio = () => {
    if (isUnlocked || isUnlocking || !globalAudio) return;
    isUnlocking = true;
    globalAudio.volume = 0;
    const playPromise = globalAudio.play();
    lastPlayPromise = playPromise;
    playPromise
      .then(() => {
        isUnlocked = true;
        isUnlocking = false;
        if (lastPlayPromise === playPromise) {
          lastPlayPromise = null;
        }
        window.removeEventListener("click", unlockGlobalAudio);
        window.removeEventListener("touchstart", unlockGlobalAudio);
        window.removeEventListener("keydown", unlockGlobalAudio);
      })
      .catch(() => {
        if (lastPlayPromise === playPromise) {
          lastPlayPromise = null;
        }
        isUnlocking = false;
      });
  };

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
      const playPromise = globalAudio.play();
      lastPlayPromise = playPromise;
      playPromise
        .then(() => {
          isUnlocked = true;
          if (lastPlayPromise === playPromise) {
            lastPlayPromise = null;
          }
        })
        .catch((e) => {
          if (lastPlayPromise === playPromise) {
            lastPlayPromise = null;
          }
          if (import.meta.env.DEV) console.warn("[AudioAlert] Falha ao destravar áudio:", e);
        });
    }
  }, []);

  const playAlert = useCallback((loop = false) => {
    console.log("[AudioAlert] Tocando som oficial de notificação...");
    if (globalAudio) {
      globalAudio.currentTime = 0;
      globalAudio.loop = loop;
      globalAudio.volume = 1.0;
      const playPromise = globalAudio.play();
      lastPlayPromise = playPromise;
      playPromise
        .then(() => {
          isUnlocked = true;
          if (lastPlayPromise === playPromise) {
            lastPlayPromise = null;
          }
        })
        .catch((e) => {
          if (lastPlayPromise === playPromise) {
            lastPlayPromise = null;
          }
          console.warn("[AudioAlert] Falha ao tocar alerta sonoro:", e);
        });
    }
    triggerDeviceVibration();
  }, []);

  const startLoop = useCallback(() => {
    if (globalAudio) {
      if (!globalAudio.paused && globalAudio.currentTime > 0) {
        console.log("[AudioAlert] Áudio já está tocando em loop, mantendo reprodução contínua.");
        globalAudio.loop = true;
        globalAudio.volume = 1.0;
        return;
      }
      try {
        globalAudio.currentTime = 0;
        globalAudio.loop = true;
        globalAudio.volume = 1.0;
        const playPromise = globalAudio.play();
        lastPlayPromise = playPromise;
        playPromise
          .then(() => {
            isUnlocked = true;
            if (lastPlayPromise === playPromise) {
              lastPlayPromise = null;
            }
          })
          .catch((e) => {
            if (lastPlayPromise === playPromise) {
              lastPlayPromise = null;
            }
            console.warn("[AudioAlert] Falha ao tocar alerta sonoro em loop:", e);
          });
      } catch (e) {
        console.warn("[AudioAlert] Erro ao iniciar áudio:", e);
      }
    }

    if (!vibrationInterval) {
      triggerDeviceVibration();
      vibrationInterval = setInterval(() => {
        triggerDeviceVibration();
      }, 3500);
    }
  }, []);

  const stopLoop = useCallback(() => {
    if (globalAudio) {
      const performPause = () => {
        try {
          globalAudio.pause();
          globalAudio.currentTime = 0;
          globalAudio.loop = false;
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
