# Validation — foundation

**Veredito: PASS**

As seis lacunas que reprovaram a rodada 2 estão fechadas — cinco decisivamente, uma (a nº 6, as
menores) por decisão consciente de não fechar, que registro abaixo como débito. As **cinco mutações
reaplicadas morrem**, várias com mais de uma asserção caindo, e pelo mecanismo certo: a correção do
`updated_at` não é mais vacuamente satisfeita, e eu confirmei isso reaplicando N1 em vez de ler o
diff.

O que me convence a aprovar não é o placar, é onde as lacunas restantes estão. A fronteira de
autorização — que o próprio `spec.md:5` chama de "a única fronteira de autorização do produto
inteiro" — passou por três rodadas independentes de mutação sem um furo. Ela está presa em três
camadas: forma no catálogo, comportamento no pgTAP com troca de papel, e comportamento através do
PostgREST com dois usuários reais. O que sobra é cauda longa: nenhum dos cinco sobreviventes do meu
sensor toca RLS.

- **Faixa verificada**: `993d092..HEAD` (T28: `993d092`, `5ac895e`), branch `main`.
- **Árvore ao final**: limpa (`git status --porcelain` vazio); banco restaurado; `test:db`
  `Result: PASS`, `Files=9, Tests=137`.
- **Verificador**: terceiro, independente do autor e das duas rodadas anteriores. Cobertura
  re-derivada do `spec.md`; as afirmações da rodada 2 foram tratadas como hipóteses e verificadas
  por execução, não por leitura.

---

## 0. Histórico das três rodadas

| Rodada | Veredito | Lacunas | Mutações do sensor | Resposta do autor |
| --- | --- | --- | --- | --- |
| 1 | FAIL | 6 (2 contradições artefato↔código: `npm run test` inexistente e o índice `clients(id, owner_id)`; 4 ausências de asserção) | M1–M8: 6 sobreviveram | T24–T27 |
| 2 | FAIL | 6 (as 8 mutações da rodada 1 morriam, mas 2 correções eram superficiais: `updated_at` vacuamente satisfeito e a lacuna 6 fechada pela metade) | N1–N8: **8 sobreviveram** | T28 |
| 3 (esta) | **PASS** | 5 de 6 fechadas; a 6ª vira débito registrado | V1–V8: 5 sobreviveram, todas fora da fronteira de RLS | — |

---

## 1. Gates (código de saída capturado direto, sem pipe)

| Comando | Exit | Observação |
| ------- | ---- | ---------- |
| `npm run lint` | 0 | `--max-warnings 0` |
| `npm run typecheck` | 0 | `tsc -b`, inclui `src/types/database.types.test-d.ts` |
| `npm run format` | 0 | `prettier --check` |
| `npm run test:unit` | 0 | 9 arquivos, 44 testes |
| `npm run test:db` | 0 | `Result: PASS`, `Files=9, Tests=137` (era 134) |
| `npm run test:rls` | 0 | 2 arquivos, 23 testes |
| `npm run test` | 0 | `package.json:14` — encadeia `test:unit && test:db && test:rls` |
| `npm run test:e2e` | 0 | 5 testes, Chromium (era 4) |
| `npm run build` | 0 | |

Critérios de sucesso reproduzidos:

- `supabase db reset` + `npm run db:types` não produz diferença no arquivo commitado — **`TYPES_IDENTICAL`**.
- Nenhum segredo além das chaves publicáveis em arquivos `VITE_*` — confirmado em `.env.example` e `.env.local`.

---

## 2. As 6 lacunas da rodada 2, uma a uma

