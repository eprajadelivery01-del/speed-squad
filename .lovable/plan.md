# Remover o modal de corrida e estabilizar as notificações

## Objetivo

Eliminar definitivamente o card/modal flutuante de **Aceitar/Recusar** mostrado sobre o app. A corrida continuará aparecendo normalmente na lista da tela inicial, onde os botões de ação já existem.

Manter os alertas de nova corrida por som, vibração, notificação do sistema e central de notificações, sem duplicidade e sem voltar a abrir uma tela de aceite.

## Diagnóstico confirmado

- O modal React já está desativado em `DriverHomePage`, mas o Android ainda abre `IncomingCallActivity` diretamente pelo Firebase, pelo `OverlayService` e pelo full-screen intent. Esses caminhos explicam o modal que ainda pisca sobre a tela.
- O mesmo push pode gerar mais de uma notificação nativa e mais de uma tentativa de abrir a activity.
- A tela nativa é atualmente responsável pelo som em alguns cenários; portanto, apenas removê-la faria o alerta sonoro deixar de funcionar.
- O hook de notificações é recriado ao navegar entre telas, perde a lista de corridas já vistas e pode alertar novamente sobre uma corrida antiga.
- O cleanup usa `App.removeAllListeners()`, que também remove listeners pertencentes a outras telas.
- Há um erro de TypeScript confirmado em `useDriverNotifications`: `playAlert(false)` chama uma função que não recebe argumentos.

## Implementação

### 1. Remover definitivamente o modal de aceitar/recusar

- Retirar do fluxo FCM todas as chamadas que iniciam `IncomingCallActivity`.
- Remover do `OverlayService` a ação que abre a activity; o serviço continuará somente com sua função de manter o processo ativo quando o entregador estiver online.
- Remover o full-screen intent e qualquer content intent que leve ao modal.
- Desregistrar a activity do manifesto e eliminar a interface nativa de popup que não terá mais uso.
- Manter intactos os botões **Aceitar** e **Recusar** presentes no card da corrida na tela inicial.

### 2. Tornar as notificações apenas informativas

- A notificação do Android exibirá loja, entrega e ganho, com som e vibração, mas sem abrir o modal e sem ações duplicadas de aceitar/recusar.
- Ao tocar na notificação, abrir o app na tela inicial para o entregador agir no próprio card da corrida.
- Na central interna, manter o registro e o status da corrida, removendo os botões redundantes de aceite/recusa.
- Quando a corrida for aceita, recusada, cancelada ou pega por outro entregador, cancelar o alerta correspondente e atualizar a central.

### 3. Garantir som e vibração sem depender do modal

- No Android em primeiro plano, segundo plano, tela bloqueada ou app encerrado, usar uma única notificação nativa de alta prioridade por corrida com o áudio `notification_sound.mp3` e vibração.
- Migrar para uma nova versão do canal Android para que aparelhos que já salvaram uma configuração antiga recebam corretamente o som configurado.
- No navegador/PWA, manter o áudio web após o desbloqueio por interação do usuário e a notificação do navegador quando autorizada.
- Corrigir a chamada inválida de `playAlert` e assegurar que aceitar, recusar, ficar offline ou a corrida expirar interrompa o loop web.

### 4. Eliminar duplicidades e alertas repetidos

- Consolidar a notificação Android em um único ID determinístico por entrega.
- Persistir durante a sessão quais corridas já foram anunciadas, evitando novo som ao trocar de aba ou rota.
- Manter Realtime como caminho principal e polling como fallback, com deduplicação compartilhada.
- Remover apenas os listeners criados pelo próprio hook, sem usar `App.removeAllListeners()`.
- Corrigir disparos duplicados dos eventos locais de aceite e recusa.

### 5. Revisar o pipeline de push

- Corrigir os erros de tipagem/compilação ligados ao fluxo de notificação.
- Validar o payload de nova corrida e de cancelamento, incluindo `deliveryId`, loja, coleta, entrega e ganho.
- Garantir que somente entregadores online com token válido recebam o push e que a corrida já indisponível não permaneça na central.
- Preservar o aceite atômico existente no Supabase; nenhuma aceitação será feita apenas no estado local.

## Validação

- Compilar o frontend e o projeto Android sem erros.
- Testar uma corrida nova com o app: aberto na tela inicial, aberto em outra aba, em segundo plano e com tela bloqueada.
- Confirmar em todos os cenários: um único aviso sonoro, uma única notificação, atualização da central e nenhum modal/popup de aceitar ou recusar.
- Testar aceite e recusa somente pelo card da corrida.
- Testar corrida aceita por outro entregador, modo offline, retorno ao app e navegação entre telas sem repetição do alerta.

## Atualização no aparelho

Como a correção altera código nativo Android, após receber o projeto será necessário executar primeiro o `git pull` e depois `npx cap sync android`, gerar e instalar uma nova versão do app. A versão já instalada não recebe essa remoção apenas com a publicação web.
