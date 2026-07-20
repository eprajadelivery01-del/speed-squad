## Contexto atual

O app tem um watermark simples "BONASOFT" sem espaçamento e sem identidade visual em:
- `src/pages/driver/DriverHomePage.tsx` (linha 695-698)
- `src/pages/driver/DriverDeliveriesPage.tsx` (linha 153-156)
- `src/components/GlobalErrorBoundary.tsx` (linha 118)

O rodapé real (bottom navigation) está em `src/components/driver/DriverLayout.tsx`. O watermark atual aparece acima da navegação, no final do conteúdo de cada página.

## Objetivo

Criar uma identidade visual para **B O N A S O F T** (com espaçamento entre letras) usando o padrão grego (meandro) da imagem de referência, posicionada no rodapé do app. A peça deve transmitir: credibilidade, elegância, autenticidade e organização.

## Decisões de design

- **Padrão escolhido:** faixa horizontal reta (primeiro padrão da imagem) — é mais estável para rodapé, não distorce em telas pequenas e passa solidez.
- **Estilo:** vetorial com gradientes metálicos dourados/bronze inspirados na referência, linhas finas e simétricas.
- **Tipografia:** fonte serif clássica para o nome, com tracking amplo (letras espaçadas), centralizado sobre o padrão.
- **Modo escuro/claro:** o componente adapta a cor do padrão e do texto ao tema atual do app (dark/light) usando tokens do projeto.

## Plano de implementação

### 1. Criar componente reutilizável

Criar `src/components/shared/BonasoftFooter.tsx`:
- Renderiza um SVG do padrão meandro grego horizontal.
- Sobrepõe o texto "B O N A S O F T" centralizado.
- Aceita prop opcional `variant: "light" | "dark"` ou detecta via tema do projeto.
- Responde ao modo escuro com cores invertidas (bronze claro sobre fundo escuro, bronze escuro sobre fundo claro).
- Inclui margem e padding adequados para não colidir com a bottom navigation ou conteúdo.

### 2. Gerar/codificar o padrão grego

Criar `public/bonasoft-greek-pattern.svg`:
- SVG do padrão meandro horizontal reto com ornamento central (palmetta) simplificado.
- Cores em gradientes dourados/bronze, sem textura 3D para manter leveza e escalabilidade.
- Repetível horizontalmente e centralizado.

### 3. Aplicar o rodapé nas páginas do driver

Substituir os blocos manuais em:
- `src/pages/driver/DriverHomePage.tsx`
- `src/pages/driver/DriverDeliveriesPage.tsx`

Também adicionar `<BonasoftFooter />` automaticamente em `src/components/driver/DriverLayout.tsx`, posicionado entre o `<main>` e a `<nav>` de bottom navigation, garantindo que **todas** as páginas do driver exibam a mesma identidade visual.

### 4. Ajustar GlobalErrorBoundary (se necessário)

Verificar se faz sentido manter ou substituir o "BONASOFT" do `GlobalErrorBoundary.tsx`. Como é tela de erro, pode ser mantido simples ou trocado pela nova marca. Será decidido na implementação conforme harmonia visual.

### 5. Verificação

- Build passa sem erros de TypeScript.
- Rodapé não cobre botões ou bottom navigation em viewports mobile (384x680 e superiores).
- Visual coerente nos temas claro e escuro.

## Entregáveis

- `src/components/shared/BonasoftFooter.tsx`
- `public/bonasoft-greek-pattern.svg`
- Atualização em `src/components/driver/DriverLayout.tsx`
- Remoção/substituição dos watermarks manuais em `DriverHomePage.tsx` e `DriverDeliveriesPage.tsx`
- Possível ajuste em `GlobalErrorBoundary.tsx`