| # | Lacuna | Correção | Real e suficiente? |
| --- | --- | --- | --- |
| 1 | `updated_at` sem asserção de evento (FND-06 AC7) — correção anterior vacuamente satisfeita | `triggers_and_limits.test.sql:30,35,40` `is((select tgtype::int from pg_trigger where tgrelid = ... and tgname = ...), 19, ...)`; e `:54-67` semeia `2001-01-01` **com o trigger desligado** (`alter table ... disable trigger`) antes das asserções de efeito em `:71,78,85` | ✅ **Fechada, e pelo mecanismo certo.** N1 reaplicada: `exit 1`, `failed 2 tests of 23` — cai a de catálogo (`have: 7 / want: 19`) **e** a de efeito. Duas asserções independentes, nenhuma vacuamente satisfeita. Confirmado por execução, não por leitura do diff. |
| 2 | FND-02 sem nenhuma asserção — remover o plugin do Tailwind passava nos 8 gates | `e2e/smoke.spec.ts:72,73` `toHaveCSS('border-bottom-width','1px')` e `toHaveCSS('border-bottom-color','rgb(223, 227, 232)')` (= `--color-border: #dfe3e8`); `:79` `toHaveCSS('padding-left','16px')`; `:82` `toHaveCSS('font-weight','600')` | ✅ **Fechada para o pipeline.** N3 reaplicada: `test:e2e` `exit 1`. V8 (remover `import './styles/globals.css'` de `main.tsx`) também morre — o segundo modo de falha do mesmo AC. **Ressalva**: a asserção prende 1 dos 12 tokens do `@theme`; ver V4. |
| 3 | FND-13 AC2 sem asserção (tipagem do cliente) | `src/types/database.types.test-d.ts:17,20,23,26` — quatro `@ts-expect-error` sobre tabela inexistente, coluna inexistente em insert, campo obrigatório ausente e tipo errado; `:14` consulta válida como controle positivo | ✅ **Fechada.** N2 reaplicada: `typecheck` **exit 2** e `build` **exit 2**, com `error TS2578: Unused '@ts-expect-error' directive` nas quatro linhas. O gate `typecheck` passa a proteger a decisão, não só o código de hoje. |
| 4 | Conjuntos de domínio amostrados por um valor inválido só (FND-05 AC4/AC5) | `triggers_and_limits.test.sql:173,178,183` `is((select pg_get_constraintdef(oid) from pg_constraint where conname = ...), $def$CHECK (...)$def$, ...)` para `status`, `source` e `income_type` | ✅ **Fechada nas duas direções.** N7 (alargar `status` com `'archived'`): `failed 1 test of 23`. N8 (remover `'portal'` de `source`): `failed 1 test of 23`. A saída imprime `have`/`want` com a definição inteira, então a mensagem de falha já diz o que mudou. |
| 5 | Referências obsoletas ao índice removido + adição não declarada ao AC10 | `design.md:407` reescrito para "elevado pelo planner a um SubPlan com hash"; `20260915182431_notes.sql:5-7` idem; `tasks.md:859` declara explicitamente a adição de `clients(owner_id, name)` ao AC10 como "correção de omissão, não ampliação de escopo" | ✅ **Fechada** para os três itens nomeados. **Dois resíduos cosméticos**: `context.md:26` ainda afirma no presente "Compensado por índices em `notes(client_id)` e `clients(id, owner_id)`"; e `spec.md:43` continua com a linha em branco que faz a premissa de `spec.md:44` renderizar como tabela própria em vez da última linha da tabela de premissas. Nenhum dos dois é contradição spec↔código. |
| 6 | Menores: `.env.example`, diretórios versionados, mensagem do guard, falha do trigger de perfil | **Nenhuma.** T28 não tocou nenhum dos quatro, e o `Done when` da tarefa não os lista | ❌ **Não fechada.** Ver §6: são débito aceitável, não bloqueio. |

**Placar: 5 fechadas, 1 não fechada.**

---

## 3. As 5 mutações da rodada 2 reaplicadas

Método: edição da fonte, `npm run db:reset` quando migration, suíte relevante, leitura de
`Result: PASS/FAIL` e da contagem, `git checkout -- <arquivo>`, `db:reset` de novo. Nunca `git stash`.

