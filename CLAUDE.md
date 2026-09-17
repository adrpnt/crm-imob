# CLAUDE.md

Orientações para agentes que trabalham neste repositório. O que está aqui são as
regras e os atalhos que não se deduzem lendo o código. A visão de produto e o
passo a passo de instalação ficam no `README.md`; as decisões de arquitetura e o
porquê de cada uma, em `.specs/STATE.md`.

## O produto

CRM web para um consultor imobiliário: carteira de clientes, notas por cliente,
busca e filtros. Usuário único por conta, sem times nem papéis.

## Tech stack

| Camada      | Escolha                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| Build       | Vite 8, TypeScript 6 (`strict` via projetos referenciados)              |
| UI          | React 19, React Router 8 em **data mode**                               |
| Estilo      | Tailwind CSS v4 via `@tailwindcss/vite` — **sem** arquivo de config     |
| Dados       | TanStack Query 5                                                        |
| Formulários | React Hook Form 7 + Zod 4 (`@hookform/resolvers`)                       |
| Backend     | Supabase (Postgres + Auth + PostgREST) — **não existe backend próprio** |
| Testes      | Vitest 5 (jsdom + node), pgTAP via Supabase CLI, Playwright 1.63        |
| Qualidade   | ESLint 10 flat config, Prettier 3                                       |

Node 22+ e Docker em execução são pré-requisitos. O CLI do Supabase é
dependência do projeto — nunca instale nada global, use `npx supabase`.

## A regra que governa todo o resto

O frontend fala **direto** com o Supabase. Não há camada de servidor onde
esconder uma checagem. Toda autorização vive nas políticas de Row Level Security
do Postgres (AD-001), e por isso uma política mal escrita é uma brecha de dados,
não um bug de tela.

Consequência prática: **qualquer mudança que toque tabela, política ou grant
precisa passar por `npm run test:db` e `npm run test:rls`** — as duas, não uma.
Elas enxergam coisas diferentes e há mudanças que só uma delas denuncia.

## Environment variables

Só existem duas, ambas públicas, ambas lidas por `src/lib/env.ts`:

| Variável                 | Papel                   |
| ------------------------ | ----------------------- |
| `VITE_SUPABASE_URL`      | URL da API do Supabase  |
| `VITE_SUPABASE_ANON_KEY` | Chave publicável (anon) |

- Tudo com prefixo `VITE_` **vai para o bundle do navegador**. A
  `service_role key` jamais pode entrar em uma variável `VITE_*`, em nenhum
  arquivo, em nenhuma circunstância. Ela existe apenas em `tests/rls/helpers.ts`,
  para semear dados de teste contra a pilha local.
- `src/lib/env.ts` valida com Zod **no momento do import**. Variável faltando
  derruba a aplicação na inicialização, nomeando a variável — de propósito.
  Módulos importam de `env`, nunca de `import.meta.env` direto; é isso que
  impede contornar a validação.
- `.env.local` guarda os valores da pilha local (`npx supabase start`). Não são
  segredos: o CLI os deriva de um segredo fixo e documentado, idênticos em toda
  máquina. `.env.example` é versionado; `.env*` não.
- Configuração do Supabase que **não** é variável de ambiente — confirmação de
  e-mail desligada, `site_url`, URLs de redirect — vive em
  `supabase/config.toml`.

### Portas da pilha local

API `54321` · DB `54322` · Studio `54323` · Mailpit `54324` · app `5173`.

## Architecture

```text
src/
  app/          App, router (createBrowserRouter) e composição de providers
  components/   ui/ (Botao, Campo, Alerta) · layout/ · feedback/ (erros, 404)
  features/     auth/ (pronta) · clients/ e notes/ (vazias)
  lib/          env · supabase · query-client · error-log · sessao-expirada
  styles/       globals.css — tokens de design no bloco @theme
  types/        database.types.ts — GERADO, não editar à mão
supabase/
  migrations/   fonte da verdade do schema
  tests/database/  suíte pgTAP
  config.toml   configuração da pilha local (versionada)
tests/rls/      isolamento entre usuários atravessando o PostgREST
e2e/            Playwright (só Chromium)
.specs/         specs, decisões (STATE.md) e lições (LESSONS.md)
```

### Padrão de feature

Cada pasta em `src/features/` é autocontida: `pages/`, `components/`,
`services/`, schemas Zod e hooks próprios. `auth/` é o modelo de referência —
copie a forma dela ao criar `clients/` e `notes/`.

### Serviços devolvem união discriminada, não exceção

