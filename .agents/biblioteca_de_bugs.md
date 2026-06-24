# Biblioteca de Bugs Conhecidos e Soluções (App do Entregador)

## 1. Variável Global implícita no hashId (NaN)
- **Problema:** O método `hashId()` no `useDriverNotifications` usava a variável `hash` sem usar `let` ou `const`, o que resultava em `NaN` na hora de cancelar notificações via ID numérico.
- **Solução:** Adicionado `let hash = 0;` dentro do bloco da função.

## 2. Race condition ao aceitar corrida
- **Problema:** O botão "Aceitar" enviava um update genérico sem verificar se a corrida ainda estava `pending` ou `broadcasted`. Isso permitia que dois entregadores aceitassem a mesma corrida simultaneamente.
- **Solução:** Adicionado `.in("status", ["pending", "broadcasted"])` na mutation de update quando o status for `"accepted"`.

## 3. Estado volátil para corridas rejeitadas
- **Problema:** A rejeição de uma corrida na `DriverHomePage` ficava salva apenas num array local do React. Ao reabrir o app, a corrida rejeitada reaparecia.
- **Solução:** Importada e chamada a função `declineDeliveryLocally()` que persiste a recusa no `localStorage`.

## 4. Notificações curtas e sem dados reais (Tela bloqueada e popup)
- **Problema:** A trigger do Supabase (`payload.new`) devolvia os dados sem o JOIN da tabela `companies`. Com isso, a notificação exibia "Retirada na loja" e não exibia o valor da corrida. Além disso, a tela desligada não acendia porque estava sendo usado `startOverlay()` (que só exibe uma bolinha) em vez da Native Activity.
- **Solução:** Refatorada a função `notifyNewDelivery` para ser `async`, faz um `select` específico buscando os dados formatados (`*, companies(name)`), monta a string completa, e aciona o método nativo `DeliveryOverlay.testIncomingCall()` que acorda a tela via `IncomingCallActivity`.