| # | Mutação | Arquivo | Suíte | Resultado | Morreu? |
| --- | --- | --- | --- | --- | --- |
| N1 | `clients_set_updated_at`: `before update` → `before insert` | `20260915175043_clients.sql:67` | `test:db` | exit 1, `Result: FAIL`, `failed 2 tests of 23` — testes 2 e 5 | ✅ |
| N2 | `createClient<Database>(...)` → `createClient(...)` | `src/lib/supabase.ts:16` | `typecheck`, `build` | **exit 2** nos dois, 4× `TS2578` | ✅ |
| N3 | Remover `tailwindcss()` dos plugins do Vite | `vite.config.ts:6` | `test:e2e` | exit 1, `1 failed / 4 passed` | ✅ |
| N7 | `clients_status_allowed`: acrescentar `'archived'` | `20260915175043_clients.sql:29` | `test:db` | exit 1, `Result: FAIL`, `failed 1 test of 23` — teste 21 | ✅ |
| N8 | `clients_source_allowed`: remover `'portal'` | `20260915175043_clients.sql:32` | `test:db` | exit 1, `Result: FAIL`, `failed 1 test of 23` — teste 22 | ✅ |

**Placar: 5 mortas, 0 sobreviventes** (era 0 de 5).

### N1 em detalhe, porque é onde o autor já errou uma vez

A correção anterior era vacuamente satisfeita: semeava `updated_at = '2001-01-01'` **no insert**, e um
trigger `before insert` sobrescrevia a semente antes da asserção, que passava sem que update algum
tivesse acontecido. A correção de T28 ataca isso por dois lados independentes:

```
# Failed test 2: "clients tem o trigger de updated_at em BEFORE UPDATE por linha"
#         have: 7          <-- ROW|BEFORE|INSERT
#         want: 19         <-- ROW|BEFORE|UPDATE
# Failed test 5: "atualizar um cliente descarta o updated_at antigo e grava o instante corrente"
```

A asserção de efeito virou honesta porque a semente passou a ser aplicada **depois** do insert e com
o trigger desligado (`triggers_and_limits.test.sql:54-67`), de modo que, se o trigger não disparar no
update, o valor de 2001 sobrevive e a asserção cai. O comentário em `:46-53` registra as duas
armadilhas, inclusive a de que comparar antes/depois na mesma transação não funciona porque `now()`
devolve o instante de início da transação. É a forma correta, e ela discrimina.

---

## 4. Cobertura ancorada no spec, re-derivada

Regra: só conta como coberto com `arquivo:linha` **e** a expressão da asserção. Tabela montada por
leitura própria dos arquivos de teste.

