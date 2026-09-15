# Validation — foundation

**Veredito: FAIL**

Progresso real e verificável: as **8 mutações que sobreviveram na rodada anterior morrem agora**,
todos os gates passam, e a lacuna mais perigosa — a forma das políticas de RLS — foi fechada com
elegância. Mas duas coisas impedem o PASS:

1. A **lacuna 4 foi declarada fechada e não está**. O trigger de `updated_at` continua sem asserção
   que o prenda ao evento `UPDATE`: uma regressão que faz `updated_at` parar de mudar em `clients`
   atravessa os 134 testes pgTAP intacta, provada aqui por consulta direta ao banco.
2. A **lacuna 6 foi declarada fechada tendo sido fechada pela metade**: dos sete itens que ela
   listava, quatro foram resolvidos e três — FND-02, FND-13 AC2 e o `.env.example` — não foram
   tocados. FND-02 é o caso grave: remover o pipeline inteiro do Tailwind deixa a aplicação sem
   uma única classe utilitária e **os oito gates continuam verdes**, incluindo o E2E em navegador real.

As 8 mutações novas deste sensor sobreviveram, todas em território não exercitado.

- **Faixa verificada**: `cd7c4a2~1..HEAD` (4 commits de correção: `cd7c4a2`, `befe98d`, `edfc250`, `67042f2`), branch `main`.
- **Árvore ao final**: limpa (`git status --porcelain` vazio); banco restaurado; `test:db` `Result: PASS`, `Files=9, Tests=134`.
- **Verificador**: independente do autor e do verificador anterior. Cobertura re-derivada a partir de `spec.md`; as afirmações da rodada 1 foram tratadas como hipóteses e **uma delas foi refutada** (ver §6).

---

## 0. Histórico — rodada anterior (resumo)

A primeira verificação reprovou a feature com **6 lacunas** e **6 de 8 mutações sobreviventes**.
As duas contradições declaradas entre artefato e código eram o script `npm run test` inexistente
(FND-14) e o índice `clients(id, owner_id)` exigido pelo spec mas removido do código (FND-07).
As quatro demais eram ausência de asserção: forma das políticas de RLS, trigger de `updated_at`
nas tabelas reais, limites de tamanho e default de `status`, e um conjunto de lacunas menores.
O autor respondeu com T24–T27.

---

## 1. Gates (código de saída capturado direto, sem pipe)

| Comando | Exit | Observação |
| ------- | ---- | ---------- |
| `npm run lint` | 0 | `--max-warnings 0` |
| `npm run typecheck` | 0 | |
| `npm run format` | 0 | `prettier --check` |
| `npm run test:unit` | 0 | 9 arquivos, 44 testes |
| `npm run test:db` | 0 | `Result: PASS`, `Files=9, Tests=134` |
| `npm run test:rls` | 0 | 2 arquivos, 23 testes |
| **`npm run test`** | **0** | **`package.json:14` — existe agora e encadeia `test:unit && test:db && test:rls`** |
| `npm run test:e2e` | 0 | 4 testes, Chromium |
| `npm run build` | 0 | |

Critérios de sucesso reproduzidos:

- `supabase db reset` + `npm run db:types` não produz diferença no arquivo commitado — **`TYPES_IDENTICAL`**.
- Nenhum segredo além das chaves publicáveis em arquivos `VITE_*` — confirmado.

---

## 2. As 6 lacunas da rodada anterior, uma a uma

