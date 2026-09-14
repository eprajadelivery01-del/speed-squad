# Corrigir o botão de WhatsApp do entregador

## O que foi confirmado no código hoje

- O telefone do cliente vem do campo `customer_phone` (existe tanto na tabela `deliveries` quanto na visão `available_deliveries`), e é repassado ao card da entrega.
- O link atual é montado assim: `https://wa.me/55` + telefone com os símbolos removidos. Ou seja, o `55` é sempre colado na frente. Quando o telefone já está salvo com `55` (ou com `+55`), o número vira `5555669...` — um número inexistente. O WhatsApp, ao receber um número inválido, abre o app sem conversa/rascunho, que é exatamente a tela "Você" que apareceu no teste.
- O botão hoje usa o ícone genérico de balão de conversa (`MessageCircle`), não o símbolo do WhatsApp.
- O app não tem nenhuma biblioteca de abertura de links externos instalada; os links são `<a target="_blank">` dentro do app Android, o que nem sempre entrega o texto pré-preenchido.

## O que será feito

1. **Uma função única de telefone** (novo arquivo utilitário)
   - Remove `+`, espaços, parênteses, traços e pontos.
   - Se já começar com `55` e tiver o tamanho de um número brasileiro completo, mantém como está (nunca duplica o 55).
   - Se tiver 10 ou 11 dígitos (DDD + número), acrescenta o `55`.
   - Se o resultado não tiver tamanho válido, é considerado inválido.

2. **Abertura do WhatsApp**
   - Monta o endereço `https://wa.me/NUMERO?text=MENSAGEM` com a mensagem codificada.
   - Abre pelo mecanismo externo do Android (janela `_system`), com uma segunda tentativa direta caso a primeira seja bloqueada — garantindo que o texto chegue preenchido.
   - Sem telefone cadastrado ou telefone inválido: não abre nada e mostra o aviso "Cliente sem telefone cadastrado."
   - Se o aparelho não tiver WhatsApp, o próprio endereço `wa.me` cai na versão web; se nada abrir, mostra "WhatsApp não está instalado neste aparelho."
   - A ação pode ser repetida quantas vezes quiser ao voltar ao app (nenhum estado fica travado).

3. **Mensagem** — exatamente a mesma que você definiu, sem alteração.

4. **Ícone** — o símbolo do WhatsApp (telefone dentro do balão arredondado) desenhado como imagem vetorial própria, sem instalar nenhuma biblioteca nova. O botão continua verde WhatsApp, no mesmo tamanho e no mesmo lugar do card, agora com o rótulo curto "Pedir localização" onde houver espaço — visivelmente diferente do botão de suporte/ocorrência.

5. **Diagnóstico temporário** — registro apenas de: id da entrega, telefone bruto e telefone normalizado, para conferirmos o teste no Android. Nenhum nome ou endereço. Removidos depois da sua confirmação.

6. **Visibilidade do WhatsApp no Android 11+** — declaração no arquivo de configuração do Android para que o app consiga entregar o link ao WhatsApp instalado.

## O que não será tocado

Nenhuma alteração de banco: sem migração, sem mexer em pedidos, entregas, clientes, telefones, permissões, funções de servidor ou autenticação. Nenhuma API do WhatsApp — apenas o link direto para o app instalado.

## Detalhes técnicos

- Novo `src/lib/whatsapp.ts`: `normalizeBrPhone(raw): string | null` e `openWhatsApp({ phone, message })`.
- Novo `src/components/shared/WhatsAppIcon.tsx`: SVG inline do glifo do WhatsApp (`currentColor`).
- `src/pages/driver/DriverDeliveriesPage.tsx`: trocar os dois `<a href="https://wa.me/55...">` por botões que chamam `openWhatsApp` com `delivery.customer_phone`; destino sempre o cliente, nunca o usuário autenticado. O link da loja passa a usar a mesma normalização (sem mensagem).
- `android/app/src/main/AndroidManifest.xml`: bloco `<queries>` com `com.whatsapp` / `com.whatsapp.w4b` e intent `ACTION_VIEW` https.
- Build validado no fim; depois disso é preciso `git pull`, `npx cap sync android` e gerar o APK/AAB para o teste real no aparelho — o teste no Android real só pode ser feito por você, e eu listo os passos e o resultado esperado de cada um dos testes 1 a 9.