| Req | Evidência (`arquivo:linha` + expressão) | Coberto? |
| --- | --- | --- |
| **FND-01** Esqueleto executável | `e2e/smoke.spec.ts:11` `expect(page.getByRole('heading', { name: 'CRM Imobiliário' })).toBeVisible()`; `:12` `expect(errosDeConsole).toEqual([])`; gates `lint`/`typecheck`/`build` exit 0 reproduzidos | ⚠️ **Parcial.** AC5 (os seis diretórios) e AC7 (`.env.example`) existem em `git ls-files`, mas nada os prende (débito D5, D6). |
| **FND-02** Tailwind v4 + tokens `@theme` | `e2e/smoke.spec.ts:72,73` `toHaveCSS('border-bottom-color','rgb(223, 227, 232)')` — o valor exato de `--color-border` em `globals.css:23`; `:79` `toHaveCSS('padding-left','16px')`; `:82` `toHaveCSS('font-weight','600')`; `:78` `toHaveCount(1)` para `<main>` | ⚠️ **Parcial, mas o essencial está preso.** O pipeline morre se removido por qualquer um dos dois caminhos (N3, V8). Dos 12 tokens do `@theme`, 1 está asserido (débito D1, V4). |
| **FND-03** Validação de env | `src/lib/env.test.ts:17` `expect(() => parseEnv(semUrl)).toThrowError(/VITE_SUPABASE_URL/)`; `:21` variável vazia; `:27` URL malformada; `:35` `expect(env.VITE_SUPABASE_URL).toMatch(/^https?:\/\//)` | ✅ |
| **FND-04** Tabelas e relacionamentos | `handle_new_user.test.sql:87` `is_empty($$ select id from public.profiles where id = '3333…' $$)` após `delete from auth.users` (cascata AC2); `notes.test.sql:118` `is_empty($$ select title from public.notes where client_id = 'aaaa…' $$)` após excluir o cliente (cascata AC3); `db:reset` exit 0 reproduzido 9× nesta rodada | ✅ |
| **FND-05** Check constraints de domínio | `triggers_and_limits.test.sql:173,178,183` `is(pg_get_constraintdef(oid), $def$CHECK ((status = ANY (ARRAY['lead'::text, …])))$def$)` para os três domínios — fixa o conjunto **exato**, nas duas direções; `:91` `is(status,'lead')` para o default; `clients.test.sql:93,97,101` `throws_ok(… '23514')` como amostra comportamental | ✅ **Agora sim.** Era a lacuna 4; N7 e N8 morrem. |
| **FND-06** Triggers de `updated_at` e normalização | AC7: `triggers_and_limits.test.sql:30,35,40` `is(tgtype::int, 19)` nas três tabelas + `:54-67` semeadura com trigger desligado + `:71,78,85` `ok(updated_at > '2020-01-01')`; `extensions_and_helpers.test.sql:59` `ok(… > '2020-01-01')` na função isolada. AC8: `clients.test.sql:118,123,128,133,138` no insert e `triggers_and_limits.test.sql:146` `results_eq(update … returning phone \|\| '\|' \|\| region, array['21912345678\|Barra da Tijuca'])`, `:154` região só com espaços → nulo em update | ✅ **Fechada.** N1 morre duas vezes; V7 (fazer `set_updated_at` respeitar o valor do cliente) morre com 4 asserções em 2 arquivos. |
| **FND-07** Índices e `pg_trgm` | `clients_search.test.sql:61,68,75,82,89,96` seis `ok(exists (select 1 from pg_indexes … indexname = …))` casando exatamente com o AC10 emendado; `:124` `is(am.amname,'gin')`; `:132` `is(opc.opcname,'gin_trgm_ops')`; `notes.test.sql:107` `notes_client_created_idx`; `extensions_and_helpers.test.sql:8` `is(… extname = 'pg_trgm' …, 'extensions')`, `:33` `is(provolatile::text,'i')` | ✅ |
| **FND-08** RLS de `clients` | `clients.test.sql:26` `results_eq($$ select name from public.clients $$, array['Cliente do Dono'])`; `:48,:52` `is_empty(update/delete … returning name)`; `:56` `throws_ok(… owner_id alheio …, '42501')`; `:68` `ok(not has_column_privilege('authenticated','public.clients','owner_id','UPDATE'))` com controle positivo em `:72`; `rls_policy_shape.test.sql:37,48,57`; `tests/rls/clients.test.ts:58,76,83,106,125,141,152` | ✅ **Sólido nas duas camadas do AD-012.** |
| **FND-09** RLS de `notes` | `notes.test.sql:47` `results_eq($$ select title from public.notes $$, array['Ligação inicial'])`; `:65,:69,:73` `is_empty` para select/update/delete do estranho; `:77` `throws_ok(… '42501')`; `:34,:37,:40` grants por coluna com positivo em `:43`; `tests/rls/notes-profiles-error-logs.test.ts:62,70,90,101,119` | ✅ As 4 operações cobertas nas duas camadas. |
| **FND-10** RLS de `profiles` e `error_logs` | `profiles.test.sql:26` RLS ligada, `:32,:38` leitura do próprio, `:52` `throws_ok(update … email, '42501')`, `:59,:67` insert/delete negados, `:83` `is_empty(update alheio)`, `:95` anon; `error_logs.test.sql:24,27,30,33` privilégios de `authenticated`, `:36,:39` de `anon`, `:45` `lives_ok`, `:50` `throws_ok('42501')` com `owner_id` alheio; `triggers_and_limits.test.sql:162` `ok(not has_column_privilege('authenticated','public.profiles','id','UPDATE'))` + positivo em `:166` | ✅ **para o que os ACs exigem.** AC10 ("negar qualquer acesso ao `anon`") é amostrado em 2 dos 4 verbos (débito D2, V2). |
| **FND-11** Suíte cruzada entre dois usuários | `tests/rls/helpers.ts:69` `criarUsuario`, `:89` `clienteDe`; 23 testes em `tests/rls/*.test.ts` atravessando o PostgREST com sessões reais de Alice e Bruno | ✅ |
| **FND-12** Perfil criado por trigger | `handle_new_user.test.sql:6` `is(prosecdef::text,'true')`; `:13` `is(array_to_string(proconfig,','),'search_path=""')`; `:20` trigger existe; `:34,:40,:46` nome, e-mail e telefone; `:59,:71` os dois fallbacks; `:78` `is_empty($$ … left join … where p.id is null $$)`; `:93` `ok(not has_table_privilege('authenticated','public.profiles','INSERT'))` (AC4) | ⚠️ **Parcial.** Coberto no essencial, mas o trigger é preso só por nome/existência — não por `tgtype`, que é justamente a correção que T28 aplicou às outras três (débito D3, V1). |
| **FND-13** Tipos gerados e cliente tipado | AC1: `git ls-files src/types/database.types.ts` ✓ e `db:types` sem diff (**`TYPES_IDENTICAL`**, reproduzido). AC2: `src/types/database.types.test-d.ts:17,20,23,26` quatro `@ts-expect-error`, com controle positivo em `:14` | ✅ **Era a lacuna 3; N2 morre no `typecheck` e no `build`.** |
| **FND-14** Scripts e Vitest | `package.json:7-20` lista os nove scripts exigidos, `test` inclusive (`:14`); `npm run test` exit 0 reproduzido | ⚠️ **Parcial.** Os scripts existem, mas nada prende **o que** a suíte cobre: estreitar o glob do projeto `unit` derruba 22 dos 44 testes e `npm run test` continua exit 0 (débito D4, V5). |
| **FND-15** Layout base responsivo | `AppLayout.test.tsx:27` `expect(screen.getByRole('banner')).toHaveTextContent('CRM Imobiliário')`; `:42,:43` conteúdo no `main` e não no `banner`; `e2e/smoke.spec.ts:41` e `:54` `expect(larguraDoDocumento).toBeLessThanOrEqual(larguraDaJanela)` a 320px e 1440px; `:78` exatamente um `<main>` | ✅ Medida em navegador real. |
| **FND-16** Error boundary com registro | `error-log.test.ts:44` `expect(insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id, message, stack, route }))`; `:58` `expect(from).not.toHaveBeenCalled()`; `:70` `expect(console.error).toHaveBeenCalledWith('[erro sem sessão, não persistido]', erro)`; `:77,:83` não lança quando o insert é recusado (AC5); `:96-98` truncamento; `RootErrorBoundary.test.tsx:44,61,76,92`; `ErroDeRota.test.tsx:36,45,57,67` | ✅ Os cinco ACs cobertos. |

