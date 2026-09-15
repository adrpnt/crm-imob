# Validation — foundation

**Veredito: FAIL**

Seis lacunas reais, das quais duas são desvios diretos do spec declarados como cumpridos
pelo autor, e seis de oito mutações de comportamento sobreviveram à suíte inteira.
As suítes estão verdes e o ferramental é sólido; o problema não é qualidade de código, é
que partes explícitas do spec não têm asserção que as sustente.

- **Faixa de diff verificada**: `0661bac~1..HEAD` (23 commits, `0661bac` .. `d5b78d9`), branch `main`.
- **Árvore ao final**: limpa (`git status --porcelain` vazio).
- **Verificador**: independente do autor; cobertura re-derivada a partir de `spec.md`, não de `tasks.md`.

---

## 1. Gates (código de saída capturado direto, sem pipe)

| Comando | Exit | Observação |
| ------- | ---- | ---------- |
| `npm run lint` | 0 | `--max-warnings 0` |
| `npm run typecheck` | 0 | |
| `npm run test:unit` | 0 | 9 arquivos, 43 testes |
| `npm run test:db` | 0 | `Result: PASS`, `Files=7, Tests=108` |
| `npm run test:rls` | 0 | 2 arquivos, 23 testes |
| `npm run build` | 0 | |
| `npm run test:e2e` | 0 | 4 testes |
| **`npm run test`** | **1** | **`npm error Missing script: "test"`** |

O último é exigido literalmente pelo spec (Goals linha 13; P2 AC3; P2 AC4) e não existe.

Critérios de sucesso verificados por reprodução:

- `supabase db reset` + `npm run db:types` **não** produz diferença no arquivo commitado — reproduzido, `TYPES_IDENTICAL`.
- Nenhum segredo além das chaves publicáveis em arquivos `VITE_*` — confirmado; `.env.local` não é rastreado, `.env.example` tem as duas chaves vazias.

---

## 2. Cobertura ancorada no spec

Regra aplicada: só conta como coberto com `arquivo:linha` **e** a expressão da asserção.

### P1 — Esqueleto da aplicação executável

| Requisito / AC | Evidência | Esperado pelo spec | Coberto? |
| --- | --- | --- | --- |
| FND-01 AC1 — `npm run dev` serve a raiz sem erro de console | `e2e/smoke.spec.ts:11` `await expect(page.getByRole('heading', { name: 'CRM Imobiliário' })).toBeVisible()` e `:12` `expect(errosDeConsole).toEqual([])` | Rota raiz renderiza, console limpo | ✅ |
| FND-01 AC3 — build com exit zero | Reproduzido: `EXITCODE[build]=0` | Exit zero | ✅ |
| FND-01 AC4 — lint/typecheck exit zero, sem aviso | Reproduzido: `EXITCODE[lint]=0`, `EXITCODE[typecheck]=0`; `package.json:11` `eslint . --max-warnings 0` | Exit zero e nenhum aviso | ✅ |
| FND-01 AC5 — diretórios `src/app`, `src/components`, `src/features`, `src/lib`, `src/styles`, `src/types` | `git ls-files src/features src/components/ui` → **vazio** | Os seis diretórios organizam o código | ❌ **`src/features/` e `src/components/ui/` existem só na máquina do autor; git não versiona diretório vazio, então um clone não os tem.** Nenhum teste os verifica. |
| FND-02 AC2 — Tailwind v4 via `@tailwindcss/vite`, tokens por `@theme` em `globals.css` | `src/styles/globals.css:1,11-42`; verificação manual minha em `dist/assets/index-*.css` (`--color-ink-muted:#5b6472` presente) | Tokens de cor, espaçamento e tipografia aplicados | ⚠️ **Sem teste.** `tasks.md:189` declara `**Tests**: none`. Evidência é manual, reproduzível, mas não regride. |
| FND-03 AC6 — variável ausente/vazia lança nomeando-a | `src/lib/env.test.ts:17` `expect(() => parseEnv(semUrl)).toThrowError(/VITE_SUPABASE_URL/)`; `:21` idem para `VITE_SUPABASE_ANON_KEY` vazia; `:27` URL malformada | Erro nomeando a variável | ✅ |
| FND-03 AC7 — `.env.example` versionado, `.env.local` fora do VCS | `git ls-files` lista `.env.example`; `git ls-files --error-unmatch .env.local` → `did not match`; `.gitignore:26-28` | Versionado / ignorado | ✅ (verificado por reprodução, não por teste) |

