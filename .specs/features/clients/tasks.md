# Clients Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/clients/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Inferida do repositório. **Guias encontrados**: `CLAUDE.md` (seções de testes, convenções de código e a regra de rodar `test:db` e `test:rls` juntos ao mexer em política), `README.md` (seção de testes), `vitest.config.ts` (dois projetos, ambientes distintos), `package.json` (o script `test` encadeia descoberta, unitários, banco e RLS), `scripts/check-test-discovery.mjs` (impede que um arquivo de teste deixe de ser executado). Vinte e sete arquivos de teste unitário e cinco de RLS serviram de amostra de estilo e localização, e valem como **piso**: nenhuma camada recebe teste menos completo do que a equivalente em `auth`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Módulos puros (filtros, busca, formato) | unit | Toda função tem caso de sucesso e de contorno; cada edge case do spec tem um teste nomeado | `src/features/clients/*.test.ts` | `npm run test:unit` |
| Schemas Zod | unit | Toda regra do schema tem um caso que passa e um que falha, com a mensagem por campo asserida | `src/features/clients/schemas.test.ts` | `npm run test:unit` |
| Serviços de feature | unit **e** integration | Unitário assere o payload por igualdade profunda e a consulta montada; o de pilha real prova persistência e a recusa do grant pelo `42501` | `src/features/clients/services/*.test.ts` e `tests/rls/*.test.ts` | `npm run test:unit` e `npm run test:rls` |
| Hooks de dados | unit | Cada hook: chave de consulta, estados de carregamento e erro, e a invalidação exata que dispara | `src/features/clients/hooks/*.test.ts` | `npm run test:unit` |
| Cliente de cache | unit | A ligação é asserida no cliente construído, não na função isolada | `src/lib/query-client.test.ts` | `npm run test:unit` |
| Componentes de interface | unit | Renderização, cada estado declarado, interação por teclado, e a associação de rótulo e erro | `src/components/ui/*.test.tsx` | `npm run test:unit` |
| Componentes de feature | unit | Cada estado do design e cada interação que altera a URL ou dispara mutação | `src/features/clients/components/*.test.tsx` | `npm run test:unit` |
| Telas | unit | Validação por campo, envio, prevenção de duplo envio, e cada um dos cinco estados de tela | `src/features/clients/pages/*.test.tsx` | `npm run test:unit` |
| Fiação de rotas | unit | A árvore real tem as rotas sob a guarda correta, sem `loader` | `src/app/router.test.tsx` | `npm run test:unit` |
| Fluxo ponta a ponta | e2e | O roteiro de `clients` do PLAN §13: cadastrar, achar por busca e filtro, editar, excluir, com a URL restaurada em nova aba | `e2e/*.spec.ts` | `npm run test:e2e` |

**Três lições aplicadas a esta matriz.** **L-001** (confirmada) manda verificar a camada de grant no catálogo, sempre com controle positivo: as tarefas de escrita do serviço asserem o `42501` de uma coluna fora do grant *e* o sucesso da coluna que está dentro. **L-009** manda que serviço novo nasça com teste unitário e de pilha real no mesmo commit — é por isso que as duas tarefas de serviço carregam as duas camadas, e não há tarefa de teste separada. E a lição da `foundation` sobre asserir no objeto construído vale para o `MutationCache`: o teste prende `queryClient.getMutationCache().config.onError`, não a existência da função.

**Nenhuma tarefa declara `Tests: none`.** Esta feature não cria configuração de ferramental nem migration: tudo que ela entrega é lógica, interface ou comportamento observável.

## Gate Check Commands

> Extraídas do `package.json` do projeto.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tarefas com testes unitários apenas | `npm run lint && npm run typecheck && npm run test:unit` |
| Full | Tarefas que tocam o Supabase, rotas ou fluxo | `npm run lint && npm run typecheck && npm run test && npm run test:e2e` |
| Build | Tarefas de fiação ou que alteram a árvore de rotas | `npm run lint && npm run typecheck && npm run build && npm run test:unit` |

`npm run test` já encadeia a verificação de descoberta, os unitários, o pgTAP e a suíte de RLS, e falha se um arquivo de teste deixar de ser executado.

---

## Execution Plan

Fases são ordenadas e rodam em sequência; dentro de uma fase, as tarefas rodam em ordem.

### Phase 1: Módulos puros e serviço

Sem interface. Tudo que as telas e os hooks vão consumir. As três primeiras não tocam rede.

```
T1 → T2 → T3 → T4 → T5 → T6
```

### Phase 2: Cache e hooks

```
T7 → T8 → T9
```

### Phase 3: Componentes reutilizáveis

Nascem aqui porque têm dois consumidores cada, nas fases seguintes.

```
T10 → T11 → T12 → T13 → T14
```

### Phase 4: Formulário e telas de escrita

```
T15 → T16 → T17 → T18
```

### Phase 5: Listagem

```
T19 → T20 → T21 → T22 → T23 → T24
```

### Phase 6: Ficha e exclusão

```
T25 → T26
```

### Phase 7: Integração

