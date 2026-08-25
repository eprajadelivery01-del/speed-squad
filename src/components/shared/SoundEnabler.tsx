import React, { useState, useEffect } from "react";
import { Volume2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAudioAlert, isAudioGloballyUnlocked } from "@/hooks/useAudioAlert";
import { Capacitor } from "@capacitor/core";

export function SoundEnabler() {
  const [isVisible, setIsVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const { unlockAudio } = useAudioAlert();
  const { toast } = useToast();

  useEffect(() => {
    // No app nativo (Android), o áudio funciona direto via MediaPlayer sem restrição de clique
    if (Capacitor.isNativePlatform()) {
      setIsVisible(false);
      return;
    }

    // Se já estiver destravado na sessão atual, não exibe
    if (isAudioGloballyUnlocked()) {
      setIsVisible(false);
      return;
    }

    // Mostra banner para o usuário dar 1 toque e destravar o áudio no navegador
    setIsVisible(true);

    const handleUnlocked = () => {
      setIsVisible(false);
    };

    window.addEventListener("epraja-audio-unlocked", handleUnlocked);
    return () => {
      window.removeEventListener("epraja-audio-unlocked", handleUnlocked);
    };
  }, []);

  const enableSound = () => {
    setEnabling(true);
    try {
      unlockAudio();
      setIsVisible(false);
      toast({ title: "🔊 Alerta sonoro ativado!", description: "Você receberá o som das novas corridas." });
    } catch (error) {
      console.error("Erro ao ativar som:", error);
    } finally {
      setEnabling(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm animate-in slide-in-from-bottom-10">
      <div 
        onClick={enableSound}
        className="bg-foreground text-background p-4 rounded-3xl shadow-2xl flex items-center gap-3 cursor-pointer hover:scale-[1.02] transition-transform border border-primary/20"
      >
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shrink-0 animate-bounce">
          <Volume2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black leading-tight">Clique para ativar o som</p>
          <p className="text-[10px] opacity-70 truncate">Toque para ouvir as corridas recebidas</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); enableSound(); }}
          disabled={enabling}
          className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 shrink-0"
        >
          {enabling ? "..." : "Ativar"}
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsVisible(false); }} 
          className="p-1 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