### P1 — Schema versionado e reproduzível

| Requisito / AC | Evidência | Esperado pelo spec | Coberto? |
| --- | --- | --- | --- |
| FND-04 AC1 — `db reset` reconstrói as 4 tabelas sem passo manual | Reproduzido 9× durante o sensor: `npm run db:reset` exit 0, seguido de `test:db` `Result: PASS` | Reconstrução completa | ✅ |
| FND-04 AC2 — `profiles.id` PK → `auth.users(id)` `on delete cascade` | `supabase/tests/database/handle_new_user.test.sql:87` `select is_empty($$ select id from public.profiles where id = '3333...' $$, 'excluir o usuário apaga o perfil por cascata')` | Cascata do auth.users | ✅ |
| FND-04 AC3 — `notes.client_id` FK → `clients(id)` `on delete cascade` | `supabase/tests/database/notes.test.sql:118` `select is_empty($$ select title from public.notes where client_id = 'aaaa...' $$, ...)`; `tests/rls/notes-profiles-error-logs.test.ts:119` `expect(count).toBe(0)` | Cascata do cliente | ✅ |
| FND-05 AC4 — `status` restrito aos 5 valores | `supabase/tests/database/clients.test.sql:93` `throws_ok(... status 'arquivado' ..., '23514', ...)` | Domínio fechado | ✅ (parcial) |
| FND-05 AC4 — **`lead` como padrão** | busca: `grep -n "default\|'lead'" supabase/tests/database/clients.test.sql` → só inserts com `status` explícito (`:12`) | Default `lead` | ❌ **Nenhuma asserção. Mutação M1 sobreviveu.** |
| FND-05 AC5 — `source` restrito aos 6 valores | `clients.test.sql:97` `throws_ok(... source 'tiktok' ..., '23514', ...)` | Domínio fechado | ✅ |
| FND-05 AC6 — `income_type` restrito, aceitando nulo | `clients.test.sql:101` `throws_ok(... income_type 'autonomo' ..., '23514', ...)`; nulo exercido implicitamente em todo insert sem a coluna | Domínio fechado + nulo | ✅ |
| FND-05 AC9 — limites de tamanho da tabela de premissas | Cobertos: `name` mín 2 (`clients.test.sql:89`), `region` ≤ 80 (`:113`), `notes.title` ≤ 120 (`notes.test.sql:88`), `notes.description` ≤ 5000 (`:93`), `income ≥ 0` (`clients.test.sql:105`) | 7 limites declarados | ⚠️ **Parcial: `name` máx 120, `email` ≤ 254, `phone` ≤ 20 dígitos e `income` ≤ 99.999.999,99 não têm asserção. Mutação M3 sobreviveu.** |
| FND-06 AC7 — `updated_at` por trigger, ignorando o valor do cliente | `extensions_and_helpers.test.sql:59` `ok((select updated_at from _t7_touch where id = 1) > '2020-01-01'::timestamptz, ...)` — **tabela temporária `_t7_touch`, não `profiles`/`clients`/`notes`** | Nas três tabelas do produto | ❌ **A função é testada; a presença do trigger nas tabelas reais não. Mutação M2 sobreviveu.** |
| FND-06 AC8 — normalizar `region` e `phone` | `clients.test.sql:118` `results_eq(... region '     ' returning region $$, array[null::text], ...)`; `:123` `... phone '(11) 98765-4321' ... array['11987654321']`; `:128` `'  Zona    Sul  '` → `array['Zona Sul']` | Insert **e** update | ⚠️ **Só o caminho de insert é asserido. Nenhuma asserção normaliza em `update`, embora o spec diga "inserido ou atualizado".** |
| FND-07 AC10 — índices `(owner_id, created_at desc)`, `(owner_id, status)`, `(owner_id, source)`, `(owner_id, lower(region))`, **`(id, owner_id)`**, `notes(client_id, created_at desc)` | `clients_search.test.sql:61,68,75,82,89` (`ok(exists (select 1 from pg_indexes ... indexname = 'clients_owner_*_idx'))`); `notes.test.sql:107` | Seis índices, incluindo `(id, owner_id)` | ❌ **`clients_id_owner_idx` foi REMOVIDO** por `b5e3b71` / migration `20260915185522_drop_clients_id_owner_idx.sql:14`. O spec continua exigindo-o e não foi emendado; nenhum AD registra a mudança de requisito. |
| FND-07 AC11 — `pg_trgm` + índice GIN sobre `name` e `email` | `extensions_and_helpers.test.sql:8` `is(... extname = 'pg_trgm' ..., 'extensions', ...)`; `clients_search.test.sql:124` `is(am.amname, 'gin', ...)`; `:132` `is(opc.opcname, 'gin_trgm_ops', ...)`; `:141` plano exige `Bitmap Index Scan on clients_search_trgm_idx` | Busca textual indexada | ✅ (implementado via coluna gerada `search_text`, que cobre `name`, `email` **e** `phone` — superconjunto do exigido) |

