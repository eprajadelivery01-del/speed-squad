import { useCallback, useRef, useState, useEffect } from "react";

// Singleton HTMLAudioElement to guarantee consistent audio context unlocking across renders.
const ALERT_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

let globalAudio: HTMLAudioElement | null = null;

if (typeof window !== "undefined") {
  globalAudio = new Audio(ALERT_SOUND_URL);
  globalAudio.load();
}

export function useAudioAlert() {
  const [isPlaying, setIsPlaying] = useState(false);
  const playingRef = useRef(false);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unlockAudio = useCallback(() => {
    if (globalAudio) {
      const originalVolume = globalAudio.volume;
      globalAudio.volume = 0;
      globalAudio.play()
        .then(() => {
          globalAudio?.pause();
          if (globalAudio) globalAudio.volume = originalVolume;
        })
        .catch((e) => {
          console.warn("[AudioAlert] Falha ao destravar áudio:", e);
        });
    }
  }, []);

  const stopAlert = useCallback(() => {
    if (globalAudio) {
      try {
        globalAudio.pause();
        globalAudio.currentTime = 0;
      } catch (e) {
        console.warn("[AudioAlert] Falha ao parar áudio:", e);
      }
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    playingRef.current = false;
    setIsPlaying(false);

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(0);
    }
  }, []);

  const playAlert = useCallback((loop = false) => {
    // Try to play even if no flag is set, browser policy will handle any true blocks.
    console.log("[AudioAlert] Tentando tocar som...");

    if (playingRef.current) return;
    playingRef.current = true;
    setIsPlaying(true);

    if (globalAudio) {
      globalAudio.currentTime = 0;
      globalAudio.loop = loop;
      globalAudio.volume = 1.0;
      globalAudio.play()
        .catch((e) => {
          console.warn("[AudioAlert] Falha ao tocar alerta sonoro:", e);
          playingRef.current = false;
          setIsPlaying(false);
        });
    }

    // Trigger vibration API if available
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }

    // Auto-stop after 2 minutes to prevent infinite looping if driver is away
    if (loop) {
      timeoutIdRef.current = setTimeout(() => {
        stopAlert();
      }, 120_000);
    }
  }, [stopAlert]);

  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  return { unlockAudio, playAlert, stopAlert, isPlaying };
}