| # | Lacuna | Correção | Real e suficiente? |
| --- | --- | --- | --- |
| 1 | `npm run test` não existe | `package.json:14` `"test": "npm run test:unit && npm run test:db && npm run test:rls"` | ✅ **Fechada.** Exit 0 reproduzido. Não inclui E2E, e isso é legítimo: o spec (P2 AC3) pede que o comando rode a suíte Vitest e saia com zero, não que rode o navegador. |
| 2 | Índice exigido pelo spec, removido do código | `spec.md:89` reescreve o AC10; `spec.md:44` acrescenta a premissa com a medição | ⚠️ **Fechada com ressalva.** A emenda em si é legítima (§5), mas a mesma edição acrescentou um índice ao AC10 sem declarar, e sobraram duas referências obsoletas ao índice removido. |
| 3 | Forma das políticas de RLS sem asserção | `supabase/tests/database/rls_policy_shape.test.sql:37` `is_empty(... where roles <> '{authenticated}'::name[])`; `:48` e `:57` `is_empty(... qual like '%auth.uid()%' and qual not like '%SELECT auth.uid()%')` | ✅ **Fechada, e bem.** M6 e M7 morrem. O controle positivo de `:24` (`is(count(*), 11)`) impede que a varredura passe vacuamente, e varrer o catálogo em vez de enumerar faz tabela futura entrar sozinha. |
| 4 | Trigger de `updated_at` não verificado nas tabelas reais | `triggers_and_limits.test.sql:30,36,42` (existência por `tgname`) e `:51,58,65` (efeito) | ❌ **NÃO fechada.** A asserção de catálogo filtra por `tgrelid`, `tgname` e `not tgisinternal` — **nunca por `tgtype`**, que é onde vive o evento. E a asserção de efeito é vacuamente satisfeita por um trigger `before insert`. Ver N1 em §7. |
| 5 | Limites de tamanho e o default só parcialmente cobertos | `triggers_and_limits.test.sql:71` (`is(status,'lead')`), `:77` (`name` 121), `:82` (`email` 254), `:88` (`phone` 21), `:98` (`income` 10⁸), `:103` (`lives_ok` no limite exato) | ✅ **Fechada** para o que a lacuna citava. M1 e M3 morrem, e o limite de renda é testado pelos dois lados. Permanece um flanco **novo**, não imputável a esta correção: os *conjuntos* de domínio são amostrados por um valor inválido só (N7, N8). |
| 6 | Sete lacunas menores | `.gitkeep` × 2; `:126`/`:134` normalização em update; `:142` `profiles.id`; `error-log.test.ts:70` console | ❌ **Fechada pela metade.** Quatro itens resolvidos; **três não tocados**: FND-02 (tokens do Tailwind), FND-13 AC2 (coluna inexistente vira erro de compilação) e — nunca listado, mas da mesma família — o conteúdo do `.env.example`. T27 está marcada `✅ Done` com a nota "Lacuna 6". |

**Placar: 3 fechadas, 1 fechada com ressalva, 2 não fechadas.**

---

## 3. As 8 mutações originais, reaplicadas

Método: edição da fonte, `npm run db:reset` quando migration, suíte relevante, leitura de
`Result: PASS/FAIL` e da contagem, `git checkout -- <arquivo>`, `db:reset` de novo. Nunca `git stash`.

| # | Mutação | Suíte | Resultado | Morreu? |
| --- | --- | --- | --- | --- |
| M1 | `clients.status` default `'lead'` → `'contacted'` | `test:db` | exit 1, `Result: FAIL`, `failed 1 test of 20` | ✅ `triggers_and_limits.test.sql:71` |
| M2 | Remover o trigger `clients_set_updated_at` | `test:db` | exit 1, `Result: FAIL`, `failed 2 tests of 20` | ✅ `triggers_and_limits.test.sql:36,58` |
| M3 | `clients_name_length` `2..120` → `2..400` | `test:db` | exit 1, `Result: FAIL`, `failed 1 test of 20` | ✅ `triggers_and_limits.test.sql:77` |
| M4 | `error_logs_insert_own` → `with check (true)` | `test:db` + `test:rls` | exit 1 / exit 1, `failed 1 of 14`; rls `1 failed \| 22 passed` | ✅ `error_logs.test.sql:50`, `notes-profiles-error-logs.test.ts:195` |
| M5 | políticas de `profiles` → `using (true)` | `test:db` + `test:rls` | exit 1 / exit 1, `Bad plan ... ran 3` (abort); rls `2 failed \| 21 passed` | ✅ `profiles.test.sql:32` |
| M6 | Remover `to authenticated` das 4 políticas de `clients` | `test:db` + `test:rls` | exit 1, `failed 1 test of 6`; rls 23/23 | ✅ **novo** `rls_policy_shape.test.sql:37` |
| M7 | `(select auth.uid())` → `auth.uid()` em `clients` | `test:db` + `test:rls` | exit 1, `failed 2 tests of 6`; rls 23/23 | ✅ **novo** `rls_policy_shape.test.sql:48,57` |
| M8 | Remover o `console.error` do ramo sem sessão | `test:unit` | exit 1, `1 failed \| 43 passed` | ✅ **novo** `error-log.test.ts:70` |