### P1 — Isolamento de dados por usuário

| Requisito / AC | Evidência | Esperado pelo spec | Coberto? |
| --- | --- | --- | --- |
| FND-08/09/10 AC1 — RLS habilitada nas 4 tabelas | `clients.test.sql:22`, `notes.test.sql:27`, `profiles.test.sql:26`, `error_logs.test.sql:17` — todos `ok((select relrowsecurity from pg_class where oid = '...'::regclass), ...)` | RLS on | ✅ |
| **AC2 — toda política com `(select auth.uid())` e `to authenticated`** | busca: `grep -rn "polroles\|pg_policies\|policies_are\|polqual" supabase/tests/` → **zero resultados** | Forma da política (AD-003) | ❌ **Zero evidência. Mutações M6 e M7 sobreviveram.** |
| FND-08 AC3 — select devolve só as linhas do dono | `clients.test.sql:26` `results_eq($$ select name from public.clients $$, array['Cliente do Dono'], ...)`; `tests/rls/clients.test.ts:58` `expect(data).toHaveLength(1)` + `:60` `expect(data![0].owner_id).toBe(alice.id)` | Só as próprias | ✅ |
| FND-08 AC4 — insert com `owner_id` alheio é recusado | `clients.test.sql:56` `throws_ok(... owner_id '2222...' ..., '42501', ...)`; `tests/rls/clients.test.ts:83` `expect(error!.code).toBe('42501')` | Violação de política | ✅ |
| FND-08 AC5 — update/delete de cliente alheio afeta zero linhas | `clients.test.sql:48` e `:52` `is_empty(... returning name $$, ...)`; `tests/rls/clients.test.ts:106` `expect(data).toEqual([])` + `:114` `expect(real!.name).toBe('Cliente do Bruno')` | Zero linhas | ✅ |
| FND-09 AC6 — select de `notes` só de clientes do dono | `notes.test.sql:47` `results_eq($$ select title from public.notes $$, array['Ligação inicial'], ...)`; `tests/rls/notes-...ts:63` `expect(data![0].title).toBe('Ligação da Alice')` | Derivado de `clients.owner_id` | ✅ |
| FND-09 AC7 — nota apontando para cliente alheio é recusada | `notes.test.sql:77` `throws_ok(... client_id 'bbbb...' ..., '42501', ...)`; `tests/rls/notes-...ts:90` `expect(error!.code).toBe('42501')` | Violação de política | ✅ |
| FND-10 AC8 — só o próprio `profiles`; insert/delete negados a `authenticated` | `profiles.test.sql:32` `results_eq($$ select full_name from public.profiles $$, array['Dono da Conta'], ...)`; `:38` update próprio; `:59` `throws_ok(insert ..., '42501', ...)`; `:67` `throws_ok(delete ..., '42501', ...)`; `:83` `is_empty(update ... where id = '1111...' returning full_name)` | Leitura/atualização só do próprio | ✅ |
| FND-10 AC9 — `profiles.id`, `clients.owner_id`, `clients.created_at` preservados no update | `clients.test.sql:68` `ok(not has_column_privilege('authenticated','public.clients','owner_id','UPDATE'), ...)`; `:72` controle positivo em `name`; `:80` `throws_ok(update ... created_at ..., '42501', ...)`; `profiles.test.sql:52` e-mail | `clients` coberto | ⚠️ **`profiles.id` não tem asserção de imutabilidade** (nem por catálogo nem por comportamento); `clients.owner_id` e `created_at` estão sólidos. |
| FND-10 AC10 — `error_logs` só insert com o próprio id; `anon` sem acesso | `error_logs.test.sql:24-40` seis asserções de catálogo (`has_table_privilege` / `not has_table_privilege` para insert/select/update/delete × authenticated/anon); `:50` `throws_ok(... owner_id alheio ..., '42501', ...)`; `tests/rls/notes-...ts:201` `expect(error!.code).toBe('42501')` | Escrita de mão única | ✅ (melhor coberto do conjunto) |
| FND-10 AC11 — sem sessão, nega leitura e escrita nas 4 tabelas | `clients.test.sql:147`, `notes.test.sql:127`, `profiles.test.sql:95`, `error_logs.test.sql:36,39` (catálogo); `tests/rls/clients.test.ts:152` `expect(error!.code).toBe('42501')` após `signOut()` | Negação total ao anônimo | ✅ para as 4 tabelas em `select`; a negação de **escrita** anônima é coberta por catálogo, não por comportamento |
| FND-11 — suíte cruzada entre dois usuários atravessando o cliente Supabase | `tests/rls/helpers.ts:69` `criarUsuario`, `:89` `clienteDe`; 23 testes em `tests/rls/*.test.ts` | Dois usuários, operações cruzadas | ✅ |