```
T27 → T28
```

---

## Task Breakdown

### Phase 1: Módulos puros e serviço

#### T1: Tradução entre a URL e os filtros

**What**: Módulo puro que lê `URLSearchParams` em filtros tipados e escreve o caminho de volta, com padrões, restrição de `sort` e `order`, e página mínima de 1.
**Where**: `src/features/clients/filtros.ts`
**Depends on**: None
**Reuses**: a forma de `src/features/auth/destino.ts`, que já resolve uma questão de URL em módulo puro
**Requirement**: CLNT-09, CLNT-10, CLNT-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `lerFiltros` aplica os padrões do AD-015: `created_at` decrescente, página 1
- [x] `sort` e `order` fora do conjunto conhecido caem no padrão, em vez de chegarem à consulta
- [x] Página menor que 1 ou não numérica vira 1
- [x] Termo de busca só com espaços é lido como busca vazia (edge case do spec)
- [x] `escreverFiltros` omite o que é padrão, de modo que a URL limpa continue limpa
- [x] Ida e volta é idempotente: `lerFiltros(escreverFiltros(f))` devolve `f`
- [x] Contagem de testes: 12 testes passam (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done
**Commit**: `feat(clients): traduz a URL em filtros tipados`

---

#### T2: Termo de busca e escape de curingas

**What**: Módulo puro que normaliza o termo digitado e monta os padrões de `ilike`, com os três achados medidos na fase Design presos por teste.
**Where**: `src/features/clients/busca.ts`
**Depends on**: T1
**Reuses**: nada; é a lógica nova onde as medições do design ficam travadas
**Requirement**: CLNT-08

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `normalizarTermo` apara, colapsa espaços internos, remove acentos por `NFD` e baixa a caixa
- [x] Teste com `José Gonçalves ÃÕÜÊ ação` produz exatamente o que `immutable_unaccent` produziu na medição do design, cedilha incluída
- [x] `escaparCuringas` escapa `\`, `%` e `_` — **a contrabarra primeiro**, senão ela escapa o escape recém-inserido
- [x] Teste prova que `%` e `_` digitados casam literalmente, e não como curinga (edge case do spec)
- [x] Teste documenta que `*` **permanece curinga**, conforme o edge case emendado: é o comportamento medido do PostgREST, e se ele mudar este teste é o alarme
- [x] `soDigitos` reduz `(11) 98765-4321` a dígitos, para casar contra o telefone armazenado
- [x] `padroesDeBusca` devolve o padrão de texto e, quando o termo tem dígitos, também o de telefone
- [x] Contagem de testes: 14 testes passam (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done
**Commit**: `feat(clients): normaliza o termo de busca e escapa curingas`

---

#### T3: Schema de validação e domínios

**What**: `schemaDeCliente` espelhando as oito constraints da migration, mais os três conjuntos de valor e rótulo em português.
**Where**: `src/features/clients/schemas.ts`
**Depends on**: T2
**Reuses**: a forma de `src/features/auth/schemas.ts`
**Requirement**: CLNT-01, CLNT-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `name` exige de 2 a 120 caracteres, como `clients_name_length`
- [x] `email` vazio é aceito; preenchido com formato inválido é recusado, como `clients_email_format`
- [x] `phone` aceita de 8 a 20 dígitos depois de retirada a máscara, como `clients_phone_digits`
- [x] `income` recusa negativo e acima de 99.999.999,99, como `clients_income_range`
- [x] `region` até 80 caracteres, como `clients_region_length`
- [x] `status`, `source` e `income_type` aceitam só os valores dos respectivos checks; `status` tem `lead` por padrão
- [x] Renda vazia com tipo de renda preenchido é aceita (edge case do spec)
- [x] Cada limite tem um caso que passa e um que falha, com a mensagem em português asserida
- [x] Contagem de testes: 20 testes passam (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done
**Commit**: `feat(clients): adiciona schema de validação do cliente`

---

#### T4: Formatação de renda, telefone e data

**What**: Módulo puro de apresentação: renda em BRL com separador de milhar e duas casas, telefone com máscara a partir dos dígitos, e data legível.
**Where**: `src/features/clients/formato.ts`
**Depends on**: T3
**Reuses**: nada
**Requirement**: CLNT-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Renda é exibida como BRL com separador de milhar e duas casas, conforme a premissa do spec
- [x] Renda nula é exibida como ausência, e não como `R$ 0,00` — os dois significam coisas diferentes
- [x] Entrada de renda aceita dígitos com e sem máscara e chega ao schema como número
- [x] Telefone de 10 e de 11 dígitos recebe a máscara correspondente; comprimento inesperado é exibido como está, sem quebrar
- [x] Datas de criação e atualização são exibidas em formato brasileiro
- [x] Contagem de testes: 12 testes passam (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done

> **Módulo não nomeado no `design.md`.** A necessidade está no spec — a premissa de moeda e o CLNT-14 AC1 — mas o desenho listou a formatação dentro das telas sem lhe dar arquivo. Extraído aqui porque três telas o consomem: listagem, ficha e formulário.

**Commit**: `feat(clients): formata renda, telefone e data`

---

#### T5: Leituras do serviço de clientes

**What**: `listarClientes`, `buscarCliente` e `listarRegioes`, mais as chaves de consulta compartilhadas.
**Where**: `src/features/clients/services/client-service.ts`
**Depends on**: T4
**Reuses**: `src/features/auth/services/profile-service.ts` como molde; `tests/rls/helpers.ts` para semear dados reais
**Requirement**: CLNT-04, CLNT-07, CLNT-08, CLNT-09, CLNT-11, CLNT-14

**Tools**:
- MCP: `context7`
- Skill: `supabase`

**Done when**:
- [x] `listarClientes` faz **um** request com `count: 'exact'` e `.range()`, devolvendo clientes e total
- [x] A busca é **um** `ilike` sobre `search_text`, nunca um `.or()` de três colunas
- [x] Filtros de status, origem e região são combinados por E lógico com a busca
- [x] `buscarCliente` propaga o erro e **não** fabrica cliente vazio — o caminho de erro tem teste próprio
- [x] `listarRegioes` agrupa por `lower()` e ordena alfabeticamente, agrupando variações de caixa (edge case do spec)
- [x] `owner_id` não aparece em nenhum filtro: a política já restringe, e filtrar aqui daria a impressão falsa de que é o filtro que protege
- [x] Teste de pilha real: dois usuários, e cada um lista somente os seus
- [x] Teste de pilha real: busca por trecho de nome com acento e por telefone com máscara encontram o cliente
- [x] Teste de pilha real: página além do total devolve lista vazia, sem erro
- [x] Contagem de testes: 16 unitários e 8 de RLS passam (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test`

**Tests**: unit e integration
**Gate**: full
**Status**: ✅ Done
**Commit**: `feat(clients): adiciona as leituras do serviço de clientes`

---

#### T6: Escritas do serviço de clientes

**What**: `criarCliente`, `atualizarCliente` e `excluirCliente`, devolvendo união discriminada.
**Where**: `src/features/clients/services/client-service.ts` (modificar)
**Depends on**: T5
**Reuses**: `traduzirErro` de `auth-service.ts` como referência de tradução em ponto único
**Requirement**: CLNT-02, CLNT-15, CLNT-17

**Tools**:
- MCP: `context7`
- Skill: `supabase`

**Done when**:
- [ ] `criarCliente` envia `owner_id` do usuário autenticado, exigido pelo `with check` da política
- [ ] `atualizarCliente` envia **somente** as oito colunas do grant de update, asserido por igualdade **profunda** do payload (L-001)
- [ ] Teste assere negativamente que o payload não contém `owner_id`, `created_at` nem `updated_at`
- [ ] Teste de pilha real: escrever uma coluna fora do grant é recusada com `42501` — controle positivo junto, provando que a coluna de dentro passa (L-001)
- [ ] Teste de pilha real: criar, reler e confirmar que os triggers normalizaram nome, e-mail, telefone e região
- [ ] Teste de pilha real: excluir um cliente com notas apaga as notas por cascata
- [ ] Teste de pilha real: tentar atualizar cliente de outro usuário não altera nada
- [ ] Erro do banco vira mensagem em português num ponto único, e os dados digitados não são perdidos
- [ ] Contagem de testes: 14 unitários e 10 de RLS passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test`

**Tests**: unit e integration
**Gate**: full
**Commit**: `feat(clients): adiciona as escritas do serviço de clientes`

---

### Phase 2: Cache e hooks

#### T7: Tratamento global do 401 em mutação

**What**: `mutationCache` no `queryClient`, fechando o AD-016 e a dívida D3 da verificação de `auth`.
**Where**: `src/lib/query-client.ts` (modificar)
**Depends on**: T6
**Reuses**: `aoFalharConsulta`, que já existe e já é usada pelo `queryCache`
**Requirement**: CLNT-05, AD-016

**Tools**:
- MCP: `context7`
- Skill: NONE

**Done when**:
- [ ] `mutationCache: new MutationCache({ onError: aoFalharConsulta })` no cliente construído
- [ ] Teste assere `queryClient.getMutationCache().config.onError === aoFalharConsulta`, no cliente construído e não na função isolada
- [ ] Teste prova que 401 em mutação encerra a sessão, e que `42501` **não** encerra
- [ ] O teste equivalente do `queryCache` continua passando, sem deleção
- [ ] Contagem de testes: os testes existentes de `query-client.test.ts` mais 4 novos passam
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick

> **Dívida D3 de `auth`.** O relatório da rodada 2 registrou que a detecção estava ligada só às leituras e que a única escrita de `auth` engolia o 401 numa mensagem genérica. Esta tarefa fecha isso para as três mutações de `clients` e, de passagem, para a edição de perfil.

**Commit**: `fix(lib): trata falha de autorização nas mutações`

---

#### T8: Hooks de leitura

**What**: `useClients`, `useClient` e `useRegioes`, com as chaves derivadas dos filtros.
**Where**: `src/features/clients/hooks/leitura.ts`
**Depends on**: T7
**Reuses**: a convenção de chave compartilhada de `CHAVE_DO_PERFIL`
**Requirement**: CLNT-07, CLNT-13

**Tools**:
- MCP: `context7`
- Skill: NONE

**Done when**:
- [ ] A chave de `useClients` inclui todos os filtros, de modo que mudar qualquer um refaz a consulta
- [ ] `useClients` mantém a página anterior visível durante a troca, em vez de piscar esqueleto a cada paginada
- [ ] `useRegioes` tem `staleTime` longo e chave própria, por ser lista que muda pouco
- [ ] Cada hook expõe os estados de carregamento e de erro que as telas consomem
- [ ] Contagem de testes: 10 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(clients): adiciona os hooks de leitura`

---

#### T9: Hooks de escrita e invalidação

**What**: `useCreateClient`, `useUpdateClient` e `useDeleteClient`, com a invalidação num lugar só.
**Where**: `src/features/clients/hooks/escrita.ts`
**Depends on**: T8
**Reuses**: o padrão de invalidação de `Perfil.tsx`, que invalida por chave em vez de escrever no cache
**Requirement**: CLNT-02, CLNT-15, CLNT-17

**Tools**:
- MCP: `context7`
- Skill: NONE

**Done when**:
- [ ] As três mutações invalidam a chave de listagem, asserido pela chave exata
- [ ] Atualizar e excluir invalidam também a chave do cliente individual
- [ ] Nenhuma mutação escreve no cache à mão: o total e a paginação se recalculam pela consulta refeita (CLNT-17 AC4)
- [ ] Nenhuma mutação trata 401 por conta própria — isso é do `MutationCache` de T7 (AD-016)
- [ ] Contagem de testes: 12 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(clients): adiciona os hooks de escrita`

---

### Phase 3: Componentes reutilizáveis

#### T10: Variante destrutiva do botão

**What**: Variante `destrutiva` em `Botao`, usando os tokens de feedback já medidos.
**Where**: `src/components/ui/Botao.tsx` (modificar)
**Depends on**: T9
**Reuses**: o próprio `Botao`, cujo comentário já declara que esta variante nasce em `clients`
**Requirement**: CLNT-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] A variante usa `bg-danger-fill` com `text-danger-ink`, o par medido em 5.31:1
- [ ] É visualmente distinta da primária, exigência da §11 do PLAN — asserido pelo `data-variante`, como as outras duas
- [ ] `enviando` continua valendo, cobrindo o CLNT-16 AC8
- [ ] Contagem de testes: os testes existentes de `Botao.test.tsx` mais 3 novos passam
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ui): adiciona a variante destrutiva do botão`

---

#### T11: Campo de seleção

**What**: `Selecao`, o par de `Campo` para `select`, com as mesmas garantias de rótulo e erro.
**Where**: `src/components/ui/Selecao.tsx`
**Depends on**: T10
**Reuses**: `src/components/ui/Campo.tsx` como referência de acessibilidade
**Requirement**: CLNT-03, CLNT-18

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Rótulo é prop obrigatória, como em `Campo` — não existe seleção sem rótulo
- [ ] Erro é associado por `aria-describedby` e marcado por `aria-invalid`
- [ ] Aceita opção vazia, para os campos onde deixar em branco é válido
- [ ] Operável por teclado, com foco visível
- [ ] Contagem de testes: 8 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ui): adiciona campo de seleção`

---

#### T12: Campo com sugestões

**What**: `CampoComSugestoes`, campo de texto que oferece valores já usados sem fechar a lista.
**Where**: `src/components/ui/CampoComSugestoes.tsx`
**Depends on**: T11
**Reuses**: `src/components/ui/Campo.tsx`
**Requirement**: CLNT-04, CLNT-18

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Oferece as sugestões recebidas e **aceita um valor novo**, pois o AD-009 não fecha a lista
- [ ] Rótulo, dica e erro se comportam como em `Campo`
- [ ] Lista vazia de sugestões não quebra o campo nem esconde o controle
- [ ] Contagem de testes: 7 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ui): adiciona campo com sugestões`