**Placar: 8 mortas, 0 sobreviventes** (era 2 de 8). M6 e M7 continuam invisíveis para a suíte de
comportamento — as duas atravessam `test:rls` com 23/23 — e são pegas exclusivamente pela suíte de
catálogo nova. É a repartição correta: elas não mudam efeito observável, mudam a forma que o AD-003 exige.

---

## 4. Cobertura ancorada no spec, re-derivada

Regra aplicada: só conta como coberto com `arquivo:linha` **e** a expressão da asserção.
Tabela montada a partir de leitura própria dos arquivos de teste, não da rodada anterior.

| Req | Evidência (`arquivo:linha` + expressão) | Coberto? |
| --- | --- | --- |
| **FND-01** Esqueleto executável | `e2e/smoke.spec.ts:11` `expect(page.getByRole('heading', { name: 'CRM Imobiliário' })).toBeVisible()`; `:12` `expect(errosDeConsole).toEqual([])`; gates `lint`/`typecheck`/`build` exit 0 reproduzidos | ⚠️ **Parcial.** AC5 (os seis diretórios) e AC7 (`.env.example` com as duas chaves) hoje **existem** — `git ls-files` lista `src/features/.gitkeep` e `src/components/ui/.gitkeep` —, mas nenhuma asserção os prende: N6 e N4 sobreviveram. |
| **FND-02** Tailwind v4 + tokens `@theme` | **nenhuma** — `grep -rn "tailwind\|@theme" src/**/*.test.* e2e/` → zero | ❌ **Zero evidência de teste.** `src/styles/globals.css:1,11-42` implementa; `vite.config.ts:6` liga o plugin. N3 removeu o plugin e **os 8 gates passaram**. |
| **FND-03** Validação de env | `src/lib/env.test.ts:17` `expect(() => parseEnv(semUrl)).toThrowError(/VITE_SUPABASE_URL/)`; `:21` variável vazia; `:27` URL malformada; `:35` `expect(env.VITE_SUPABASE_URL).toMatch(/^https?:\/\//)` | ✅ |
| **FND-04** Tabelas e relacionamentos | `handle_new_user.test.sql:87` `is_empty($$ select id from public.profiles where id = '3333...' $$)` (cascata de `auth.users`); `notes.test.sql:118` `is_empty($$ select title from public.notes where client_id = 'aaaa...' $$)` (cascata de `clients`); `db:reset` exit 0 reproduzido 14× | ✅ |
| **FND-05** Check constraints de domínio | `clients.test.sql:93,97,101` `throws_ok(... '23514' ...)` para `status`/`source`/`income_type`; `triggers_and_limits.test.sql:71` `is(status,'lead')` | ⚠️ **Parcial.** Cada domínio é amostrado por **um** valor inválido. Alargar o conjunto (N7) ou estreitá-lo (N8) passa despercebido. |
| **FND-06** Triggers de `updated_at` e normalização | `triggers_and_limits.test.sql:30,36,42` `ok(exists (select 1 from pg_trigger where tgrelid = ... and tgname = ...))`; `:51,58,65` `ok(updated_at > '2020-01-01')`; `:126` `results_eq(update ... returning phone \|\| '\|' \|\| region, array['21912345678\|Barra da Tijuca'])`; `:134` região só com espaços → nulo em update; `clients.test.sql:118,123,128` no insert | ⚠️ **Parcial e enganoso.** A normalização (AC8) está sólida nos dois caminhos. O `updated_at` (AC7) **não**: nenhuma asserção fixa o evento do trigger. Ver N1. |
| **FND-07** Índices e `pg_trgm` | `clients_search.test.sql:61,68,75,82,89,96` seis `ok(exists (select 1 from pg_indexes ... indexname = ...))`; `:124` `is(am.amname,'gin')`; `:132` `is(opc.opcname,'gin_trgm_ops')`; `notes.test.sql:107`; `extensions_and_helpers.test.sql:8` `is(... extname = 'pg_trgm' ..., 'extensions')` | ✅ **Agora sim** — o AC10 emendado (`spec.md:89`) casa exatamente com os seis índices asseridos. |
| **FND-08** RLS de `clients` | `clients.test.sql:26` `results_eq($$ select name from public.clients $$, array['Cliente do Dono'])`; `:48,:52` `is_empty(update/delete ... returning name)`; `:56` `throws_ok(... owner_id alheio ..., '42501')`; `:68` `ok(not has_column_privilege('authenticated','public.clients','owner_id','UPDATE'))` + `:72` controle positivo; `rls_policy_shape.test.sql:37,48,57`; `tests/rls/clients.test.ts:58,83,106,152` | ✅ **Sólido nas duas camadas do AD-012, forma e comportamento.** |
| **FND-09** RLS de `notes` | `notes.test.sql:47` `results_eq($$ select title from public.notes $$, array['Ligação inicial'])`; `:65,:69,:73` `is_empty` para select/update/delete do estranho; `:77` `throws_ok(... '42501')`; `:34,:37,:40` grants por catálogo; `tests/rls/notes-profiles-error-logs.test.ts:63,90` | ✅ As 4 operações cobertas. |
| **FND-10** RLS de `profiles` e `error_logs` | `profiles.test.sql:32,38,44,52,59,67,83,95`; `error_logs.test.sql:24-39` seis asserções de `has_table_privilege`, `:45` `lives_ok`, `:50` `throws_ok('42501')`; `triggers_and_limits.test.sql:142` `ok(not has_column_privilege('authenticated','public.profiles','id','UPDATE'))` + `:146` controle positivo | ✅ **A imutabilidade de `profiles.id` foi genuinamente fechada** e com controle positivo. |
| **FND-11** Suíte cruzada entre dois usuários | `tests/rls/helpers.ts:69` `criarUsuario`, `:89` `clienteDe`; 23 testes em `tests/rls/*.test.ts` atravessando o PostgREST | ✅ |
| **FND-12** Perfil criado por trigger | `handle_new_user.test.sql:6` `is(p.prosecdef::text,'true')`; `:13` `is(array_to_string(p.proconfig,','),'search_path=""')`; `:34,:40` nome e e-mail; `:59,:71` fallback; `:78` `is_empty($$ ... where p.id is null $$)` | ✅ |
| **FND-13** Tipos gerados e cliente tipado | AC1: `git ls-files src/types/database.types.ts` ✓ e regeneração sem diff (`TYPES_IDENTICAL`). AC2: **nenhuma asserção** | ❌ **AC2 sem cobertura.** `src/lib/supabase.ts:16` usa `createClient<Database>(...)`, mas trocar por `createClient(...)` não derruba nada (N2). |
| **FND-14** Scripts e Vitest | `package.json:7-20` lista os nove scripts exigidos, `test` inclusive (`:14`); `npm run test` exit 0 | ✅ |
| **FND-15** Layout base responsivo | `AppLayout.test.tsx:27` `expect(screen.getByRole('banner')).toHaveTextContent('CRM Imobiliário')`; `:42` `expect(screen.getByRole('main')).toHaveTextContent('conteúdo da rota')`; `e2e/smoke.spec.ts:41` e `:54` `expect(larguraDoDocumento).toBeLessThanOrEqual(larguraDaJanela)` a 320px e 1440px | ✅ Medida em navegador real, não em jsdom. |
| **FND-16** Error boundary com registro | `error-log.test.ts:44` `expect(insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id, message, stack, route }))`; `:58` `expect(from).not.toHaveBeenCalled()`; `:70` `expect(console.error).toHaveBeenCalledWith('[erro sem sessão, não persistido]', erro)`; `:96-98` truncamento; `RootErrorBoundary.test.tsx:44,61,92`; `ErroDeRota.test.tsx:36,67` | ✅ **AC4 agora coberto nas duas metades** (não escreve **e** registra no console). |