### P1 — Perfil criado automaticamente

| Requisito / AC | Evidência | Esperado pelo spec | Coberto? |
| --- | --- | --- | --- |
| FND-12 AC1 — insert em `auth.users` cria `profiles` com id, email, full_name | `handle_new_user.test.sql:34` `results_eq(... full_name ..., array['Joana Silva'], ...)`; `:40` `... email ..., array['joana.silva@exemplo.com']`; `:78` `is_empty($$ ... left join ... where p.id is null $$, 'nenhum usuário existe sem perfil correspondente')`; `tests/rls/notes-...ts:130` `expect(data![0].full_name).toBe('Alice Martins')` | Três campos corretos | ✅ |
| FND-12 AC2 — `security definer` + `set search_path = ''` | `handle_new_user.test.sql:6` `is(p.prosecdef::text, 'true', ...)`; `:13` `is(array_to_string(p.proconfig, ','), 'search_path=""', ...)` | Padrão Supabase | ✅ |
| FND-12 AC3 — sem `full_name`, usa a parte antes do `@` | `handle_new_user.test.sql:59` `results_eq(... array['sem.nome'], ...)`; `:71` `array['vazio']` para `full_name` só com espaços | Fallback, sem falhar o cadastro | ✅ |
| FND-12 AC4 — `email` só pelo trigger, sem caminho de atualização | `profiles.test.sql:52` `throws_ok($$ update public.profiles set email = ... $$, '42501', ...)`; `handle_new_user.test.sql:93` `ok(not has_table_privilege('authenticated','public.profiles','INSERT'), ...)`; `tests/rls/notes-...ts:153` | AD-008 estrutural | ✅ |

### P2 — Tipos gerados e ferramental