```ts
export type Resultado = { ok: true } | { ok: false; mensagem: string }
```

Isso obriga a tela a tratar a falha e faz a mensagem chegar pronta para
exibição. A tradução de erro do Supabase para frase de usuário acontece em um
ponto único por serviço (ver `traduzirErro` em
`src/features/auth/services/auth-service.ts`) — nunca espalhada pelas telas, sob
pena de uma delas revelar mais do que deve (ex.: confirmar quais e-mails têm
conta).

### Roteamento

Data mode, mas **sem `loader` e sem `action`** (AD-013). Os dados ficam
inteiramente com o TanStack Query, para não existirem dois caches com duas
invalidações. O que o router aporta é layout aninhado, `ErrorBoundary` por rota
e as guardas de sessão.

Em React Router 8 o pacote `react-router-dom` **não existe mais**:
`RouterProvider` vem de `react-router/dom`, todo o resto de `react-router`.
Ambos os caminhos exportam os símbolos, então importar do lugar errado compila e
roda — atenção redobrada.

Estrutura das rotas: guarda → layout → telas. A guarda por fora decide antes de
qualquer moldura ser desenhada, evitando o piscar de cabeçalho sem sessão.

### Estilo

Tailwind v4 é CSS-first: **não crie `tailwind.config.js`** (AD-010). Tokens
novos vão no bloco `@theme` de `src/styles/globals.css`, onde viram
simultaneamente classe utilitária e variável CSS. Os pares de cor já existentes
foram verificados em contraste 4.5:1 ou mais — mantenha isso ao adicionar.

### Erros

Error boundary do React grava em `public.error_logs` no próprio Supabase
(AD-011). Não há serviço externo. Erros em rotas públicas **não** são
persistidos — a tabela só aceita insert do papel `authenticated`, e abrir para
`anon` a tornaria gravável por qualquer um, já que a chave está no bundle. Para
inspecionar, use o Studio local ou uma conexão de serviço.

## Banco de dados

### Schema

Quatro tabelas em `public`, todas com RLS ligada:

- **`profiles`** — `id` referencia `auth.users`. Criada por trigger no cadastro
  (AD-005); o frontend **nunca** insere. `email` é somente leitura para sempre
  (AD-008).
- **`clients`** — o núcleo. `owner_id` é a fronteira de isolamento. `status`,
  `source` e `income_type` são `text` com check constraint, **não enum nativo**
  (AD-006), porque remover valor de enum no Postgres é inviável. `region` é
  texto livre normalizado por trigger (AD-009).
- **`notes`** — `client_id` referencia `clients`, sem `owner_id` próprio
  (AD-004). A propriedade é derivada via `exists (select 1 from public.clients
...)`. Excluir o cliente apaga as notas por cascata.
- **`error_logs`** — escrita de mão única: `grant insert` e nada mais.

Normalização (aparar, colapsar espaços, minúsculas no e-mail, telefone reduzido
a dígitos, vazio → nulo) vive em triggers `BEFORE` no banco, não no formulário.
O frontend melhora a experiência; o banco é a autoridade final.

### Duas camadas de autorização, sempre

1. **`grant` por coluna** define o que o papel `authenticated` pode tocar.
   Colunas imutáveis pela aplicação — `owner_id`, `created_at`, `updated_at`,
   `profiles.email` — simplesmente ficam fora do grant de `update` (AD-014).
2. **Política de RLS** define quais linhas.

> Ao adicionar uma coluna editável, **lembre de incluí-la no `grant (…)` de
> update**. Esquecer produz um erro de permissão confuso em tempo de execução,
> não um erro de compilação.

### Forma obrigatória de toda política (AD-003)

```sql
create policy clients_select_own on public.clients
  for select to authenticated
  using ((select auth.uid()) = owner_id);
```

Três exigências, todas com motivo medido:

- `(select auth.uid())` em subconsulta — sem ela o planner reavalia a função uma
  vez por linha; com ela, uma vez só (initPlan).
- `to authenticated` explícito — evita que a política seja sequer avaliada para
  o papel anônimo.
- Índice na coluna verificada.

Funções são `security definer set search_path = ''` com nomes sempre
qualificados (`public.clients`, não `clients`).

### Migrations

```bash
npx supabase migration new nome_descritivo   # prefixo de timestamp em UTC
npm run db:reset                             # aplica tudo do zero
npm run db:types                             # regenera src/types/database.types.ts
npm run test:db                              # confirma que nada quebrou
```

- **Migration já aplicada nunca é editada.** Para mudar algo — inclusive remover
  índice ou coluna — escreva uma migration nova.