**Resumo: 11 de 16 requisitos plenamente cobertos; 5 parciais (FND-01, FND-02, FND-10, FND-12,
FND-14); 0 sem cobertura.** Era 10 plenos / 4 parciais / 2 zerados na rodada 2.

### Edge cases do spec

| Edge case | Evidência | Coberto? |
| --- | --- | --- |
| Supabase fora do ar → mensagem citando `supabase start` | `tests/rls/helpers.ts:52-57` implementa a mensagem | ⚠️ Implementado, sem asserção (débito D7). |
| Prefixo de timestamp duplicado → `db reset` falha | Reproduzido na rodada 2: `exit 1`, `duplicate key value violates unique constraint "schema_migrations_pkey"`. Garantia do CLI, não teste do projeto | ✅ |
| `region` só com espaços → nulo | `clients.test.sql:118`; em update, `triggers_and_limits.test.sql:154` | ✅ |
| `phone` com máscara → só dígitos | `clients.test.sql:123`; em update, `triggers_and_limits.test.sql:146` | ✅ |
| `income` negativo → rejeitado | `clients.test.sql:105` `throws_ok(… '23514')`; limite superior nos dois lados em `triggers_and_limits.test.sql:118` (rejeita 10⁸) e `:123` (`lives_ok` em 99.999.999,99) | ✅ |
| Falha do trigger de perfil aborta o cadastro | `handle_new_user.test.sql:78` assere a invariante; nenhum teste **força** a falha | ⚠️ Inalterado nas três rodadas (débito D8). |

