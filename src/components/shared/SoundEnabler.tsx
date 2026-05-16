import React, { useState, useEffect } from "react";
import { Volume2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function SoundEnabler() {
  const [isVisible, setIsVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    const soundEnabled = sessionStorage.getItem("sound_enabled") || sessionStorage.getItem("epj_sound_enabled");
    if (!soundEnabled) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const enableSound = async () => {
    setEnabling(true);
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
      audio.volume = 0.5;
      await audio.play();

      sessionStorage.setItem("sound_enabled", "true");
      setIsVisible(false);
      toast({ title: "Som ativado!", description: "Você receberá alertas sonoros de novas entregas." });
    } catch (error) {
      console.error("Erro ao ativar som:", error);
      toast({ title: "Erro ao ativar som", description: "Clique novamente para tentar.", variant: "destructive" });
    } finally {
      setEnabling(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm animate-in slide-in-from-bottom-10">
      <div className="bg-foreground text-background p-4 rounded-3xl shadow-2xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shrink-0">
          <Volume2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-black">Ativar avisos sonoros?</p>
        </div>
        <button
          onClick={enableSound}
          disabled={enabling}
          className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
        >
          {enabling ? "..." : "Ativar"}
        </button>
        <button onClick={() => setIsVisible(false)} className="p-1 opacity-50">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
