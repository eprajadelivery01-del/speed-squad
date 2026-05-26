import { useCallback, useEffect } from "react";

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2353/2353-preview.mp3";
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
  const unlockAudio = useCallback(() => {
    if (globalAudio) {
      globalAudio.volume = 0; // Silent playback to unlock context
      globalAudio.play()
        .then(() => {})
        .catch((e) => {});
    }
  }, []);

  const playAlert = useCallback(() => {
    if (globalAudio) {
      globalAudio.currentTime = 0;
      globalAudio.volume = 1.0;
      globalAudio.play().catch(e => {});
    }
    
    // Backup: Vibration API if available
    if (typeof navigator !== 'undefined' && "vibrate" in navigator) {
      navigator.vibrate([400, 200, 400]);
    }
  }, []);

  return { unlockAudio, playAlert };
}