| Requisito / AC | Evidência | Esperado pelo spec | Coberto? |
| --- | --- | --- | --- |
| FND-13 AC1 — `db:types` escreve e o arquivo é commitado | `git ls-files src/types/database.types.ts` ✓; reproduzido: regerar não muda o arquivo | Sem diff | ✅ (por reprodução) |
| FND-13 AC2 — cliente tipado; coluna inexistente vira erro de compilação | `src/lib/supabase.ts:16` `createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)`; `tests/rls/helpers.ts:32` `createClient<Database>(...)` | Erro de compilação | ⚠️ **Sem asserção permanente.** `tasks.md:544` documenta seis sondas manuais; nenhuma virou teste (ex.: `@ts-expect-error` sobre coluna inexistente). O gate `typecheck` só protege o código que existe hoje. |
| FND-14 AC3 — **`npm run test`** roda Vitest e sai com zero | Reproduzido: `npm error Missing script: "test"`, exit **1** | Exit zero | ❌ **Script inexistente.** |
| FND-14 AC4 — scripts `dev, build, lint, format, typecheck, **test**, test:e2e, db:reset, db:types` | `package.json:7-19` — presentes todos menos `test` | Nove scripts nomeados | ❌ **`test` ausente.** `tasks.md:125` alterou o critério para `test:unit/test:db/test:rls` sem emendar o spec nem registrar um AD. |

### P2 — Layout base e captura de erros

| Requisito / AC | Evidência | Esperado pelo spec | Coberto? |
| --- | --- | --- | --- |
| FND-15 AC1 — layout com cabeçalho e conteúdo, 320px→desktop, sem rolagem horizontal | `AppLayout.test.tsx:27` `expect(screen.getByRole('banner')).toHaveTextContent('CRM Imobiliário')`; `:42` `expect(screen.getByRole('main')).toHaveTextContent('conteúdo da rota')`; `e2e/smoke.spec.ts:41` `expect(larguraDoDocumento).toBeLessThanOrEqual(larguraDaJanela)` em 320px e `:54` em 1440px | Legível sem scroll horizontal | ✅ (bem feito: a verificação de largura está no navegador real, não no jsdom) |
| FND-16 AC2 — erro não tratado exibe tela com ação de recarregar | `RootErrorBoundary.test.tsx:44` `expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado')`; `:61` `expect(reload).toHaveBeenCalledOnce()`; `ErroDeRota.test.tsx:36` idem para erro dentro de rota; `:64` `for (const rota of rotas) expect(rota.ErrorBoundary).toBe(ErroDeRota)` | Tela de erro, não desmontagem | ✅ |
| FND-16 AC3 — com sessão, grava `owner_id`, mensagem, stack e rota | `error-log.test.ts:44` `expect(insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: 'user-1', message: ..., stack: 'Error: x\n  at foo', route: '/clients/1' }))`; `RootErrorBoundary.test.tsx:76` `expect(registrar).toHaveBeenCalledWith(expect.objectContaining({ message: 'componente quebrou' }), '/clients/7')` | Quatro campos | ✅ |
| FND-16 AC4 — sem sessão, só console; **não** tenta escrever | `error-log.test.ts:58` `expect(from).not.toHaveBeenCalled()` | Registra no console **e** não escreve | ⚠️ **Metade coberta: a não-escrita é asserida; o "registrar apenas no console" não. Mutação M8 sobreviveu.** |
| FND-16 AC5 — falha da própria gravação não lança segunda exceção | `error-log.test.ts:65` `await expect(registrarErroDoCliente(...)).resolves.toBe('falhou')`; `:71` idem para `getSession` rejeitando; `RootErrorBoundary.test.tsx:91` `expect(() => render(...)).not.toThrow()` | Sem segunda exceção | ✅ |

### Edge Cases do spec

| Edge case | Evidência | Coberto? |
| --- | --- | --- |
| Supabase local fora do ar → mensagem indicando `supabase start` | `tests/rls/helpers.ts:42-58` implementa `exigirSupabaseLocal()` com a mensagem `"Rode 'npx supabase start' ..."` | ⚠️ **Implementado, não testado.** Busca: `grep -rn "exigirSupabaseLocal" tests/` → só as chamadas em `beforeAll`. Nenhuma asserção sobre a mensagem. |
| Duas migrations com o mesmo prefixo de timestamp → `db reset` falha | Busca: `grep -rn "timestamp\|prefixo" supabase/tests/ tests/ e2e/` → nenhum caso | ❌ **Zero evidência.** Nem teste, nem verificação manual registrada. |
| `region` só com espaços → nulo | `clients.test.sql:118` `results_eq(... array[null::text], 'região com apenas espaços é gravada como nulo')` | ✅ |
| `phone` com máscara → só dígitos | `clients.test.sql:123` `results_eq(... array['11987654321'], ...)` | ✅ |
| `income` negativo → rejeitado por check | `clients.test.sql:105` `throws_ok(... income -1 ..., '23514', ...)` | ✅ |
| Falha do trigger de perfil aborta a transação de cadastro inteira | `handle_new_user.test.sql:78` assere a invariante (`nenhum usuário sem perfil`), mas nenhum teste **força** o trigger a falhar e verifica que o usuário também não nasce | ⚠️ **Só a invariante no caminho feliz.** `tasks.md:514` demonstra o comportamento por mutação descartada, não por teste permanente. |