---

#### T13: Diálogo modal acessível

**What**: `Dialogo` com foco confinado, fechamento por Escape e devolução do foco à origem.
**Where**: `src/components/ui/Dialogo.tsx`
**Depends on**: T12
**Reuses**: nada; é o componente que entrega o CLNT-18 AC3 e AC4
**Requirement**: CLNT-16, CLNT-18

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Ao abrir, o foco vai para dentro do diálogo
- [ ] A tabulação fica confinada: do último elemento volta ao primeiro, e do primeiro para trás vai ao último
- [ ] Escape fecha **sem executar a ação**
- [ ] Ao fechar, o foco volta ao elemento que o abriu — asserido, e não suposto
- [ ] A opção de cancelar é a focada por padrão (CLNT-16 AC2)
- [ ] Tem `role="dialog"`, `aria-modal` e rótulo acessível ligado ao título
- [ ] Contagem de testes: 12 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ui): adiciona diálogo modal acessível`

---

#### T14: Esqueleto de conteúdo

**What**: `Esqueleto`, o preenchimento de carregamento que substitui área em branco.
**Where**: `src/components/feedback/Esqueleto.tsx`
**Depends on**: T13
**Reuses**: `src/components/feedback/Carregando.tsx` como referência de anúncio assistivo
**Requirement**: CLNT-13

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Aceita contagem de linhas, para servir à tabela, aos cartões e à ficha
- [ ] Anuncia carregamento em região assistiva, em vez de só aparecer visualmente (CLNT-18 AC7)
- [ ] Não anuncia repetidamente a cada nova linha
- [ ] Contagem de testes: 6 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ui): adiciona esqueleto de conteúdo`

