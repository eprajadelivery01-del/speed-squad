import { DriverLayout } from "@/components/driver/DriverLayout";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PrivacyPage() {
  return (
    <DriverLayout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">Última atualização: 07 de Abril de 2026</p>
        
        <ScrollArea className="h-[60vh] rounded-2xl border border-border p-6 bg-card">
          <div className="space-y-4 text-sm leading-relaxed">
            <h2 className="text-lg font-bold">1. Coleta de Dados</h2>
            <p>Coletamos nome, telefone, e-mail e dados de localização para o funcionamento da plataforma de entregas.</p>
            
            <h2 className="text-lg font-bold">2. Localização em Segundo Plano</h2>
            <p><strong>Importante:</strong> Coletamos dados de localização mesmo quando o app está em segundo plano para permitir o rastreamento das entregas em curso, desde que você esteja com o status "Online".</p>
            
            <h2 className="text-lg font-bold">3. Uso das Informações</h2>
            <p>As informações são usadas para conectar entregadores a lojistas, calcular rotas e processar pagamentos.</p>
            
            <h2 className="text-lg font-bold">4. Compartilhamento</h2>
            <p>Sua localização é compartilhada com o Lojista responsável pela entrega e com o Administrador do sistema durante a prestação do serviço.</p>
            
            <h2 className="text-lg font-bold">5. Segurança</h2>
            <p>Implementamos medidas de segurança para proteger seus dados contra acesso não autorizado.</p>
            
            <h2 className="text-lg font-bold">6. Exclusão de Dados</h2>
            <p>Você pode solicitar a exclusão de sua conta e todos os dados associados diretamente através do seu perfil no aplicativo.</p>
          </div>
        </ScrollArea>
      </div>
    </DriverLayout>
  );
}
