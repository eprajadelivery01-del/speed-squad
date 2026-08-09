# Voltar o popup pequeno de "Nova Corrida" (com loja e endereços corretos)

## O que muda

Hoje a chamada de nova corrida abre uma tela nativa **em tela cheia** (fundo escuro, ícone grande, texto solto no meio). Vamos trocar por um **card pequeno flutuante**, igual ao do print: cabeçalho laranja "NOVA CORRIDA" com o X, corpo escuro com os dados e os dois botões RECUSAR / ACEITAR embaixo.

Além disso, no print faltam dados: não aparece o nome da loja e a Entrega mostra "—". Isso será corrigido enviando os campos **separados** (loja, coleta, entrega, ganhos) em vez de um texto único que o app precisa adivinhar.

## Como fica o card

```text
┌──────────────────────────────┐
│ 🛵 NOVA CORRIDA           ✕  │  ← faixa laranja
├──────────────────────────────┤
│ Loja Avenida                 │  ← nome da loja (destaque)
│ Ganhos            R$ 8,00    │
│ 📦 COLETA                    │
│ Rua X, 100 - Centro          │
│ 📍 ENTREGA                   │
│ Ari Kriff 300 - Jardim       │
├──────────────────────────────┤
│ [ ✕ RECUSAR ] [ ✓ ACEITAR ]  │
└──────────────────────────────┘
```

Continua acendendo a tela, tocando o som e vibrando, e continua fechando sozinho quando outro entregador aceita.

## Detalhes técnicos

1. **Layout** `activity_incoming_call.xml`: refeito como card compacto (largura ~90%, cantos arredondados, header laranja `#F97316`, corpo `#111827`), com IDs próprios: `tvStoreName`, `tvEarnings`, `tvPickup`, `tvDropoff`, `btnClose`, `btnAccept`, `btnReject`.
2. **`IncomingCallActivity`**: passa a usar tema de diálogo (`android:theme="@style/Theme.AppCompat.Dialog"` + `windowIsFloating`, fundo translúcido) no `AndroidManifest.xml`, para o card aparecer pequeno sobre a tela atual em vez de ocupar tudo. Preenche os novos campos a partir de extras separados (`storeName`, `pickup`, `dropoff`, `fee`), com fallback: se só vier o `details` antigo, faz o parse das linhas `Loja:/Coleta:/Entrega:/Ganhos:`. Campo vazio nunca vira "—": cai para "Loja Parceira", "Retirada na Loja", "Endereço do cliente".
3. **`MyFirebaseMessagingService`**: repassa os novos extras (`storeName`, `pickup`, `dropoff`, `fee`) do payload FCM para a Activity, o `OverlayService` e as estáticas do plugin, mantendo `details` para compatibilidade.
4. **`OverlayService`**: encaminha os mesmos extras no `SHOW_POPUP`.
5. **Edge function `send-push`**: além do `formattedDetails` atual, envia os campos separados `storeName`, `pickup`, `dropoff`, `fee` no `data` do FCM (a busca de loja/endereços já existe na função, hoje ela só concatena tudo em um texto).
6. **`DeliveryOverlayPlugin` + `src/plugins/DeliveryOverlay.ts`**: `testIncomingCall`/`updateIncomingCall` aceitam os campos opcionais novos; `useDriverNotifications.ts` passa loja, coleta, entrega e ganhos que já busca do Supabase.
7. A tela React `IncomingOrderScreen.tsx` (usada com o app aberto) não muda.

## Observação

As mudanças em `android/` só aparecem depois de gerar um novo APK/AAB; a alteração da edge function precisa ser publicada no Supabase.