---

### Phase 4: Formulário e telas de escrita

#### T15: Formulário de cliente

**What**: `FormularioDeCliente`, um componente só, consumido pelo cadastro e pela edição.
**Where**: `src/features/clients/components/FormularioDeCliente.tsx`
**Depends on**: T14
**Reuses**: `Campo`, `Selecao`, `CampoComSugestoes`, `Botao`, `Alerta`, `schemaDeCliente`, `formato.ts`
**Requirement**: CLNT-01, CLNT-03, CLNT-05, CLNT-18

**Tools**:
- MCP: `context7`
- Skill: NONE

**Done when**:
- [ ] Nove campos, com só `name` obrigatório e `status` pré-selecionado em lead
- [ ] Validação vem do `schemaDeCliente` por `@hookform/resolvers`, sem regra duplicada na tela
- [ ] Erro aparece no campo correspondente e **a requisição não é enviada**
- [ ] Na falha de validação, o foco vai para o primeiro campo inválido (CLNT-18 AC5)
- [ ] Durante o envio, o botão fica desabilitado e um segundo envio é impedido
- [ ] Recusa do serviço exibe a causa em `Alerta` e **preserva tudo que foi digitado**
- [ ] Pré-preenche a partir de valores existentes, para servir à edição
- [ ] Expõe o estado de sujeira, que T16 consome
- [ ] Contagem de testes: 20 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(clients): adiciona o formulário de cliente`

---

#### T16: Confirmação de saída com alterações não salvas

**What**: `ConfirmacaoDeSaida`, ligando `useBlocker` ao `Dialogo`.
**Where**: `src/features/clients/components/ConfirmacaoDeSaida.tsx`
**Depends on**: T15
**Reuses**: `Dialogo` de T13; o estado de sujeira exposto por T15
**Requirement**: CLNT-06

**Tools**:
- MCP: `context7`
- Skill: NONE

**Done when**:
- [ ] Bloqueia a navegação interna quando há alterações pendentes, e não bloqueia quando não há
- [ ] Confirmar descarta e prossegue para o destino que estava bloqueado
- [ ] Cancelar mantém o consultor onde está, com o formulário intacto
- [ ] Salvar com sucesso **não** dispara o bloqueio — o teste cobre essa ordem, que é onde o `useBlocker` costuma errar
- [ ] Um comentário registra o limite medido na fase Design: não intercepta recarregar nem fechar a aba
- [ ] Contagem de testes: 8 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(clients): confirma saída com alterações não salvas`