---

## 3. Sensor de discriminação

Oito mutações, todas em áreas que o autor **não** sondou (as sondas dele estão em
`tasks.md:222,285,320,354,387,418,478,514,544,578,611,646,678,715,748,781`).

Método: edição da fonte, `npm run db:reset`, suíte relevante, leitura de
`Result: PASS/FAIL` + contagem (não de `# Failed test`), `git checkout -- <arquivo>`,
e `npm run db:reset` final. Nunca `git stash`.

| # | Mutação | Arquivo | Suíte | Resultado | Morreu? |
| --- | --- | --- | --- | --- | --- |
| M1 | `clients.status` default `'lead'` → `'contacted'` | `20260915175043_clients.sql:13` | `test:db` | exit 0, `Result: PASS`, `Tests=108` | ❌ **SOBREVIVEU** |
| M2 | Remover o trigger `clients_set_updated_at` | `20260915175043_clients.sql:66-68` | `test:db` | exit 0, `Result: PASS`, `Tests=108` | ❌ **SOBREVIVEU** |
| M3 | `clients_name_length` `between 2 and 120` → `between 2 and 400` | `20260915175043_clients.sql:21` | `test:db` | exit 0, `Result: PASS`, `Tests=108` | ❌ **SOBREVIVEU** |
| M4 | `error_logs_insert_own` → `with check (true)` | `20260915190259_error_logs.sql:41` | `test:db` + `test:rls` | exit 1, `Result: FAIL`, `Looks like you failed 1 test of 14`; rls `1 failed \| 22 passed` | ✅ Morreu — `error_logs.test.sql:50` (`throws_ok`, owner_id alheio) e `tests/rls/notes-profiles-error-logs.test.ts:195` |
| M5 | `profiles` policies → `using (true)` | `20260915174330_profiles.sql:42,46` | `test:db` + `test:rls` | exit 1, `Result: FAIL`, `Bad plan. You planned 11 tests but ran 3` (abort do arquivo); rls `2 failed \| 21 passed` | ✅ Morreu — `profiles.test.sql:32` (`results_eq` com um único `full_name`) e `tests/rls/notes-...ts:127,157` |
| M6 | Remover `to authenticated` das 4 políticas de `clients` | `20260915175043_clients.sql:82,86,90,95` | `test:db` + `test:rls` | exit 0 / exit 0, `Result: PASS`, `Tests=108`, rls `23 passed` | ❌ **SOBREVIVEU** |
| M7 | `(select auth.uid())` → `auth.uid()` nas 5 cláusulas de `clients` | `20260915175043_clients.sql:83,87,91,92,96` | `test:db` + `test:rls` | exit 0 / exit 0, `Result: PASS`, `Tests=108`, rls `23 passed` | ❌ **SOBREVIVEU** |
| M8 | Remover o `console.error` do ramo sem sessão | `src/lib/error-log.ts:39` | `test:unit` | exit 0, `43 passed` | ❌ **SOBREVIVEU** |

**Placar: 2 mortas, 6 sobreviventes.**

Sobre M6 e M7: nenhuma das duas muda o comportamento observável hoje — `anon` continua
barrado pelos `revoke`/`grant`, e `auth.uid()` sem subconsulta devolve o mesmo valor. É
exatamente por isso que são perigosas: o AC2 do spec e o AD-003 pedem a **forma** da
política (avaliação por initPlan, papel explícito), e essa forma pode ser desfeita por
qualquer refatoração futura sem que um único teste reclame. É a regressão de desempenho e
de defesa em profundidade que ninguém percebe até a tabela crescer.

