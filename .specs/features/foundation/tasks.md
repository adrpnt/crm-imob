# Foundation Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/foundation/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Gerada a partir do spec, do design e da varredura do repositório — confirmar antes do Execute. **Guias encontrados: nenhum** (não há `AGENTS.md`, `CONTRIBUTING.md`, `docs/` nem configuração de teste). Aplicados os padrões fortes: todo AC do spec e todo edge case listado recebem teste.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Schema: tabelas, constraints, triggers | integration (pgTAP) | Toda check constraint do design tem um caso que passa e um que falha; todo trigger tem seu efeito asseverado, incluindo os edge cases do spec (região só com espaços, telefone com máscara, `updated_at` enviado pelo cliente) | `supabase/tests/database/*.test.sql` | `npm run test:db` |
| Segurança: políticas RLS e grants | integration (pgTAP + Vitest) | Matriz completa por tabela: {select, insert, update, delete} × {dono, outro usuário, anônimo}; mais a mesma garantia atravessando o PostgREST | `supabase/tests/database/*.test.sql` e `tests/rls/*.test.ts` | `npm run test:db` e `npm run test:rls` |
| Módulos de `src/lib/` | unit | Todas as ramificações; 1:1 com os ACs que o módulo realiza; todo edge case listado | `src/lib/*.test.ts` | `npm run test:unit` |
| Componentes React | unit | Renderização, cada estado descrito no AC e cada interação declarada | `src/**/*.test.tsx` | `npm run test:unit` |
| Fluxo de ponta a ponta | e2e | Carga da aplicação e navegação básica; os fluxos de negócio entram nas features seguintes | `e2e/*.spec.ts` | `npm run test:e2e` |
| Configuração, tipos gerados e fiação | none | — | — | apenas gate de build |

## Gate Check Commands

> Geradas junto com os scripts de `package.json` — confirmar antes do Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tarefas com testes unitários apenas | `npm run lint && npm run typecheck && npm run test:unit` |
| Full | Tarefas que tocam banco, RLS ou E2E | `npm run lint && npm run typecheck && npm run test:unit && npm run test:db && npm run test:rls` |
| Build | Tarefas de configuração, tipos ou fiação | `npm run lint && npm run typecheck && npm run build && npm run test:unit` |

`test:db` e `test:rls` exigem o Supabase local em execução (`supabase start`). O setup da suíte falha com mensagem explícita se não estiver, conforme o edge case do spec.

---

## Execution Plan

As fases rodam em sequência; dentro de cada fase as tarefas rodam em ordem.

### Phase 1: Esqueleto do projeto

Nada pode ser verificado antes disto existir.

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Banco de dados

O schema completo com sua segurança. Cada tabela nasce já protegida.

```
T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13
```

### Phase 3: Tipos e verificação pelo cliente

Fecha o laço entre o schema e o TypeScript, e prova o isolamento pelo caminho real.

```
T14 → T15 → T16
```

### Phase 4: Esqueleto da aplicação

A moldura que as features seguintes preenchem.

```
T17 → T18 → T19 → T20 → T21 → T22
```

---

## Task Breakdown

### Phase 1: Esqueleto do projeto

#### T1: Criar o projeto Vite com React e TypeScript

**What**: Gerar o projeto base e ajustar a estrutura de diretórios para a do PLAN §3.
**Where**: raiz do repositório — scaffold do Vite mais os diretórios de `src/`
**Depends on**: None
**Reuses**: nada — é o ponto de origem
**Requirement**: FND-01

**Tools**:
- MCP: `context7` (versões e sintaxe atuais de Vite e React)
- Skill: NONE

**Done when**:
- [x] `npm run dev` serve a aplicação e a página renderiza sem erro no console
- [x] Existem `src/app/`, `src/components/{ui,layout,feedback}/`, `src/features/`, `src/lib/`, `src/styles/`, `src/types/`
- [x] Dependências fixadas em versão exata, sem `^`, e lockfile commitado
- [x] Gate check passa: `npm run lint && npm run build`

**Tests**: none
**Gate**: build (reduzido — ver nota)
**Status**: ✅ Done