---

#### T17: Tela de cadastro de cliente

**What**: `NovoCliente`, em `/clients/new`.
**Where**: `src/features/clients/pages/NovoCliente.tsx`
**Depends on**: T16
**Reuses**: `FormularioDeCliente`, `ConfirmacaoDeSaida`, `useCreateClient`
**Requirement**: CLNT-01, CLNT-02, CLNT-05, CLNT-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Cadastro com só o nome preenchido cria o cliente
- [ ] Após criar, exibe confirmação e navega para a ficha do cliente criado
- [ ] Recusa do serviço mantém os dados digitados na tela
- [ ] Sair com alterações pendentes pede confirmação
- [ ] Contagem de testes: 10 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(clients): adiciona a tela de cadastro`

---

#### T18: Tela de edição de cliente

**What**: `EditarCliente`, em `/clients/:id/edit`.
**Where**: `src/features/clients/pages/EditarCliente.tsx`
**Depends on**: T17
**Reuses**: `FormularioDeCliente`, `ConfirmacaoDeSaida`, `useClient`, `useUpdateClient`, `Esqueleto`
**Requirement**: CLNT-15, CLNT-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Formulário chega pré-preenchido com os valores atuais
- [ ] Enquanto carrega, exibe esqueleto em vez de área em branco
- [ ] Salvar altera, confirma e navega de volta para a ficha
- [ ] Editar um cliente excluído em outra aba exibe o estado de não encontrado ao salvar, em vez de falhar em silêncio (edge case do spec)
- [ ] Sair com alterações pendentes pede confirmação
- [ ] Contagem de testes: 12 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(clients): adiciona a tela de edição`

---

### Phase 5: Listagem

#### T19: Barra de busca com atraso