Árvore ao final do sensor: `git status --porcelain` vazio; `test:db` `Result: PASS`,
`test:rls` 23/23, `test:unit` 43/43 reconfirmados após o `db:reset` final.

---

## 4. Lacunas ranqueadas

1. **`npm run test` não existe** (FND-14 AC3 e AC4, Goals linha 13). Exit 1 com
   `Missing script: "test"`. O `tasks.md:125` trocou o critério por `test:unit/test:db/test:rls`
   e marcou `[x]`, sem emendar o spec nem abrir um AD. Um desenvolvedor que siga o spec
   ou o "Independent Test" bate nisso no primeiro minuto. **Declarado cumprido e não está.**
2. **Índice `clients(id, owner_id)` exigido pelo spec foi removido** (FND-07 AC10,
   `20260915185522_drop_clients_id_owner_idx.sql:14`). A medição que motivou a remoção é
   boa e está registrada em `AD-004`/`tasks.md:420`, mas o spec continua listando o índice
   como obrigatório. O spec é a fonte da verdade: ou ele é emendado com um AD novo, ou o
   índice volta. Hoje o artefato e o código se contradizem.
3. **A forma das políticas de RLS não tem nenhuma asserção** (FND-08 AC2 / AD-003).
   Duas mutações independentes (M6, M7) atravessaram 131 testes intactas. O produto
   inteiro apoia a autorização nessas políticas (AD-001); a decisão que as governa é a
   única sem rede. Correção barata: assertar `polroles` e a presença de `SubPlan`/`InitPlan`
   em `pg_policies.qual` para as 13 políticas.
4. **Trigger `updated_at` não é verificado nas tabelas reais** (FND-06 AC7). A função é
   testada numa tabela temporária (`extensions_and_helpers.test.sql:53-61`); a ligação com
   `profiles`, `clients` e `notes` não. M2 removeu o trigger de `clients` e a suíte passou.
   Consequência prática: `updated_at` pode parar de dizer a verdade em silêncio, e a
   ordenação por "última atualização" das features seguintes herda o defeito.
5. **Limites de tamanho e o default só parcialmente cobertos** (FND-05 AC4 e AC9).
   Sem asserção: `name` máx 120 (M3 sobreviveu), `email` ≤ 254, `phone` ≤ 20 dígitos,
   `income` ≤ 99.999.999,99, e o default `lead` de `status` (M1 sobreviveu). O spec chama
   estes números um a um na tabela de premissas.
6. **Lacunas menores, em ordem**: `src/features/` e `src/components/ui/` não chegam a um
   clone (FND-01 AC5 — bastam `.gitkeep`); normalização testada só em `insert`, nunca em
   `update` (FND-06 AC8); imutabilidade de `profiles.id` sem asserção (FND-10 AC9);
   `console.error` sem sessão sem asserção (FND-16 AC4, M8); edge case do prefixo de
   timestamp duplicado sem nenhuma evidência; falha do trigger de perfil coberta só pela
   invariante do caminho feliz; FND-02 (tokens do Tailwind) e FND-13 AC2 (erro de
   compilação em coluna inexistente) verificados por sonda manual documentada, sem teste
   que regrida.

## 5. O que está genuinamente bom

Registrado porque um veredito FAIL sem isto seria injusto e enganoso: a matriz de RLS de
`clients`, `notes` e `error_logs` é sólida e discriminante nas duas camadas do AD-012; as
asserções de catálogo de `error_logs` (`error_logs.test.sql:24-40`) fixam a promessa do
AD-011 no mecanismo, e não no efeito; o teste de responsividade a 320px foi corretamente
colocado no navegador real em vez do jsdom (`e2e/smoke.spec.ts:32-43`); e as duas
lacunas que o próprio autor encontrou e fechou durante a execução (`tasks.md:352` e
`tasks.md:385`) são exatamente o tipo de honestidade que o processo deveria produzir. O
método de sonda dele funcionou; o problema é que ele não foi aplicado às áreas acima.
