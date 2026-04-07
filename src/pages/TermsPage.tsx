import { DriverLayout } from "@/components/driver/DriverLayout";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TermsPage() {
  return (
    <DriverLayout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground">Última atualização: 07 de Abril de 2026</p>
        
        <ScrollArea className="h-[60vh] rounded-2xl border border-border p-6 bg-card">
          <div className="space-y-4 text-sm leading-relaxed">
            <h2 className="text-lg font-bold">1. Aceitação dos Termos</h2>
            <p>Ao utilizar o aplicativo É Pra Já, você concorda em cumprir estes termos de serviço e todas as leis aplicáveis.</p>
            
            <h2 className="text-lg font-bold">2. Licença de Uso</h2>
            <p>É concedida permissão para baixar uma cópia do aplicativo apenas para uso pessoal e comercial relacionado às entregas da plataforma.</p>
            
            <h2 className="text-lg font-bold">3. Rastreamento de Localização</h2>
            <p>O entregador reconhece que o rastreamento em tempo real é essencial para a operação. A localização será coletada enquanto o status estiver "Online".</p>
            
            <h2 className="text-lg font-bold">4. Responsabilidades</h2>
            <p>O entregador é responsável pela manutenção de seu veículo, documentação e conduta profissional durante as entregas.</p>
            
            <h2 className="text-lg font-bold">5. Pagamentos</h2>
            <p>Os repasses serão feitos conforme o ciclo estabelecido no painel administrativo, descontadas as taxas da plataforma.</p>
            
            <h2 className="text-lg font-bold">6. Modificações</h2>
            <p>O É Pra Já pode revisar estes termos a qualquer momento sem aviso prévio. Ao usar este aplicativo, você concorda em ficar vinculado à versão atual desses termos.</p>
          </div>
        </ScrollArea>
      </div>
    </DriverLayout>
  );
}