> **Nota de gate**: o gate de build completo invoca `typecheck` e `test:unit`, scripts que só passam a existir em T2 e T3. Exigi-los aqui era um erro de ordenação na minha quebra de tarefas. T1 roda o subconjunto executável (`lint` e `build`); a partir de T2 o gate de build vale integralmente.
**Commit**: `chore(setup): cria projeto Vite com React e TypeScript`

---

#### T2: Configurar ESLint, Prettier e os scripts de npm

**What**: Lint, formatação e os nove scripts que o spec exige.
**Where**: configuração de ESLint e Prettier mais a seção de scripts
**Depends on**: T1
**Reuses**: projeto gerado em T1
**Requirement**: FND-01, FND-14

**Tools**:
- MCP: `context7` (configuração plana atual do ESLint)
- Skill: NONE

**Done when**:
- [x] Existem os scripts `dev`, `build`, `lint`, `format`, `typecheck`, `test:unit`, `test:db`, `test:rls`, `test:e2e`, `db:reset`, `db:types`
- [x] `npm run lint` e `npm run typecheck` saem com código zero e sem aviso
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build
**Status**: ✅ Done

> **Decisão de execução**: o template atual do Vite entrega oxlint, não ESLint. Confirmado com o usuário manter ESLint e Prettier, como o PLAN §2 especifica, pela cobertura completa das regras de hooks do React. Os presets do `eslint-plugin-react-hooks` v7 ainda são publicados em formato eslintrc, então o plugin é ligado à mão no flat config — há comentário no `eslint.config.js` explicando. `lint` roda com `--max-warnings 0` para satisfazer o FND-01, que exige saída sem aviso.
**Commit**: `chore(setup): configura ESLint, Prettier e scripts de npm`

---

#### T3: Configurar o Vitest com o projeto de testes unitários

**What**: Vitest em ambiente jsdom com Testing Library, mais um teste de fumaça que prova a suíte funcionando.
**Where**: `vitest.config.ts`
**Depends on**: T2
**Reuses**: scripts de T2
**Requirement**: FND-14

**Tools**:
- MCP: `context7` (configuração de projetos do Vitest na versão atual)
- Skill: NONE