**What**: `BarraDeBusca`, com estado local e escrita na URL após 300ms sem digitação.
**Where**: `src/features/clients/components/BarraDeBusca.tsx`
**Depends on**: T18
**Reuses**: `filtros.ts` de T1; `Campo`
**Requirement**: CLNT-08

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Digitar não dispara consulta por tecla: a URL só muda após 300ms sem nova digitação
- [ ] O teste usa temporizador falso e prova que cinco teclas em sequência produzem **uma** escrita na URL
- [ ] Ao aplicar a busca, a página volta para a primeira (CLNT-13 AC8)
- [ ] O campo reflete o termo que veio da URL ao abrir a tela
- [ ] Contagem de testes: 9 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(clients): adiciona a barra de busca com atraso`

---

#### T20: Painel de filtros

**What**: `PainelDeFiltros`, com status, origem e região combinados por E lógico.
**Where**: `src/features/clients/components/PainelDeFiltros.tsx`
**Depends on**: T19
**Reuses**: `Selecao`, `filtros.ts`, `useRegioes`
**Requirement**: CLNT-04, CLNT-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] As opções de região vêm do `useRegioes`, em ordem alfabética
- [ ] Mudar qualquer filtro escreve na URL e volta para a primeira página
- [ ] Os filtros chegam preenchidos a partir da URL ao abrir a tela
- [ ] Existe ação de limpar os filtros, consumida pelo estado de busca sem resultado
- [ ] Abaixo de 768px os filtros continuam acessíveis
- [ ] Contagem de testes: 11 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(clients): adiciona o painel de filtros`

---

#### T21: Tabela de clientes

**What**: `TabelaDeClientes`, a apresentação de 768px para cima.
**Where**: `src/features/clients/components/TabelaDeClientes.tsx`
**Depends on**: T20
**Reuses**: `formato.ts`; os tokens do design system
**Requirement**: CLNT-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Cabeçalhos de coluna permitem ordenar por nome e por data, alternando crescente e decrescente
- [ ] A ordenação corrente é anunciada por `aria-sort`, e não apenas por ícone
- [ ] Nome muito longo é truncado visualmente sem quebrar o layout, com o valor completo acessível (edge case do spec)
- [ ] Dois clientes de mesmo nome são distinguíveis por e-mail ou telefone (edge case do spec)
- [ ] Renda aparece formatada em BRL
- [ ] Contagem de testes: 12 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(clients): adiciona a tabela de clientes`

---

#### T22: Cartões de clientes

**What**: `CartoesDeClientes`, a apresentação abaixo de 768px.
**Where**: `src/features/clients/components/CartoesDeClientes.tsx`
**Depends on**: T21
**Reuses**: `formato.ts`; a mesma lista que a tabela recebe
**Requirement**: CLNT-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Cada cartão leva ao cliente e mostra nome, contato, status e região
- [ ] A alternância com a tabela é por classe utilitária, não por `matchMedia` — funciona no primeiro quadro, sem salto de layout
- [ ] Teste prova que as duas árvores recebem a mesma lista, de modo que não exista dado só no desktop
- [ ] Contagem de testes: 8 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(clients): adiciona os cartões de clientes`

---

#### T23: Paginação

**What**: `Paginacao`, com total exibido e navegação entre páginas pela URL.
**Where**: `src/features/clients/components/Paginacao.tsx`
**Depends on**: T22
**Reuses**: `filtros.ts`; `Botao`
**Requirement**: CLNT-07, CLNT-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Exibe o total de clientes que satisfazem os filtros correntes
- [ ] Páginas de 20; avançar e voltar escrevem a página na URL
- [ ] Página solicitada acima do total exibe a última existente (edge case do spec)
- [ ] Nos limites, os controles ficam inativos em vez de produzir página inválida
- [ ] Contagem de testes: 10 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(clients): adiciona a paginação`

---

#### T24: Tela de listagem

**What**: `ListaDeClientes`, compondo busca, filtros, apresentação e paginação, com os cinco estados de tela.
**Where**: `src/features/clients/pages/ListaDeClientes.tsx`
**Depends on**: T23
**Reuses**: todos os componentes da fase 5; `useClients`; `Esqueleto`; `TelaDeErro`
**Requirement**: CLNT-07, CLNT-10, CLNT-11, CLNT-13

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Carregando exibe esqueleto; nenhum dos cinco estados exibe área em branco
- [ ] Sem nenhum cliente, exibe o estado inicial que convida ao primeiro cadastro
- [ ] Com filtros que não retornam nada, exibe busca sem resultado **com ação de limpar**, distinta do estado inicial
- [ ] Falha na consulta exibe erro com ação de tentar de novo, **sem perder os filtros da URL**
- [ ] Abrir uma URL com filtros restaura exatamente aquele estado de listagem
- [ ] Contagem de testes: 16 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(clients): adiciona a tela de listagem`

---

### Phase 6: Ficha e exclusão

#### T25: Ficha do cliente

