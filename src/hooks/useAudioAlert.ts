import { useCallback, useState } from "react";

// Use um som de alarme contínuo/sirene alto
const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3";
const FALLBACK_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

let globalAudio: HTMLAudioElement | null = null;

if (typeof window !== "undefined") {
  globalAudio = new Audio(NOTIFICATION_SOUND);
  globalAudio.addEventListener("error", () => {
    if (globalAudio) {
      globalAudio.src = FALLBACK_SOUND;
      globalAudio.load();
    }
  });
  globalAudio.load();
}

export function useAudioAlert() {
  const [isPlaying, setIsPlaying] = useState(false);

  const unlockAudio = useCallback(() => {
    if (globalAudio) {
      globalAudio.volume = 0; // Silent playback to unlock context
      globalAudio.play()
        .then(() => {
          globalAudio?.pause();
          if (globalAudio) globalAudio.currentTime = 0;
        })
        .catch((e) => {});
    }
  }, []);

  const playAlert = useCallback((loop = false) => {
    if (globalAudio) {
      globalAudio.currentTime = 0;
      globalAudio.volume = 1.0;
      globalAudio.loop = loop;
      globalAudio.play().then(() => setIsPlaying(true)).catch(e => {});
    }
    
    // Backup: Vibration API if available
    if (typeof navigator !== 'undefined' && "vibrate" in navigator) {
      if (loop) {
        navigator.vibrate([500, 250, 500, 250, 500, 250, 500]);
      } else {
        navigator.vibrate([400, 200, 400]);
      }
    }
  }, []);

  const stopAlert = useCallback(() => {
    if (globalAudio) {
      globalAudio.pause();
      globalAudio.currentTime = 0;
      globalAudio.loop = false;
      setIsPlaying(false);
    }
    if (typeof navigator !== 'undefined' && "vibrate" in navigator) {
      navigator.vibrate(0);
    }
  }, []);

  return { unlockAudio, playAlert, stopAlert, isPlaying };
}
