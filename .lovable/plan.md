Plano para corrigir as notificações de novas entregas:

1. Corrigir o escopo do alerta de novas entregas
- Garantir que o hook só monitore corridas quando o entregador estiver identificado e online.
- Usar uma fonte consistente para corridas disponíveis (`available_deliveries`/`deliveries`) e tratar `pending` e `broadcasted` como novas corridas.
- Remover a lógica frágil que ignora a primeira busca de forma que pode esconder corrida recém-criada antes do listener ficar pronto.

2. Consolidar o disparo de notificação
- Criar uma função interna única para “nova corrida” que sempre faça as três coisas juntas: tocar som, mostrar toast e adicionar item na central.
- Evitar duplicidade entre realtime e polling usando um `Set` persistente por hook para IDs já notificados.
- Incluir endereço correto usando `pickup_address`, `delivery_address`, `dropoff_address` ou `address`, conforme disponível.

3. Corrigir o som
- Trocar o áudio remoto por um fallback mais confiável quando o MP3 externo falhar.
- Marcar o som como desbloqueado após clique do usuário e não depender de uma preferência incompatível entre `localStorage`, `sessionStorage` e Capacitor Preferences.
- Manter vibração como reforço no mobile.

4. Corrigir a central de notificações
- Garantir que `addNotification` seja chamado tanto no polling quanto no realtime.
- Tornar os IDs das notificações estáveis o suficiente para não quebrar renderização e manter o contador de não lidas.

5. Reduzir falhas no nativo/preview
- Evitar registrar o plugin `BackgroundMode` mais de uma vez, que hoje aparece nos logs como aviso recorrente.
- Não depender de Service Worker no preview para esse fluxo.
- Manter notificações locais do Capacitor quando estiver em app nativo e notificações do navegador quando estiver na web.

6. Validação
- Revisar se o hook é montado pelo `DriverLayout` nas telas do entregador.
- Rodar teste/verificação seletiva apropriada para garantir que não há erro de TypeScript/runtime no fluxo alterado.
- Confirmar o comportamento esperado: nova corrida detectada → som toca → toast aparece → item entra na central → badge aumenta.