**Done when**:
- [ ] `npm run test:unit` roda e sai com código zero
- [ ] Testing Library e matchers de DOM configurados no setup
- [ ] O arquivo de configuração já prevê o segundo projeto de testes, em ambiente node, que T15 vai preencher
- [ ] Contagem de testes: 1 teste passa (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `test(setup): configura Vitest com Testing Library`

---

#### T4: Configurar o Tailwind v4 e os tokens de design

**What**: Plugin do Tailwind no Vite e o bloco `@theme` com cores, espaçamentos e tipografia.
**Where**: `src/styles/globals.css`
**Depends on**: T3
**Reuses**: configuração do Vite criada em T1
**Requirement**: FND-02

**Tools**:
- MCP: `context7` (instalação do Tailwind v4 com Vite e sintaxe de `@theme`)
- Skill: NONE

**Done when**:
- [ ] `@tailwindcss/vite` registrado e `@import "tailwindcss"` presente
- [ ] Bloco `@theme` define tokens de cor, espaçamento e tipografia, incluindo a cor de ação destrutiva e a de foco
- [ ] Nenhum `tailwind.config.js` existe no repositório (AD-010)
- [ ] Par de cores de texto e fundo dos tokens atinge contraste de ao menos 4.5:1
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build
**Commit**: `feat(ui): configura Tailwind v4 e tokens de design`

---

#### T5: Validar as variáveis de ambiente na carga do módulo

**What**: Módulo que valida `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com Zod e falha nomeando a ausente.
**Where**: `src/lib/env.ts`
**Depends on**: T4
**Reuses**: suíte Vitest criada em T3
**Requirement**: FND-03

**Tools**:
- MCP: `context7` (API de erros do Zod na versão atual)
- Skill: NONE

**Done when**:
- [ ] Exporta `env` já validado; nenhum outro módulo lê `import.meta.env`
- [ ] Variável ausente ou vazia lança erro cuja mensagem contém o nome da variável
- [ ] URL inválida é rejeitada
- [ ] `.env.example` versionado com as duas chaves sem valor, e `.env.local` coberto pelo `.gitignore`
- [ ] Contagem de testes: 4 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(config): valida variáveis de ambiente na inicialização`

---

### Phase 2: Banco de dados

#### T6: Inicializar o Supabase local e a suíte pgTAP

**What**: `supabase init`, ajuste de `config.toml` e o arquivo de apoio dos testes de banco.
**Where**: `supabase/config.toml`
**Depends on**: T5
**Reuses**: scripts de T2
**Requirement**: FND-04

**Tools**:
- MCP: `context7` (configuração do CLI e execução de `supabase test db`)
- Skill: `supabase`

**Done when**:
- [ ] `supabase start` sobe e `npm run db:reset` executa sem erro
- [ ] Confirmação de e-mail desativada no `config.toml` (AD-007)
- [ ] `npm run test:db` executa a suíte pgTAP, ainda que vazia, e sai com código zero
- [ ] `supabase/.temp/` e `supabase/.branches/` já cobertos pelo `.gitignore`
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build
**Commit**: `chore(db): inicializa Supabase local e suíte pgTAP`

---

#### T7: Migration de extensões e funções auxiliares

**What**: `pg_trgm`, `unaccent`, `public.set_updated_at()` e `public.immutable_unaccent()`.
**Where**: `supabase/migrations/<ts>_extensions_and_helpers.sql`
**Depends on**: T6
**Reuses**: nada
**Requirement**: FND-06, FND-07

**Tools**:
- MCP: `context7` (envelope imutável de `unaccent` e schema das extensões no Supabase)
- Skill: `supabase-postgres-best-practices`

**Done when**:
- [ ] Ambas as extensões criadas no schema `extensions`
- [ ] `immutable_unaccent()` marcada `immutable` e usável em expressão de índice
- [ ] `set_updated_at()` declarada com `set search_path = ''`
- [ ] Teste pgTAP confirma que `immutable_unaccent('São João')` devolve `Sao Joao` e que a função é imutável
- [ ] Contagem de testes: 3 testes pgTAP passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit && npm run test:db && npm run test:rls`

**Tests**: integration
**Gate**: full
**Commit**: `feat(db): adiciona extensões e funções auxiliares`

---

#### T8: Migration da tabela `profiles`

**What**: Tabela, constraints, trigger de `updated_at`, grants por coluna, RLS e políticas.
**Where**: `supabase/migrations/<ts>_profiles.sql`
**Depends on**: T7
**Reuses**: `set_updated_at()` de T7; forma canônica de política do design
**Requirement**: FND-04, FND-05, FND-06, FND-10

**Tools**:
- MCP: NONE
- Skill: `supabase-postgres-best-practices`

**Done when**:
- [ ] `id` referencia `auth.users(id)` com `on delete cascade`
- [ ] Grant de `update` cobre apenas `full_name` e `phone`; `email` e `id` inalcançáveis (AD-008, AD-014)
- [ ] `anon` sem grant algum; `authenticated` sem `insert` nem `delete`
- [ ] Teste pgTAP cobre a matriz: dono lê e atualiza o próprio; outro usuário não lê, não atualiza; `anon` é negado; update em `email` é recusado
- [ ] Contagem de testes: 9 testes pgTAP passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit && npm run test:db && npm run test:rls`

**Tests**: integration
**Gate**: full
**Commit**: `feat(db): adiciona tabela profiles com RLS`

---

#### T9: Migration da tabela `clients`

**What**: Tabela, as nove constraints, triggers de normalização e de `updated_at`, grants por coluna, RLS e as quatro políticas.
**Where**: `supabase/migrations/<ts>_clients.sql`
**Depends on**: T8
**Reuses**: `set_updated_at()` de T7; forma canônica de política do design
**Requirement**: FND-04, FND-05, FND-06, FND-08, FND-10

**Tools**:
- MCP: NONE
- Skill: `supabase-postgres-best-practices`

**Done when**:
- [ ] As nove check constraints do design existem com os limites da tabela de premissas do spec
- [ ] `normalize_client()` apara o nome, baixa o e-mail, reduz o telefone a dígitos e colapsa a região; vazio vira nulo
- [ ] Grant de `update` exclui `owner_id`, `created_at` e `updated_at` (AD-014)
- [ ] Teste pgTAP cobre a matriz completa mais os edge cases: região só com espaços vira nulo, telefone com máscara vira dígitos, `income` negativo é recusado, `updated_at` enviado pelo cliente é ignorado, insert com `owner_id` alheio é recusado
- [ ] Contagem de testes: 22 testes pgTAP passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit && npm run test:db && npm run test:rls`

**Tests**: integration
**Gate**: full
**Commit**: `feat(db): adiciona tabela clients com RLS e normalização`

---

#### T10: Migration da coluna de busca e dos índices de `clients`

**What**: Coluna gerada `search_text` e os sete índices da tabela.
**Where**: `supabase/migrations/<ts>_clients_search_and_indexes.sql`
**Depends on**: T9
**Reuses**: `immutable_unaccent()` de T7
**Requirement**: FND-07

**Tools**:
- MCP: NONE
- Skill: `supabase-postgres-best-practices`

**Done when**:
- [ ] `search_text` concatena nome, e-mail e telefone, em minúsculas e sem acento
- [ ] Índice GIN qualifica `extensions.gin_trgm_ops` explicitamente
- [ ] Os seis índices B-tree do design existem, todos com `owner_id` à esquerda, exceto `(id, owner_id)`
- [ ] Teste pgTAP confirma que buscar `joao` encontra um cliente gravado como `João` e que o plano de uma busca por trigrama não é varredura sequencial
- [ ] Contagem de testes: 5 testes pgTAP passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit && npm run test:db && npm run test:rls`

**Tests**: integration
**Gate**: full
**Commit**: `perf(db): adiciona coluna de busca e índices de clients`

---

#### T11: Migration da tabela `notes`

**What**: Tabela, constraints, trigger de normalização e de `updated_at`, índice, grants, RLS e as quatro políticas com `exists`.
**Where**: `supabase/migrations/<ts>_notes.sql`
**Depends on**: T10
**Reuses**: `set_updated_at()` de T7; índice `clients (id, owner_id)` de T10
**Requirement**: FND-04, FND-06, FND-09

**Tools**:
- MCP: NONE
- Skill: `supabase-postgres-best-practices`

**Done when**:
- [ ] `client_id` referencia `clients(id)` com `on delete cascade`
- [ ] Título aparado entre 1 e 120; descrição até 5000; descrição só com espaços vira nulo
- [ ] As quatro políticas usam `exists` sobre `clients` com `(select auth.uid())` (AD-004)
- [ ] Teste pgTAP cobre a matriz mais: nota de cliente alheio é invisível, insert apontando para cliente alheio é recusado, excluir o cliente apaga as notas
- [ ] Contagem de testes: 16 testes pgTAP passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit && npm run test:db && npm run test:rls`

**Tests**: integration
**Gate**: full
**Commit**: `feat(db): adiciona tabela notes com RLS derivada de clients`

---

#### T12: Migration da tabela `error_logs`

**What**: Tabela, constraints de tamanho, índice, grant apenas de insert, RLS e a política.
**Where**: `supabase/migrations/<ts>_error_logs.sql`
**Depends on**: T11
**Reuses**: forma canônica de política do design
**Requirement**: FND-10

**Tools**:
- MCP: NONE
- Skill: `supabase-postgres-best-practices`

**Done when**:
- [ ] `authenticated` tem grant apenas de `insert`; nenhum grant de `select`
- [ ] `anon` sem grant algum (AD-011)
- [ ] Teste pgTAP confirma: dono insere o próprio, insert com `owner_id` alheio é recusado, leitura é negada mesmo para o dono, `anon` é negado
- [ ] Contagem de testes: 6 testes pgTAP passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit && npm run test:db && npm run test:rls`

**Tests**: integration
**Gate**: full
**Commit**: `feat(db): adiciona tabela error_logs somente de escrita`

---

#### T13: Migration do trigger de criação de perfil

**What**: `public.handle_new_user()` e o trigger `after insert` em `auth.users`.
**Where**: `supabase/migrations/<ts>_handle_new_user.sql`
**Depends on**: T12
**Reuses**: tabela `profiles` de T8
**Requirement**: FND-12

**Tools**:
- MCP: `context7` (padrão documentado do trigger de perfil)
- Skill: `supabase`

**Done when**:
- [ ] Função declarada `security definer` com `set search_path = ''` (AD-005)
- [ ] `full_name` lido de `raw_user_meta_data`; sem ele, cai para a parte do e-mail antes do `@`
- [ ] Teste pgTAP cobre os dois caminhos e confirma que o perfil existe com `id`, `email` e `full_name` corretos
- [ ] Contagem de testes: 5 testes pgTAP passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit && npm run test:db && npm run test:rls`

**Tests**: integration
**Gate**: full
**Commit**: `feat(db): cria perfil automaticamente no cadastro`

---

### Phase 3: Tipos e verificação pelo cliente

#### T14: Gerar os tipos do banco e tipar o cliente Supabase

**What**: Script de geração, arquivo gerado commitado e a instância única do cliente.
**Where**: `src/lib/supabase.ts`
**Depends on**: T13
**Reuses**: `env` de T5
**Requirement**: FND-13

**Tools**:
- MCP: `context7` (tipagem do cliente com `Database` na versão atual do supabase-js)
- Skill: `supabase`

**Done when**:
- [ ] `npm run db:types` escreve `src/types/database.types.ts` e o arquivo está commitado
- [ ] O cliente é criado como `createClient<Database>`, lendo de `env`, nunca de `import.meta.env`
- [ ] Uma coluna inexistente em uma consulta vira erro de compilação
- [ ] `npm run db:reset && npm run db:types` não produz diferença no arquivo commitado
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(db): gera tipos do banco e tipa o cliente Supabase`

---

#### T15: Harness de RLS no Vitest e suíte de `clients`

**What**: Projeto de testes em ambiente node que cria dois usuários pelo cliente admin, mais a suíte de isolamento de `clients` pelo supabase-js.
**Where**: `tests/rls/clients.test.ts`
**Depends on**: T14
**Reuses**: configuração de Vitest de T3; cliente tipado de T14
**Requirement**: FND-11

**Tools**:
- MCP: `context7` (`auth.admin.createUser` e teste de RLS com supabase-js)
- Skill: `supabase`

**Done when**:
- [ ] O setup falha com mensagem pedindo `supabase start` quando o Supabase local não responde
- [ ] Dois usuários com identificadores únicos por execução, sem depender de reset entre testes
- [ ] Usuário A não lê, não altera e não exclui cliente de B; insert com `owner_id` de B é recusado
- [ ] Contagem de testes: 6 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit && npm run test:db && npm run test:rls`

**Tests**: integration
**Gate**: full
**Commit**: `test(db): verifica isolamento de clients pelo cliente Supabase`

---

#### T16: Suíte de RLS para `notes`, `profiles` e `error_logs`

**What**: Isolamento das três tabelas restantes pelo supabase-js.
**Where**: `tests/rls/notes-profiles-error-logs.test.ts`
**Depends on**: T15
**Reuses**: harness de T15
**Requirement**: FND-11

**Tools**:
- MCP: NONE
- Skill: `supabase`

**Done when**:
- [ ] Usuário A não enxerga notas de clientes de B e não cria nota apontando para cliente de B
- [ ] A lê e atualiza apenas o próprio perfil; update em `email` falha
- [ ] A insere em `error_logs` com o próprio identificador e não consegue ler a tabela
- [ ] Excluir um cliente pelo cliente Supabase remove suas notas
- [ ] Contagem de testes: 9 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit && npm run test:db && npm run test:rls`

**Tests**: integration
**Gate**: full
**Commit**: `test(db): verifica isolamento de notes, profiles e error_logs`

---

### Phase 4: Esqueleto da aplicação

#### T17: Configurar o TanStack Query e os provedores globais

**What**: `QueryClient` com os padrões do projeto e a composição de provedores.
**Where**: `src/lib/query-client.ts`
**Depends on**: T16
**Reuses**: nada
**Requirement**: FND-01

**Tools**:
- MCP: `context7` (padrões de `QueryClient` na versão atual do TanStack Query)
- Skill: NONE

**Done when**:
- [ ] `QueryClient` não repete tentativa em erro de autorização
- [ ] `src/app/providers.tsx` compõe o provedor de query e deixa o ponto de encaixe do provedor de sessão que `auth` vai inserir por dentro dele
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(app): configura TanStack Query e provedores globais`

---

#### T18: Criar o layout base das rotas privadas

**What**: Moldura com cabeçalho, área de conteúdo e o espaço reservado para nome do usuário e ação de sair.
**Where**: `src/components/layout/AppLayout.tsx`
**Depends on**: T17
**Reuses**: tokens de T4
**Requirement**: FND-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Renderiza `<Outlet />` e um cabeçalho com slot nomeado para a identificação do usuário
- [ ] Legível de 320px a desktop, sem rolagem horizontal
- [ ] Teste de componente cobre renderização do filho e presença do slot do cabeçalho
- [ ] Contagem de testes: 3 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ui): cria layout base das rotas privadas`

---

#### T19: Montar a árvore de rotas em data mode

**What**: `createBrowserRouter` com o layout público, o privado e a rota de não encontrado.
**Where**: `src/app/router.tsx` — inclui o `PublicLayout`, que só existe para ser montado aqui
**Depends on**: T18
**Reuses**: `AppLayout` de T18
**Requirement**: FND-15

**Tools**:
- MCP: `context7` (objetos de rota e `ErrorBoundary` por rota no React Router v7)
- Skill: NONE

**Done when**:
- [ ] Roteador criado fora da árvore React e entregue por `RouterProvider` (AD-013)
- [ ] Nenhum `loader` nem `action` é usado
- [ ] Rota inexistente renderiza a página de não encontrado com link de volta
- [ ] Teste de componente cobre a rota raiz e a rota inexistente
- [ ] Contagem de testes: 3 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(app): monta árvore de rotas em data mode`

---

#### T20: Capturar erros da árvore e registrá-los

**What**: Error boundary da raiz e a função de registro em `error_logs`.
**Where**: `src/components/feedback/RootErrorBoundary.tsx` — junto de `lib/error-log.ts`, que só existe para servi-lo
**Depends on**: T19
**Reuses**: cliente de T14; tabela de T12
**Requirement**: FND-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Erro lançado por um filho renderiza a tela de erro com ação de recarregar
- [ ] Com sessão, grava em `error_logs` com identificador, mensagem, stack e rota
- [ ] Sem sessão, registra apenas no console e não tenta escrever (AD-011)
- [ ] Falha da própria gravação não lança segunda exceção
- [ ] Contagem de testes: 6 testes passam (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit && npm run test:db && npm run test:rls`

**Tests**: unit
**Gate**: full
**Commit**: `feat(app): captura erros da árvore e registra no banco`

---

#### T21: Configurar o Playwright com um teste de fumaça

**What**: Configuração do Playwright e o teste que prova a aplicação carregando.
**Where**: `playwright.config.ts`
**Depends on**: T20
**Reuses**: roteador de T19
**Requirement**: FND-14

**Tools**:
- MCP: `context7` (configuração do Playwright com Vite na versão atual)
- Skill: NONE

**Done when**:
- [ ] `npm run test:e2e` sobe o servidor de desenvolvimento, roda e sai com código zero
- [ ] O teste de fumaça carrega a raiz e confirma que a página renderiza
- [ ] Artefatos do Playwright já cobertos pelo `.gitignore`
- [ ] Contagem de testes: 1 teste E2E passa (sem deleções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit && npm run test:db && npm run test:rls && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `test(e2e): configura Playwright com teste de fumaça`

---

#### T22: Documentar a operação local

**What**: Seção do README com pré-requisitos, primeira execução e o ciclo de migrations.
**Where**: `README.md`
**Depends on**: T21
**Reuses**: scripts de T2
**Requirement**: FND-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Alguém sem contexto chega ao app rodando com banco local seguindo apenas o README
- [ ] Documenta Docker e Supabase CLI como pré-requisitos, as variáveis de ambiente e os nove scripts
- [ ] Documenta como criar uma migration e por que arquivos já aplicados nunca são editados
- [ ] Registra que a feature `deploy` estende este documento com a operação de produção
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `docs: documenta operação local do projeto`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2 → T3 → T4 → T5
Phase 2:  T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13
Phase 3:  T14 → T15 → T16
Phase 4:  T17 → T18 → T19 → T20 → T21 → T22
```

A execução é estritamente sequencial — não há paralelismo dentro de uma fase.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Scaffold do Vite | 1 operação de scaffold | ⚠️ Vários arquivos, mas gerados por um comando só — um projeto pela metade não é commitável |
| T2: ESLint, Prettier e scripts | 1 configuração coesa | ✅ Granular |
| T3: Vitest | 1 arquivo de configuração | ✅ Granular |
| T4: Tailwind e tokens | 1 folha de estilo | ✅ Granular |
| T5: Validação de ambiente | 1 módulo | ✅ Granular |
| T6: Supabase local | 1 configuração | ✅ Granular |
| T7–T13: uma migration cada | 1 arquivo SQL cada | ✅ Granular |
| T14: Tipos e cliente | 1 módulo mais um arquivo gerado | ✅ Granular |
| T15, T16: suítes de RLS | 1 arquivo de teste cada | ✅ Granular |
| T17: Query client e provedores | 2 arquivos coesos de fiação | ⚠️ Aceito — o provedor existe só para montar o cliente |
| T18: Layout privado | 1 componente | ✅ Granular |
| T19: Roteador | 1 módulo mais o layout público, de 10 linhas | ⚠️ Aceito — separar um commit para o layout público seria ruído |
| T20: Error boundary | 1 componente mais sua função de registro | ⚠️ Aceito — a função existe só para servir o boundary, e separá-la deixaria código sem teste |
| T21: Playwright | 1 configuração mais o teste de fumaça | ✅ Granular |
| T22: README | 1 arquivo | ✅ Granular |

As quatro marcas ⚠️ são deliberadas: em cada uma, dividir produziria um commit que não passa no próprio gate, ou código sem verificação — exatamente o que a regra de co-localização de testes proíbe.

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama | Status |
| ---- | ------------------ | -------- | ------ |
| T1 | None | — | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | cruza fase | ✅ isento |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | cruza fase | ✅ isento |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T16 | cruza fase | ✅ isento |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T18 | T18 → T19 | ✅ |
| T20 | T19 | T19 → T20 | ✅ |
| T21 | T20 | T20 → T21 | ✅ |
| T22 | T21 | T21 → T22 | ✅ |

**Nota sobre `Depends on` e `Reuses`**: dentro de uma fase a execução é estritamente sequencial, então `Depends on` registra sempre o antecessor imediato — é verdadeiro e mais restritivo que a dependência mínima. O acoplamento real, mais frouxo, fica em `Reuses`: T4 só precisa do que T1 gerou, e T5 só precisa da suíte de T3. Se uma fase precisar ser reordenada no futuro, é `Reuses` que diz o que de fato pode se mover.

---

## Test Co-location Validation

| Task | Camada criada | Matriz exige | Tarefa declara | Status |
| ---- | ------------- | ------------ | -------------- | ------ |
| T1 | Configuração | none | none | ✅ |
| T2 | Configuração | none | none | ✅ |
| T3 | Configuração mais um teste | none | unit | ✅ excede o mínimo |
| T4 | Configuração e estilo | none | none | ✅ |
| T5 | Módulo de `src/lib/` | unit | unit | ✅ |
| T6 | Configuração | none | none | ✅ |
| T7 | Schema: funções | integration | integration | ✅ |
| T8 | Schema e segurança | integration | integration | ✅ |
| T9 | Schema e segurança | integration | integration | ✅ |
| T10 | Schema: índices | integration | integration | ✅ |
| T11 | Schema e segurança | integration | integration | ✅ |
| T12 | Schema e segurança | integration | integration | ✅ |
| T13 | Schema: trigger | integration | integration | ✅ |
| T14 | Tipos gerados e fiação | none | none | ✅ |
| T15 | Segurança pelo cliente | integration | integration | ✅ |
| T16 | Segurança pelo cliente | integration | integration | ✅ |
| T17 | Fiação | none | none | ✅ |
| T18 | Componente React | unit | unit | ✅ |
| T19 | Componente React | unit | unit | ✅ |
| T20 | Componente React mais módulo de `lib/` | unit | unit | ✅ |
| T21 | Ponta a ponta | e2e | e2e | ✅ |
| T22 | Documentação | none | none | ✅ |

Nenhuma violação. As cinco tarefas com `Tests: none` são as que a matriz classifica como configuração, tipos gerados, fiação ou documentação — nenhuma delas produz lógica que possa falhar sem ser notada pelo gate de build.
