# Card de nova corrida: feedback ao aceitar/recusar, fallbacks e layout

## 1. Aceitar / Recusar com confirmação real

Hoje, ao tocar em ACEITAR, o card fecha e a confirmação acontece depois, em segundo plano — se falhar, o entregador só descobre pelo toast dentro do app. Ao tocar em RECUSAR não há nenhum retorno visual.

O que muda:
- O card só fecha depois que o servidor responder. Enquanto isso mostra o estado "Aceitando..." com os dois botões desabilitados (bloqueia clique duplo).
- Sucesso: o card mostra rapidamente "Corrida aceita" e abre o app já na entrega.
- Falha ou corrida já pega por outro: mostra "Corrida já foi aceita por outro entregador" e fecha, sem abrir o app.
- RECUSAR: botões desabilitam na hora, mostra "Recusada" por um instante e fecha.

## 2. Fluxo em primeiro e segundo plano

Duas rotas existem hoje: com o app vivo, a resposta vai pelo JS (plugin); com o app morto, o card chama a API direto. Ambas passarão a:
- Sempre confirmar contra o Supabase antes de fechar (a rota nativa já faz a chamada; a rota JS passa a esperar o resultado e devolver sucesso/erro para o card).
- Fechar sozinho quando outro entregador aceitar (loop de checagem já existe, será mantido e também interrompido durante o envio para não competir com o aceite).

Teste manual sugerido depois do novo APK: app aberto, app minimizado e app fechado/tela bloqueada — em cada caso conferir no painel que o status vira "aceita" com o entregador correto.

## 3. Fallbacks de dados

Regra única de preenchimento aplicada tanto no envio (edge function) quanto na exibição (card):
- Loja vazia -> "Loja Parceira"
- Coleta vazia -> "Retirada na Loja"
- Entrega vazia -> "Endereço do cliente"
- Ganhos vazio/zero -> "R$ 0,00"
- Textos "-", "—", "null", "undefined", "Veja no app" tratados como vazio.

Além disso, quando o payload chegar sem loja/endereço, o card busca os dados da corrida no Supabase pelo `deliveryId` e atualiza os campos ao vivo, em vez de ficar só no texto genérico.

## 4. Layout em telas e fontes diferentes

- Card com largura ~92% e altura máxima proporcional à tela (não mais 360dp fixos), corpo rolável.
- Endereços sem limite de linhas e sem reticências; nome da loja até 3 linhas.
- Botões sempre visíveis, fora da área rolável.
- Verificação com fonte grande (escala 1.3) e telas pequenas para garantir que coleta e entrega apareçam inteiros.

## Detalhes técnicos

- `IncomingCallActivity.java`: estado de envio (`isSubmitting`) para bloquear cliques repetidos; aceite passa a aguardar o retorno antes de `finish()`; toasts nativos de sucesso/erro; rota JS ganha callback de resultado; nova busca opcional em `deliveries`/`available_deliveries` para completar campos ausentes.
- `DeliveryOverlayPlugin.java` + `src/plugins/DeliveryOverlay.ts`: novo método para o JS devolver ao nativo o resultado do aceite (`reportCallResult`), consumido pelo card.
- `useDriverNotifications.ts`: no listener `onCallResponse`, chamar `reportCallResult` após o `safeRpc` (sucesso ou erro) — a lógica de negócio de aceite não muda.
- `activity_incoming_call.xml`: `ScrollView` com altura máxima relativa, `ellipsize` removido, paddings responsivos.
- `send-push`: normalização dos campos antes do envio (nunca string vazia ou "—").

## Observação

As mudanças em `android/` só aparecem depois de gerar um novo APK/AAB; a edge function precisa ser publicada.