**Resumo: 10 de 16 requisitos plenamente cobertos; 4 parciais (FND-01, FND-05, FND-06); 2 sem cobertura (FND-02, FND-13 AC2).**

### Edge cases do spec

| Edge case | Evidência | Coberto? |
| --- | --- | --- |
| Supabase fora do ar → mensagem citando `supabase start` | `tests/rls/helpers.ts:52-56` implementa a mensagem | ⚠️ Implementado, **sem asserção** (N5 sobreviveu). |
| Prefixo de timestamp duplicado → `db reset` falha | **Verificado por reprodução nesta rodada**: com um segundo arquivo `20260915185522_*.sql`, `npm run db:reset` sai com **exit 1** e `duplicate key value violates unique constraint "schema_migrations_pkey" ... Key (version)=(20260915185522) already exists` | ✅ **A rodada 1 errou ao marcar isto como "zero evidência".** A garantia existe, vem do CLI e é reproduzível — só não é um teste do projeto. |
| `region` só com espaços → nulo | `clients.test.sql:118`; agora também em update, `triggers_and_limits.test.sql:134` | ✅ |
| `phone` com máscara → só dígitos | `clients.test.sql:123`; em update, `triggers_and_limits.test.sql:126` | ✅ |
| `income` negativo → rejeitado | `clients.test.sql:105` `throws_ok(... '23514')` | ✅ |
| Falha do trigger de perfil aborta o cadastro | `handle_new_user.test.sql:78` assere a invariante; nenhum teste **força** a falha | ⚠️ Inalterado desde a rodada 1. |

