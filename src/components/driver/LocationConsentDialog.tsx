import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, ShieldCheck } from "lucide-react";

interface LocationConsentDialogProps {
  open: boolean;
  onAccept: () => void;
}

export function LocationConsentDialog({ open, onAccept }: LocationConsentDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="rounded-3xl max-w-[90vw] sm:max-w-md p-6 bg-background/95 backdrop-blur-xl border border-border shadow-2xl">
        <DialogHeader className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <DialogTitle className="text-xl font-bold text-center">Permissão de Localização</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground leading-relaxed" id="location-dialog-description">
            O É Pra Já coleta dados de localização para habilitar o rastreamento das suas entregas e o cálculo de rotas em tempo real, garantindo que os lojistas e clientes acompanhem o progresso do seu trabalho.
            <br /><br />
            Este recurso requer acesso à sua localização mesmo quando o aplicativo está em segundo plano ou fechado, mas apenas enquanto você estiver no modo Online.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted/50 rounded-2xl p-4 flex items-start gap-3 mt-2">
          <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Sua privacidade é importante. A localização só é compartilhada com o Admin e o Lojista quando você ativa o modo <strong>Online</strong>.
          </p>
        </div>

        <DialogFooter className="mt-6">
          <Button 
            onClick={onAccept} 
            className="w-full h-12 rounded-2xl font-bold text-lg gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
          >
            Entendi e Aceito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