**What**: `FichaDoCliente`, em `/clients/:id`, com os dados cadastrais e as ações.
**Where**: `src/features/clients/pages/FichaDoCliente.tsx`
**Depends on**: T24
**Reuses**: `useClient`, `formato.ts`, `Esqueleto`, `Botao`
**Requirement**: CLNT-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Exibe todos os campos cadastrados, com renda em BRL e as datas de criação e atualização
- [ ] Identificador inexistente ou de outro usuário exibe não encontrado, **sem revelar que o registro existe**
- [ ] Enquanto carrega, exibe esqueleto
- [ ] Oferece editar, excluir e voltar para a listagem **preservando os filtros de origem**
- [ ] Reserva o ponto onde a lista de notas entra, sem implementá-la
- [ ] Contagem de testes: 12 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(clients): adiciona a ficha do cliente`

---

#### T26: Exclusão com confirmação

**What**: `DialogoDeExclusao` e sua ligação na ficha e na listagem, com o recuo de página.
**Where**: `src/features/clients/components/DialogoDeExclusao.tsx`
**Depends on**: T25
**Reuses**: `Dialogo` de T13; `Botao` variante destrutiva de T10; `useDeleteClient`
**Requirement**: CLNT-16, CLNT-17

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] O diálogo nomeia o cliente e avisa que a ação é irreversível e que as notas serão removidas junto
- [ ] A ação destrutiva é visualmente distinta e o cancelamento é o foco padrão
- [ ] Confirmar exclui, confirma e retorna à listagem com os filtros anteriores preservados
- [ ] Durante a exclusão, o progresso é indicado e uma segunda confirmação é impedida
- [ ] Falha na exclusão mantém o registro visível e exibe a mensagem
- [ ] Cancelar fecha sem nenhuma alteração
- [ ] Se a página corrente ficar vazia e existir anterior, a listagem recua uma página
- [ ] Contagem de testes: 14 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(clients): adiciona a exclusão com confirmação`

---

### Phase 7: Integração

#### T27: Ligar as rotas de clientes à árvore

**What**: As quatro rotas de `clients` na árvore real, substituindo o lugar-tenente.
**Where**: `src/app/router.tsx` (modificar)
**Depends on**: T26
**Reuses**: `RotaProtegida` e `AppLayout`, que já envolvem `/clients`
**Requirement**: CLNT-01, CLNT-14, CLNT-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `/clients`, `/clients/new`, `/clients/:id` e `/clients/:id/edit` ficam sob `RotaProtegida` e `AppLayout`
- [ ] O lugar-tenente `App.tsx` sai da rota, e o comentário que o explicava sai com ele
- [ ] O teste de rotas passa a asserir as quatro rotas novas, e o que afirmava o lugar-tenente é **atualizado, não apagado**
- [ ] A asserção de que nenhuma rota tem `loader` continua valendo (AD-013)
- [ ] `/clients/:id/notes` **não** existe, conforme decisão registrada no `context.md`
- [ ] Contagem de testes: os testes existentes de `router.test.tsx` mais 6 novos passam
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run build && npm run test:unit`

**Tests**: unit
**Gate**: build
**Commit**: `feat(clients): liga as rotas de clientes à árvore`

---

#### T28: Fluxo de clientes ponta a ponta

**What**: O roteiro do PLAN §13 para `clients`, em navegador real.
**Where**: `e2e/clients.spec.ts`
**Depends on**: T27
**Reuses**: `e2e/auth.spec.ts` para o preâmbulo de sessão; `e2e/mailpit.ts` se precisar de conta nova
**Requirement**: CLNT-07 a CLNT-17

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Cadastrar um cliente com só o nome leva à ficha dele, e ele aparece no topo da listagem
- [ ] Com 25 clientes semeados, filtrar por região e status, copiar a URL e abrir em **outra aba** mostra a mesma lista (teste independente do spec)
- [ ] Buscar por trecho de nome com acento e por telefone com máscara encontra o cliente
- [ ] Editar o status reflete na ficha e na listagem
- [ ] Excluir um cliente com notas o remove da listagem, e o total se recalcula
- [ ] Todo o fluxo de cadastro, edição e exclusão é percorrido **apenas pelo teclado**, sem perder o foco (critério de sucesso do spec)
- [ ] Nenhum erro de console em nenhuma das telas
- [ ] Contagem de testes: os 15 E2E existentes mais 7 novos passam
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `test(e2e): cobre o fluxo de clientes ponta a ponta`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6
Phase 2:  T7 → T8 → T9
Phase 3:  T10 → T11 → T12 → T13 → T14
Phase 4:  T15 → T16 → T17 → T18
Phase 5:  T19 → T20 → T21 → T22 → T23 → T24
Phase 6:  T25 → T26
Phase 7:  T27 → T28
```