---

## 5. A emenda ao AC10 é legítima ou é mover a trave?

**Veredito: a remoção é legítima; a adição junto com ela não foi declarada.**

A favor da emenda, e é substancial: a medição que a motiva foi feita **antes** da verificação, durante
T11, está registrada em `AD-004` e em `tasks.md:429`, e o texto do próprio AD-004 foi corrigido para
admitir que o trade-off original estava errado — "O texto original desta linha afirmava avaliação por
linha e estava errado". A remoção do índice foi consultada com o usuário antes (`tasks.md:460`), e a
premissa entrou em `spec.md:44` com motivo e referência. Isso é o oposto de mover a trave: é um
requisito derivado de uma suposição de desempenho que a medição refutou, retirado com o rastro exposto.

Três ressalvas, em ordem de importância:

1. **A mesma edição acrescentou `clients(owner_id, name)` ao AC10** (`spec.md:89`), índice que o
   código sempre teve (`20260915180608_clients_search_and_indexes.sql:27`) e que `design.md:275`
   sempre listou — mas que o AC10 nunca mencionou. Alinhar o spec ao design é correto; fazê-lo na
   mesma linha da remoção, com a nota de T24 (`tasks.md:858`) falando **apenas** da remoção, não é.
   Uma leitura do registro de execução não revela que o AC ganhou uma exigência.
2. **Sobraram duas referências obsoletas ao índice removido.** `design.md:407` ainda diz que as
   políticas de `notes` são "apoiadas no índice `clients (id, owner_id)`", e
   `20260915182431_notes.sql:5-6` ainda afirma "resolvida pelo índice clients (id, owner_id)". A
   contradição spec↔código foi resolvida; a contradição design↔código e comentário↔código permaneceu.
3. **Nenhum AD novo foi aberto.** A emenda se apoia em AD-004, cujo `Scope` é `notes` e cuja decisão
   é sobre não desnormalizar `owner_id` — não sobre índice. A rastreabilidade é mais fina do que
   "Ver AD-004" sugere. Detalhe de forma: a premissa em `spec.md:44` está separada da tabela de
   premissas por uma linha em branco, então ela renderiza como uma tabela própria de uma linha, e
   não como a última linha da tabela a que diz pertencer.

Nada disso justifica reprovar por si só. Mas a lição da rodada 1 — o artefato é a fonte da verdade e
mudanças nele precisam ser declaradas — foi aplicada a 90%.

---

## 6. Sensor de discriminação — 8 mutações NOVAS

Escolhidas fora das 8 da rodada anterior e fora das sondas do autor
(`tasks.md:231,294,329,361,363,394,396,427,487,523,553,587,620,655,687,718,724,757,790,886,917,948`).
Alvo: território não exercitado.

