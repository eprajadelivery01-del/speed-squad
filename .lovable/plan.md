# Corrigir erros 400 de lojas e pedidos

## Objetivo
Eliminar as consultas inválidas ao Supabase, impedir a repetição de dezenas de requisições por entrega e preservar a exibição correta do nome da loja e das notificações.

## Alterações
1. **Corrigir a resolução do nome da loja**
   - Remover o uso de `companies.trade_name`, pois o schema atual de `companies` possui `name`, mas não `trade_name`.
   - Remover a consulta a `orders.company_name` e `orders.store_name`, pois essas colunas não existem no schema atual de `orders`.
   - Resolver o nome por dados já carregados (`companies.name`) e, quando necessário, por `company_id` usando somente colunas válidas.
   - Manter um fallback seguro para “É Pra Já Delivery” quando não houver empresa vinculada.

2. **Eliminar o efeito cascata de requisições 400**
   - Evitar uma consulta individual a `orders` e `companies` para cada entrega processada.
   - Reaproveitar as relações retornadas pela consulta principal e o cache existente.
   - Não repetir tentativas conhecidamente inválidas durante polling, realtime ou renderização da lista.

3. **Corrigir as consultas de notificações**
   - Trocar os selects de `companies(name, address, trade_name)` por campos existentes.
   - Manter loja, coleta, entrega e valor disponíveis no popup, central, toast e notificação nativa.
   - Preservar a lógica atual de som, aceite e recusa.

4. **Tratar o aviso de vibração do navegador**
   - Só chamar `navigator.vibrate` no navegador depois de uma interação válida do usuário.
   - Manter a vibração nativa do Android sem alteração.

5. **Verificação**
   - Validar que nenhuma consulta restante referencia `trade_name`, `company_name` ou `store_name` nas tabelas onde não existem.
   - Executar os testes aplicáveis e abrir a tela do entregador para conferir que listas e notificações carregam sem respostas 400.
   - Confirmar que nenhuma configuração, chave ou estrutura do banco foi alterada.

## Detalhes técnicos
- Arquivos centrais: resolvedor de nome da loja, serviço de entregas, hook de notificações e hook de áudio.
- A correção será somente no frontend; não haverá SQL, migration, alteração de RLS, `.env` ou projeto Supabase.