- Criando o arquivo à mão, use `date -u +%Y%m%d%H%M%S`. Hora local pode colocar
  a migration antes de uma existente e quebrar o `db:reset`.
- O dashboard do Supabase **não** é a fonte da verdade. Nada de SQL escrito no
  painel.

## Comandos

| Comando                | O que faz                                              |
| ---------------------- | ------------------------------------------------------ |
| `npm run dev`          | Vite em [http://localhost:5173](http://localhost:5173) |
| `npm run build`        | `tsc -b` + build de produção                           |
| `npm run lint`         | ESLint, falha em qualquer aviso (`--max-warnings 0`)   |
| `npm run typecheck`    | Só os tipos                                            |
| `npm run format:write` | Aplica Prettier                                        |
| `npm test`             | discovery → unit → db → rls                            |
| `npm run test:unit`    | Vitest, projeto `unit` (jsdom, `src/**/*.test.*`)      |
| `npm run test:db`      | pgTAP via `supabase test db`                           |
| `npm run test:rls`     | Vitest, projeto `rls` (node, `tests/rls/**`)           |
| `npm run test:e2e`     | Playwright (sobe o dev server sozinho)                 |
| `npm run db:reset`     | Reconstrói o banco local das migrations                |
| `npm run db:types`     | Regenera os tipos do schema                            |

`test:db` e `test:rls` exigem a pilha local no ar; sem ela a suíte falha dizendo
isso, em vez de estourar com erro de rede.

## Testes — quatro suítes, cada uma pegando o que as outras não alcançam

| Suíte           | Onde                       | O que só ela pega                                               |
| --------------- | -------------------------- | --------------------------------------------------------------- |
| pgTAP           | `supabase/tests/database/` | Matriz de políticas dentro do banco, incluindo negação a `anon` |
| RLS por cliente | `tests/rls/`               | Grants, exposição de schema e comportamento real do PostgREST   |
| Unitários       | `src/**/*.test.{ts,tsx}`   | Lógica de módulos e componentes (Testing Library)               |
| E2E             | `e2e/`                     | Layout, navegação e erros de console em navegador real          |

`npm run test:discovery` compara os arquivos de teste no disco com os que o
Vitest descobre. Existe porque estreitar um glob já apagou metade da suíte em
silêncio, com `npm test` saindo zero. Não desabilite.

### Lições aprendidas que valem como regra (`.specs/LESSONS.md`)

Duas já foram corroboradas em mais de uma feature e devem ser aplicadas:

- **L-001** — quando política de RLS e grant por coluna cobrem o mesmo caso, um
  teste comportamental passa _pelo motivo errado_. Verifique a camada de grant
  no catálogo (`has_column_privilege`, `pg_policies`), sempre com controle
  positivo.
- **L-012** — não encadeie verificação e commit no mesmo comando. Rode o gate,
  leia a saída, e só então commite, em invocação separada.

O restante do arquivo são candidatas sob observação — leia, mas não trate como
obrigatório. `LESSONS.md` é gerado: **edite apenas via
`.claude/skills/tlc-spec-driven/scripts/lessons.py`**, nunca à mão.

## Convenções de código

- **Português** em nomes de domínio, componentes, variáveis e comentários
  (`Botao`, `Campo`, `entrar`, `traduzirErro`, `ehSessaoExpirada`). Termos de
  schema e API ficam em inglês (`clients`, `owner_id`, `full_name`).
- Comentários explicam **por que**, não o que. Muitos deles apontam para um
  requisito (`AUTH-05`, `FND-03`) ou uma decisão (`AD-001`). Mantenha esse hábito
  ao escrever código novo: a referência é o que torna a linha auditável depois.
- Prettier: sem ponto e vírgula, aspas simples, vírgula final, 100 colunas.
- `src/types/database.types.ts` é gerado e está no ignore do ESLint. Nunca edite.
- Todo arquivo de lógica tem `.test.ts(x)` ao lado. Serviço novo sem teste
  próprio é um padrão de falha já registrado (L-009).

## Commits

Conventional Commits, **descrição em português, no imperativo**, escopo pela
feature ou área:

```text
feat(auth): adiciona guarda das rotas privadas
fix(build): separa o projeto TypeScript dos testes
test(e2e): cobre o fluxo de autenticação ponta a ponta
docs(specs): promove L-001 e L-012 a confirmadas
```

Commits atômicos: uma tarefa, um commit. Só commite quando o usuário pedir.

## Fluxo de trabalho (`.specs/`)

O projeto é conduzido pela skill `tlc-spec-driven`, em quatro fases por feature:
**Specify → Design → Tasks → Execute**, com verificação independente ao final
(autor ≠ verificador, evidência ou zero).

- `.specs/STATE.md` — decisões (AD-001 em diante), handoff e estado das features.
  **Leia antes de começar qualquer coisa**; é onde está o "onde paramos".
- `.specs/features/<nome>/` — `context.md`, `spec.md`, `design.md`, `tasks.md`,
  `validation.md`.
- `.specs/LESSONS.md` / `lessons.json` — lições, mantidas por script.

Estado em 17/09/2026: `foundation` e `auth` completas e verificadas com PASS.
`notes` e `deploy` têm apenas o Specify pronto. O Design de `clients` está em
andamento e já registrou duas decisões que valem para todas as features:

- **AD-015** — o estado de uma listagem (busca, filtros, ordenação, página) vive
  na query string como fonte única. Um módulo puro traduz `URLSearchParams` em
  objeto tipado nas duas direções, a chave do TanStack Query deriva dele, e
  mudar um filtro é navegar. Nada de `useState` espelhando filtro em efeito.
- **AD-016** — falha de autorização em escrita é tratada por
  `mutationCache.onError` no `queryClient`, simétrico ao `queryCache.onError`.
  Nenhuma mutação trata 401 ou 403 por conta própria. Decidido, mas **ainda não
  implementado**: `src/lib/query-client.ts` hoje só tem `QueryCache`.

## Armadilhas conhecidas

- Coluna nova editável fora do `grant (…)` de update → falha de permissão
  confusa em runtime.
- `tailwind.config.js` criado por hábito → ignorado pela v4; o token não aparece.
- Import de `react-router-dom` → o pacote não existe na v8.
- Migration com timestamp em hora local → ordem errada, `db:reset` quebra.
- Editar `database.types.ts` à mão → perdido no próximo `db:types`.
- Tratar `42501` como sessão expirada → derruba o usuário para o login por um
  erro legítimo de "esta linha não é sua". `ehSessaoExpirada` é deliberadamente
  mais estreita que `ehErroDeAutorizacao`.

## Design system

Defined entirely as Tailwind v4 `@theme` tokens in `src/index.css` — there is **no
`tailwind.config.js`**, this is CSS-first Tailwind v4. Tokens become utilities automatically
(`--color-rocket-500` → `bg-rocket-500`, `text-rocket-500`, `border-rocket-500`, …), so a
utility referencing a shade that isn't declared below silently produces nothing.

### Typography

| Token            | Family                                 | Use                       |
| ---------------- | -------------------------------------- | ------------------------- |
| `--font-display` | `"Raleway", "Segoe UI", sans-serif`    | headings (`font-display`) |
| `--font-body`    | `"Montserrat", "Segoe UI", sans-serif` | body text, set on `body`  |

Loaded from Google Fonts in `index.html` (with `preconnect` + `display=swap`): Montserrat
400/500/600/700 + italic 400, Raleway 700/800/900. `h1`–`h4` get `font-display`, `font-weight:
800` and `letter-spacing: -0.01em` from the base layer, so headings usually need no font classes.

### Colors

| Token                  | Hex       | Role                                                                   |
| ---------------------- | --------- | ---------------------------------------------------------------------- |
| `--color-graphite-950` | `#0a0b0c` | deepest background, section contrast                                   |
| `--color-graphite-900` | `#111315` | **official Grafite** — page background (`body`, `App`)                 |
| `--color-graphite-800` | `#1a1d20` | cards, raised surfaces                                                 |
| `--color-graphite-700` | `#262a2e` | default borders                                                        |
| `--color-graphite-600` | `#383d42` | lighter borders                                                        |
| `--color-graphite-400` | `#6b7176` | muted UI                                                               |
| `--color-rocket-500`   | `#ff6a00` | **official Laranja Rocket** — CTAs, accents, focus ring, `::selection` |
| `--color-rocket-600`   | `#e05e00` | hover/pressed orange                                                   |
| `--color-rocket-700`   | `#b84c00` | darkest orange                                                         |
| `--color-rocket-300`   | `#ff9548` | light orange, gradient start                                           |
| `--color-silver-400`   | `#c0c7d1` | **official Prata Metálico**                                            |
| `--color-silver-300`   | `#dde1e6` | primary body text on dark                                              |
| `--color-silver-600`   | `#8b939c` | secondary/muted text                                                   |
| `--color-cloud-50`     | `#f7f6f4` | default text color on `body`, headings                                 |