| # | Mutação | Arquivo | Suítes rodadas | Resultado | Morreu? |
| --- | --- | --- | --- | --- | --- |
| N1 | `clients_set_updated_at`: `before update` → `before insert` | `20260915175043_clients.sql:67` | `test:db` | exit 0, `Result: PASS`, `Files=9, Tests=134` | ❌ **SOBREVIVEU** |
| N2 | `createClient<Database>(...)` → `createClient(...)` | `src/lib/supabase.ts:16` | `typecheck`, `lint`, `test:unit`, `build` | todos exit 0; `44 passed` | ❌ **SOBREVIVEU** |
| N3 | Remover `tailwindcss()` dos plugins do Vite | `vite.config.ts:6` | `lint`, `typecheck`, `test:unit`, `build`, `test:e2e` | todos exit 0; `44 passed`; e2e `4 passed` | ❌ **SOBREVIVEU** |
| N4 | Remover `VITE_SUPABASE_ANON_KEY` do `.env.example` | `.env.example:5` | `lint`, `format`, `test:unit`, `build` | todos exit 0 | ❌ **SOBREVIVEU** |
| N5 | Mensagem do guard → erro cru, sem citar `supabase start` | `tests/rls/helpers.ts:52` | `typecheck`, `test:rls` | exit 0; `23 passed` | ❌ **SOBREVIVEU** |
| N6 | Apagar `src/features/.gitkeep` | `src/features/.gitkeep` | `lint`, `test:unit`, `build` | todos exit 0 | ❌ **SOBREVIVEU** |
| N7 | `clients_status_allowed`: acrescentar `'archived'` ao conjunto | `20260915175043_clients.sql:29` | `test:db` | exit 0, `Result: PASS`, `Tests=134` | ❌ **SOBREVIVEU** |
| N8 | `clients_source_allowed`: remover `'portal'` do conjunto | `20260915175043_clients.sql:32` | `test:db` | exit 0, `Result: PASS`, `Tests=134` | ❌ **SOBREVIVEU** |

**Placar: 0 mortas, 8 sobreviventes.**

### N1, provada por consulta direta — a mais grave

Não é teoria. Com a mutação aplicada e `db:reset` rodado:

```
insert into public.clients (...) values (...);
 antes  = 2026-09-15 20:47:45.336084+00
update public.clients set name='Alvo Editado' where id=...;
 depois = 2026-09-15 20:47:45.336084+00      <-- não mudou
 trigger tgtype=7                            <-- ROW|BEFORE|INSERT (era 19: ROW|BEFORE|UPDATE)
```

`npm run test:db` no mesmo banco: **exit 0, `Result: PASS`**.

Por que a correção de T26 não pega: a asserção de catálogo (`triggers_and_limits.test.sql:30,36,42`)
filtra por `tgrelid`, `tgname` e `not tgisinternal`, e **nunca por `tgtype`** — um trigger de nome
certo e evento errado a satisfaz. E a asserção de efeito (`:51,58,65`) é vacuamente satisfeita:
a fixture insere `updated_at = '2001-01-01'` em `:20` e `:24`, mas um trigger `before insert`
sobrescreve esse valor com `now()` já no insert, então `updated_at > '2020-01-01'` passa **sem que
nenhum update tenha acontecido**. As duas asserções são verdadeiras e nenhuma prende o requisito.

Observação que confirma o diagnóstico: mutar as **três** tabelas mataria a suíte, porque a linha de
`profiles` já existe quando `:26` a atualiza. É exatamente o tipo de assimetria que faz a mutação
única em `clients` passar — e `clients` é a tabela que as features seguintes vão ordenar por
"última atualização".

### N3 é uma regressão total, não cosmética

Verificado comparando o CSS construído com e sem o plugin:

| | Bytes | `.max-w-3xl{...}` presente? |
| --- | --- | --- |
| Baseline | 10.783 | sim — `.max-w-3xl{max-width:var(--container-3xl)}` |
| Com N3 | 22.314 | **não** (`grep -c` → 0) |

Sem o plugin, o `@import 'tailwindcss'` é copiado cru para o bundle e **nenhuma classe utilitária é
gerada**: a aplicação vai ao ar sem estilo algum. `lint`, `typecheck`, `test:unit`, `build` e o E2E
em Chromium continuam verdes — o teste de 320px passa justamente porque uma página sem layout não
rola horizontalmente. É o FND-02 inteiro sem rede.