---

## 5. Sensor de discriminação — 8 mutações NOVAS

Escolhidas fora de M1–M8 (rodada 1), fora de N1–N8 (rodada 2) e fora das sondas do autor registradas
em `tasks.md:294,329,361,363,394,396,427,487,523,553,587,620,655,687,718,724,757,790,886,917,948,992`.
Alvo: território ainda não exercitado por ninguém.

| # | Mutação | Arquivo | Suítes rodadas | Resultado | Morreu? |
| --- | --- | --- | --- | --- | --- |
| V1 | `on_auth_user_created`: `after insert` → `after insert or update` em `auth.users` | `20260915190711_handle_new_user.sql:38` | `test:db`, `test:rls` | `test:db` **exit 0, `Result: PASS`, `Tests=137`**; `test:rls` exit 1, `Database error creating new user` | ⚠️ **Morre, mas pela suíte errada** |
| V2 | `grant delete on public.error_logs to anon` | `20260915190259_error_logs.sql:36` | `test:db`, `test:rls` | exit 0 / exit 0; `Tests=137`, `23 passed` | ❌ **SOBREVIVEU** |
| V3 | `error_logs_message_length` `1..2000` → `1..200` | `20260915190259_error_logs.sql:20` | `test:db`, `test:rls`, `test:unit` | todos exit 0; `Tests=137`, `23 passed`, `44 passed` | ❌ **SOBREVIVEU** |
| V4 | Apagar 6 dos 12 tokens do `@theme` (`--color-primary`, `-primary-ink`, `-danger`, `-danger-ink`, `-success`, `-warning`, `--radius-control`, `--radius-surface`) | `src/styles/globals.css:25-41` | `lint`, `build`, `test:unit`, `test:e2e` | todos exit 0; e2e `5 passed` | ❌ **SOBREVIVEU** |
| V5 | Projeto `unit` do Vitest: `include: ['src/**/*.test.{ts,tsx}']` → `['src/lib/**/*.test.{ts,tsx}']` | `vitest.config.ts:13` | `test:unit`, `test`, `lint`, `typecheck` | todos exit 0; **`Tests 22 passed (22)`** em vez de 44 | ❌ **SOBREVIVEU** |
| V6 | `notes_normalize`: `before insert or update` → `before insert` | `20260915182431_notes.sql:40` | `test:db`, `test:rls` | exit 0 / exit 0; `Tests=137`, `23 passed` | ❌ **SOBREVIVEU** |
| V7 | `set_updated_at()`: `new.updated_at := now()` → `:= coalesce(new.updated_at, now())` | `20260915170646_extensions_and_helpers.sql:19` | `test:db` | exit 1, `Result: FAIL`, `failed 1 of 6` **e** `failed 3 of 23` — 4 asserções em 2 arquivos | ✅ |
| V8 | Remover `import './styles/globals.css'` de `main.tsx` | `src/main.tsx:8` | `lint`, `typecheck`, `build`, `test:unit`, `test:e2e` | 4 verdes; `test:e2e` exit 1, `1 failed / 4 passed` | ✅ |

**Placar: 3 mortas (V1 com ressalva), 5 sobreviventes.**

Comparação honesta com as rodadas anteriores: rodada 1 teve 6 de 8 sobreviventes, rodada 2 teve 8 de
8, esta teve 5 de 8. O número caiu menos do que a qualidade sugere, e a razão é que **a superfície
fácil acabou**: as duas rodadas anteriores encontraram furos na fronteira de autorização e nos
mecanismos centrais; eu tive que ir buscar em grants secundários, tokens de tema e configuração do
runner. Nenhum dos cinco sobreviventes toca RLS, `owner_id`, política, ou o isolamento entre usuários.