A execução é estritamente sequencial: não há paralelismo dentro de uma fase.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1, T2, T4: módulos puros | 1 módulo cada | ✅ Granular |
| T3: schema e domínios | 1 módulo | ✅ Granular |
| T5: leituras do serviço | 3 funções de leitura no mesmo arquivo | ⚠️ Aceito — coesas, e separá-las produziria commit com chave de consulta sem consumidor |
| T6: escritas do serviço | 3 mutações no mesmo arquivo | ⚠️ Aceito — as três compartilham a tradução de erro e o mesmo teste de grant |
| T7: `MutationCache` | 1 arquivo modificado | ✅ Granular |
| T8, T9: hooks | 1 módulo cada, agrupados por leitura e escrita | ⚠️ Aceito — a invalidação de T9 só faz sentido com as três mutações juntas |
| T10–T14: componentes reutilizáveis | 1 componente cada | ✅ Granular |
| T15, T16: formulário e bloqueio | 1 componente cada | ✅ Granular |
| T17, T18: telas de escrita | 1 tela cada | ✅ Granular |
| T19–T23: componentes de listagem | 1 componente cada | ✅ Granular |
| T24: tela de listagem | 1 tela (composição) | ✅ Granular |
| T25: ficha | 1 tela | ✅ Granular |
| T26: exclusão | 1 componente mais a ligação que o torna alcançável | ⚠️ Aceito — o diálogo sem ligação seria código sem consumidor |
| T27: fiação de rotas | 1 arquivo modificado | ✅ Granular |
| T28: fluxo ponta a ponta | 1 arquivo de teste | ✅ Granular |

As quatro marcas ⚠️ são deliberadas, e todas pela mesma razão: dividi-las produziria um commit contendo código sem nenhum consumidor, o que a fase Execute não conseguiria verificar.

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama | Status |
| ---- | ------------------ | -------- | ------ |
| T1 | None | — | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | T6 | cruza fase | ✅ isento |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T9 | cruza fase | ✅ isento |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | cruza fase | ✅ isento |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T18 | cruza fase | ✅ isento |
| T20 | T19 | T19 → T20 | ✅ |
| T21 | T20 | T20 → T21 | ✅ |
| T22 | T21 | T21 → T22 | ✅ |
| T23 | T22 | T22 → T23 | ✅ |
| T24 | T23 | T23 → T24 | ✅ |
| T25 | T24 | cruza fase | ✅ isento |
| T26 | T25 | T25 → T26 | ✅ |
| T27 | T26 | cruza fase | ✅ isento |
| T28 | T27 | T27 → T28 | ✅ |

Como em `foundation` e `auth`, `Depends on` registra o antecessor imediato, que é verdadeiro sob execução sequencial e mais restritivo que a dependência mínima. O acoplamento real, mais frouxo, está em `Reuses`. Nenhuma tarefa depende de fase posterior.

---

## Test Co-location Validation

| Task | Camada criada | Matriz exige | Tarefa declara | Status |
| ---- | ------------- | ------------ | -------------- | ------ |
| T1, T2, T4 | Módulos puros | unit | unit | ✅ |
| T3 | Schemas Zod | unit | unit | ✅ |
| T5, T6 | Serviço de feature | unit **e** integration | unit e integration | ✅ |
| T7 | Cliente de cache | unit | unit | ✅ |
| T8, T9 | Hooks de dados | unit | unit | ✅ |
| T10–T13 | Componentes de interface | unit | unit | ✅ |
| T14 | Componente de interface | unit | unit | ✅ |
| T15, T16 | Componentes de feature | unit | unit | ✅ |
| T17, T18 | Telas | unit | unit | ✅ |
| T19–T23 | Componentes de feature | unit | unit | ✅ |
| T24, T25 | Telas | unit | unit | ✅ |
| T26 | Componente de feature | unit | unit | ✅ |
| T27 | Fiação de rotas | unit | unit | ✅ |
| T28 | Fluxo ponta a ponta | e2e | e2e | ✅ |

Nenhuma violação, e **nenhuma tarefa declara `Tests: none`**. As duas tarefas de serviço carregam as duas camadas no mesmo commit, o que é a lição L-009 aplicada antes de o defeito acontecer, e não depois.

---

## Cobertura dos requisitos

| Requisito | Tarefas |
| --------- | ------- |
| CLNT-01 | T3, T15, T17, T27 |
| CLNT-02 | T6, T9, T17 |
| CLNT-03 | T3, T11, T15 |
| CLNT-04 | T5, T12, T20 |
| CLNT-05 | T7, T15, T17 |
| CLNT-06 | T16, T17, T18 |
| CLNT-07 | T5, T8, T23, T24, T28 |
| CLNT-08 | T2, T5, T19, T28 |
| CLNT-09 | T1, T5, T20, T28 |
| CLNT-10 | T1, T23, T24, T28 |
| CLNT-11 | T1, T5, T21, T24 |
| CLNT-12 | T21, T22 |
| CLNT-13 | T8, T14, T24 |
| CLNT-14 | T4, T5, T25, T28 |
| CLNT-15 | T6, T9, T18, T27, T28 |
| CLNT-16 | T10, T13, T26, T28 |
| CLNT-17 | T6, T9, T26, T28 |
| CLNT-18 | T11, T12, T13, T14, T15 |

Os dezoito requisitos têm ao menos duas tarefas, e nenhuma tarefa existe sem requisito que a exija.
