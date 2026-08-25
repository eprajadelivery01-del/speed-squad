import { useCallback, useRef, useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

// Mesma URL de áudio oficial utilizada no painel do lojista
const ALERT_SOUND_URL = "/notification_sound.mp3";

let globalAudio: HTMLAudioElement | null = null;
let isAudioUnlocked = false;
let isUnlocking = false;
let lastPlayPromise: Promise<void> | null = null;
let vibrationInterval: any = null;
let pendingPlayOnUnlock = false;
let pendingLoop = false;

if (typeof window !== "undefined") {
  try {
    globalAudio = new Audio();
    globalAudio.src = ALERT_SOUND_URL + "?v=" + Date.now();
    globalAudio.load();
  } catch (e) {
    console.warn("[AudioAlert] Erro ao instanciar HTMLAudioElement:", e);
  }

  const unlockOnUserGesture = () => {
    if (isAudioUnlocked && !pendingPlayOnUnlock) return;
    if (isUnlocking) return;
    isUnlocking = true;
    try {
      if (globalAudio) {
        if (pendingPlayOnUnlock) {
          pendingPlayOnUnlock = false;
          globalAudio.currentTime = 0;
          globalAudio.loop = pendingLoop;
          globalAudio.volume = 1.0;
          const playPromise = globalAudio.play();
          lastPlayPromise = playPromise;
          playPromise
            .then(() => {
              isAudioUnlocked = true;
              isUnlocking = false;
              if (lastPlayPromise === playPromise) {
                lastPlayPromise = null;
              }
            })
            .catch(() => {
              if (lastPlayPromise === playPromise) {
                lastPlayPromise = null;
              }
              isUnlocking = false;
            });
          return;
        }

        const origVol = globalAudio.volume;
        globalAudio.volume = 0;
        const playPromise = globalAudio.play();
        lastPlayPromise = playPromise;
        playPromise
          .then(() => {
            try {
              globalAudio?.pause();
            } catch {}
            if (globalAudio) globalAudio.volume = origVol;
            isAudioUnlocked = true;
            isUnlocking = false;
            if (lastPlayPromise === playPromise) {
              lastPlayPromise = null;
            }
          })
          .catch(() => {
            if (lastPlayPromise === playPromise) {
              lastPlayPromise = null;
            }
            isUnlocking = false;
          });
      } else {
        isUnlocking = false;
      }
    } catch {
      isUnlocking = false;
    }
  };

  window.addEventListener("touchstart", unlockOnUserGesture, { capture: true, passive: true });
  window.addEventListener("pointerdown", unlockOnUserGesture, { capture: true, passive: true });
  window.addEventListener("click", unlockOnUserGesture, { capture: true });
  window.addEventListener("keydown", unlockOnUserGesture, { capture: true });
}

export function triggerDeviceVibration(pattern: number[] = [500, 200, 500, 200, 800]) {
  const canVibrate = Capacitor.isNativePlatform() || isAudioUnlocked;
  if (canVibrate && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

export function useAudioAlert() {
  const [isPlaying, setIsPlaying] = useState(false);
  const playingRef = useRef(false);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unlockAudio = useCallback(() => {
    if (globalAudio && !isAudioUnlocked && !isUnlocking) {
      isUnlocking = true;
      const originalVolume = globalAudio.volume;
      globalAudio.volume = 0;
      const playPromise = globalAudio.play();
      lastPlayPromise = playPromise;
      playPromise
        .then(() => {
          try {
            globalAudio?.pause();
          } catch {}
          if (globalAudio) globalAudio.volume = originalVolume;
          isAudioUnlocked = true;
          isUnlocking = false;
          if (lastPlayPromise === playPromise) {
            lastPlayPromise = null;
          }
        })
        .catch(() => {
          if (lastPlayPromise === playPromise) {
            lastPlayPromise = null;
          }
          isUnlocking = false;
        });
    }
  }, []);

  const stopAlert = useCallback(() => {
    pendingPlayOnUnlock = false;

    if (globalAudio) {
      const performPause = () => {
        try {
          globalAudio.pause();
          globalAudio.currentTime = 0;
          globalAudio.loop = false;
        } catch (e) {
          console.warn("[AudioAlert] Falha ao pausar:", e);
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

    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    playingRef.current = false;
    setIsPlaying(false);

    const canVibrate = Capacitor.isNativePlatform() || isAudioUnlocked;
    if (canVibrate && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(0);
      } catch {}
    }
  }, []);

  const playAlert = useCallback((loop = false) => {
    console.log("[AudioAlert] Tocando som oficial de notificação...");

    if (playingRef.current && globalAudio && !globalAudio.paused) {
      console.log("[AudioAlert] Áudio já está tocando, mantendo reprodução completa contínua.");
      return;
    }

    if (playingRef.current) {
      stopAlert();
    }

    playingRef.current = true;
    setIsPlaying(true);

    if (globalAudio) {
      try {
        globalAudio.currentTime = 0;
        globalAudio.loop = loop;
        globalAudio.volume = 1.0;
        const playPromise = globalAudio.play();
        lastPlayPromise = playPromise;
        playPromise
          .then(() => {
            isAudioUnlocked = true;
            pendingPlayOnUnlock = false;
            if (lastPlayPromise === playPromise) {
              lastPlayPromise = null;
            }
          })
          .catch((e: any) => {
            if (lastPlayPromise === playPromise) {
              lastPlayPromise = null;
            }
            if (e?.name === "NotAllowedError") {
              pendingPlayOnUnlock = true;
              pendingLoop = loop;
            }
            console.warn("[AudioAlert] HTML5 Audio bloqueado pelo navegador:", e);
          });
      } catch (e) {
        console.warn("[AudioAlert] HTML5 Audio erro:", e);
      }
    }

    // Vibração háptica
    triggerDeviceVibration([500, 200, 500, 200, 500]);
    if (loop && !vibrationInterval) {
      vibrationInterval = setInterval(() => {
        triggerDeviceVibration([500, 200, 500, 200, 500]);
      }, 3500);
    }

    if (loop) {
      timeoutIdRef.current = setTimeout(() => {
        stopAlert();
      }, 30_000);
    }
  }, [stopAlert]);

  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (vibrationInterval) {
        clearInterval(vibrationInterval);
        vibrationInterval = null;
      }
    };
  }, []);

  return { unlockAudio, playAlert, stopAlert, isPlaying };
}