### V5 é o mais incômodo dos cinco

`npm run test` sai com **exit 0** enquanto 22 dos 44 testes unitários simplesmente deixam de rodar.
Não há asserção sobre quantos testes a suíte contém, então metade dela pode desaparecer em uma
edição de glob sem nenhum sinal. O `Done when` de T28 (`tasks.md:979`) chega a fixar as contagens —
"137 pgTAP, 44 unitários, 23 de RLS, 5 E2E" — mas como item de checklist manual, não como gate.

### V1 morre pelo motivo errado

Vale registrar porque é instrutivo. Alargar o evento do trigger de `auth.users` passa **intacto** pela
suíte que é dona do FND-12 (`Result: PASS`, `Tests=137`): `handle_new_user.test.sql:20` prende o
trigger por `tgname` e `not tgisinternal`, exatamente o padrão que T28 substituiu por `tgtype` nas
outras três tabelas. Quem derruba a mutação é `test:rls`, e por acidente — o fluxo real de criação de
usuário do GoTrue atualiza `auth.users`, o trigger dispara de novo e a inserção duplicada em
`profiles` explode com `Database error creating new user`. A regressão é detectada, mas por um teste
que não a tem como alvo e cuja mensagem não aponta para a causa. A correção de T28 está certa; ela só
não foi aplicada ao quarto trigger.

### V3 é a única com consequência em produção

Encolher a constraint de `message` para 200 caracteres não derruba nada porque `error-log.test.ts`
verifica o truncamento contra um mock (`:96-98`, `toHaveLength(2000)`), e o pgTAP insere mensagens
curtas (`error_logs.test.sql:45`). Os dois lados do contrato — o limite que o cliente aplica e o
limite que o banco impõe — não estão amarrados um ao outro. Se divergirem, o error boundary segue
funcionando (`error-log.test.ts:77` garante que a falha de insert não lança), mas para de registrar
em silêncio. É o cenário de AD-011 falhando sem alarme.

---

## 6. Débito registrado — o que sobra, e por que não bloqueia

Nenhum item abaixo é uma contradição entre artefato e código, e nenhum toca a fronteira de
autorização. Listo em ordem do que eu pegaria primeiro.

| ID | Débito | Requisito | Mutação viva | Por que não bloqueia |
| --- | --- | --- | --- | --- |
| D1 | Só 1 dos 12 tokens do `@theme` tem asserção | FND-02 AC2 | V4 | O pipeline — cuja perda era catastrófica e silenciosa — está preso por dois caminhos independentes. Perder um token de cor é visível na primeira tela que o usar; perder o pipeline inteiro não era. |
| D2 | Contagem de testes não é asserida; o glob do runner pode encolher a suíte em silêncio | FND-14 AC3 | V5 | Defeito no aparato, não no produto. As contagens estão registradas em `tasks.md:979` e toda rodada de verificação as relê. Pegar de vez custa uma linha por projeto. |
| D3 | Contrato de truncamento do cliente não amarrado às constraints de `error_logs` | FND-16 AC3 | V3 | O ramo de falha já é tolerante (`error-log.test.ts:77,83`), então o pior caso é log perdido, não segunda exceção. |
| D4 | `on_auth_user_created` preso por nome, não por `tgtype` | FND-12 AC1 | V1 | A mutação morre (por `test:rls`). É a correção de T28 faltando no quarto trigger — três linhas. |
| D5 | `anon` negado em `error_logs` só em 2 dos 4 verbos | FND-10 AC10 | V2 | `anon` não tem política alguma, então a RLS nega independentemente do grant. É a segunda camada, não a primeira. |
| D6 | Normalização de `notes` em `update` sem asserção | — | V6 | Abaixo da linha do spec: o AC8 do FND-06 fala de `clients` ("WHEN um cliente é inserido ou atualizado"), e o caminho de update de `clients` **está** asserido. |
| D7 | `.env.example` e diretórios versionados sem asserção | FND-01 AC5, AC7 | N4, N6 (rodada 2) | Ambos existem em `git ls-files`; um clone os recebe. Falha de DX, detectada no primeiro `npm run dev` de quem clonar. |
| D8 | Mensagem do guard de Supabase local sem asserção | Edge case | N5 (rodada 2) | Texto de diagnóstico. |
| D9 | Falha do trigger de perfil coberta só pela invariante do caminho feliz | Edge case | — | A garantia vem do Postgres (exceção em trigger aborta a transação), não de código do projeto. O autor registrou em `tasks.md:523` que remover o fallback do nome aborta o arquivo de teste — que é a demonstração acidental do mecanismo. |
| D10 | Resíduos documentais | — | — | `context.md:26` cita o índice removido no presente; `spec.md:43` tem linha em branco que quebra a tabela de premissas em duas. |

