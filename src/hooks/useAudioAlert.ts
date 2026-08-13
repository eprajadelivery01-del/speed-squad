import { useCallback, useRef, useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

// Singleton HTMLAudioElement to guarantee consistent audio context unlocking across renders.
const ALERT_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

let globalAudio: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

const canUseBrowserVibration = () =>
  Capacitor.isNativePlatform() || navigator.userActivation?.hasBeenActive === true;

if (typeof window !== "undefined") {
  try {
    globalAudio = new Audio(ALERT_SOUND_URL);
    globalAudio.load();
  } catch (e) {
    console.warn("[AudioAlert] Erro ao instanciar HTMLAudioElement:", e);
  }

  const unlockOnUserGesture = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      if (globalAudio) {
        const origVol = globalAudio.volume;
        globalAudio.volume = 0;
        globalAudio.play().then(() => {
          globalAudio?.pause();
          if (globalAudio) globalAudio.volume = origVol;
        }).catch(() => {});
      }
    } catch {}
  };

  window.addEventListener("touchstart", unlockOnUserGesture, { once: true, capture: true });
  window.addEventListener("click", unlockOnUserGesture, { once: true, capture: true });
}

export function useAudioAlert() {
  const [isPlaying, setIsPlaying] = useState(false);
  const playingRef = useRef(false);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const synthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopSynthBeep = useCallback(() => {
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
  }, []);

  const playSynthBeep = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const playChimePair = () => {
        try {
          const now = ctx.currentTime;
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(880, now); // A5
          gain1.gain.setValueAtTime(0.8, now);
          gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.3);

          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(1320, now + 0.15); // E6
          gain2.gain.setValueAtTime(0.8, now + 0.15);
          gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now + 0.15);
          osc2.stop(now + 0.45);
        } catch (e) {
          console.warn("[AudioAlert] Erro sintetizador WebAudio:", e);
        }
      };

      playChimePair();
      stopSynthBeep();
      synthIntervalRef.current = setInterval(playChimePair, 1200);
    } catch (e) {
      console.warn("[AudioAlert] Falha sintetizador:", e);
    }
  }, [stopSynthBeep]);

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
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
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
    stopSynthBeep();

    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    playingRef.current = false;
    setIsPlaying(false);

    if (typeof navigator !== "undefined" && "vibrate" in navigator && canUseBrowserVibration()) {
      try {
        navigator.vibrate(0);
      } catch {}
    }
  }, [stopSynthBeep]);

  const playAlert = useCallback((loop = false) => {
    console.log("[AudioAlert] Tentando tocar som...");

    // Garante parada limpa da reprodução anterior se houver
    if (playingRef.current) {
      stopAlert();
    }

    playingRef.current = true;
    setIsPlaying(true);

    // 1) Sintetizador WebAudio API (Alerta senoidal duplo offline garantido)
    playSynthBeep();

    // 2) HTML5 Audio Element com MP3 de alta prioridade
    if (globalAudio) {
      try {
        globalAudio.currentTime = 0;
        globalAudio.loop = loop;
        globalAudio.volume = 1.0;
        globalAudio.play()
          .catch((e: any) => {
            console.warn("[AudioAlert] HTML5 Audio play travado por política do navegador/rede, mantendo sintetizador WebAudio:", e);
          });
      } catch (e) {
        console.warn("[AudioAlert] HTML5 Audio erro:", e);
      }
    }

    // 3) Vibração hápitca
    if (typeof navigator !== "undefined" && "vibrate" in navigator && canUseBrowserVibration()) {
      try {
        navigator.vibrate([500, 200, 500, 200, 500]);
      } catch {}
    }

    // Parar automaticamente após 30 segundos
    if (loop) {
      timeoutIdRef.current = setTimeout(() => {
        stopAlert();
      }, 30_000);
    }
  }, [playSynthBeep, stopAlert]);

  useEffect(() => {
    return () => {
      stopSynthBeep();
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [stopSynthBeep]);

  return { unlockAudio, playAlert, stopAlert, isPlaying };
}