### N7 e N8 — os conjuntos de domínio são amostrados, não fixados

`clients.test.sql:93` rejeita `'arquivado'` e `:97` rejeita `'tiktok'`. Nenhuma asserção verifica que
os cinco valores de `status` e os seis de `source` do spec **são aceitos**, nem que **só** eles são.
Resultado: alargar o domínio com um sexto status passa, e estreitá-lo removendo `'portal'` — que
quebraria a feature `clients` em produção — também passa. Um `results_eq` sobre
`pg_get_constraintdef` ou um `lives_ok` por valor válido fecharia os dois lados.

---

## 7. Lacunas remanescentes, ranqueadas

1. **O trigger de `updated_at` continua sem asserção de evento** (FND-06 AC7) — e foi declarado
   coberto em T26. N1 sobrevive e `updated_at` para de dizer a verdade em `clients`. Correção
   barata: assertar `tgtype` no catálogo, ou seedar `updated_at` **depois** do insert (`update ...
   set updated_at = '2001-01-01'` seguido do update real), o que torna a asserção de efeito honesta.
2. **FND-02 não tem nenhuma asserção** — remover o pipeline inteiro do Tailwind passa em oito gates
   (N3). Item da lacuna 6 da rodada 1 não tocado por T27. Uma asserção sobre o CSS construído
   (a classe utilitária existe, o token virou variável) custa poucas linhas e é o que separa
   "verificado uma vez à mão" de "não regride".
3. **FND-13 AC2 não tem asserção** — o cliente pode deixar de ser tipado sem que nada caia (N2).
   Também item não tocado da lacuna 6. Um `@ts-expect-error` sobre coluna inexistente resolveria,
   e o gate `typecheck` passaria a proteger a decisão, e não só o código de hoje.
4. **Os conjuntos de domínio de `status` e `source` são amostrados por um valor inválido só**
   (FND-05 AC4/AC5) — N7 e N8 sobrevivem. Flanco novo, não uma correção falha.
5. **Referências obsoletas ao índice removido** em `design.md:407` e
   `20260915182431_notes.sql:5-6`; e a adição de `clients(owner_id, name)` ao AC10 não declarada na
   nota de T24.
6. **Menores, sem asserção**: conteúdo do `.env.example` (FND-01 AC7, N4); presença dos diretórios
   versionados (FND-01 AC5, N6 — a correção é real, um clone os recebe, mas nada a segura); mensagem
   do guard de Supabase local (edge case, N5); falha do trigger de perfil coberta só pela invariante
   do caminho feliz.

---

## 8. O que está genuinamente bom

Registrado porque um FAIL sem isto seria injusto, e porque a distância entre as duas rodadas é grande.

- **A suíte de forma das políticas é a melhor coisa desta rodada.** `rls_policy_shape.test.sql`
  mata M6 e M7, que atravessavam 131 testes; varre o catálogo em vez de enumerar, então tabela nova
  entra sozinha; e traz controle positivo (`:24`) para não passar vacuamente. O autor ainda corrigiu
  o próprio número — afirmou 13 políticas, são 11 — por causa desse controle. A fronteira de
  autorização do produto inteiro (AD-001) deixou de ter a decisão que a governa sem rede.
- **8 de 8 mutações da rodada anterior morrem**, incluindo as três que exigiam asserção nova.
- **A imutabilidade de `profiles.id` e a normalização em update** foram fechadas pelo método certo:
  catálogo com controle positivo para a camada de grant (`triggers_and_limits.test.sql:142,146`),
  comportamento para a de dados (`:126,134`) — exatamente a repartição que o AD-012 e o AD-014 pedem.
- **O limite de renda é testado pelos dois lados** (`:98` rejeita 10⁸, `:103` aceita 99.999.999,99).
  É o padrão que falta em FND-05 e que o autor já demonstrou saber aplicar.
- **A emenda ao AC10 foi feita no lugar certo** — no spec, com motivo e medição — em vez de
  silenciosamente no código, que é o que a rodada 1 encontrou.
- **`npm run test` existe e é honesto sobre não incluir E2E**, com a razão registrada.