**Fecho recomendado antes da próxima feature**: D1, D2 e D4, que juntos custam poucas linhas e cobrem
as três classes distintas (asserção de tema, asserção de contagem, asserção de evento de trigger).
D3 vale a pena quando `error_logs` for de fato consultado. Os demais podem esperar.

---

## 7. O que está genuinamente bom

- **A correção do `updated_at` é a melhor coisa desta rodada, e é uma correção de método.** O autor
  não só consertou a asserção: consertou a *classe* de erro. `triggers_and_limits.test.sql:46-53`
  documenta as duas armadilhas — comparação contra data fixa e `now()` que não avança dentro da
  transação — e a solução (semear com o trigger desligado) é a única que funciona para as duas. E
  `tasks.md:986` registra o diagnóstico sem se poupar: "É o mesmo defeito que venho caçando nos
  outros: asserção que prova o resultado sem provar o mecanismo. Cometi ao corrigir uma lacuna dessa
  exata natureza."
- **`pg_get_constraintdef` é a escolha certa para domínio.** Amostrar valores inválidos nunca detecta
  o conjunto encolhendo; assertar a definição normalizada pega as duas direções e a mensagem de falha
  já mostra o diff. Substituiu um padrão fraco por um forte, em vez de acrescentar mais amostras.
- **O `@ts-expect-error` transforma o `typecheck` em gate de decisão.** `database.types.test-d.ts:14`
  traz controle positivo, e as quatro direções asseridas (tabela, coluna, obrigatório, tipo) fazem a
  mutação falhar com `TS2578`, que é um erro legível e aponta o arquivo certo.
- **A asserção de Tailwind olha estilo computado, não classe no HTML.** É a distinção que importava:
  a classe continua no DOM com o plugin removido; o que some é o CSS por trás. E ela prende o valor
  exato do token (`rgb(223, 227, 232)` = `--color-border`), não um valor qualquer.
- **O teste novo encontrou um defeito real que três verificadores não viram**: dois `<main>`
  aninhados (`App.tsx` dentro de `AppLayout`), HTML inválido e problema de acessibilidade, corrigido
  com asserção de `toHaveCount(1)`. Um teste escrito para fechar uma lacuna achou outra coisa — sinal
  de que foi escrito olhando o sistema, e não a lacuna.
- **A fronteira de autorização sobreviveu a três rodadas independentes.** `rls_policy_shape.test.sql`
  varre o catálogo com controle positivo em `:24`; o pgTAP exerce as 4 operações × 4 tabelas com troca
  de papel; `tests/rls/*.test.ts` repete pelo PostgREST com dois usuários reais. Vinte e uma mutações
  ao longo de três rodadas, nenhuma encontrou um furo nela.
- **A rastreabilidade foi fechada sem ser maquiada.** A adição de `clients(owner_id, name)` ao AC10,
  que a rodada 2 apontou como não declarada, virou nota explícita em `tasks.md:859` admitindo a
  omissão — em vez de ser reescrita como se sempre tivesse estado lá.
