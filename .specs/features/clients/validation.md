**Result**: FAIL

# Clients — Relatório de Verificação Independente (rodada 2)

**Data**: 2026-09-19
**Spec**: `.specs/features/clients/spec.md`
**Faixa de diff**: `984a4c9..HEAD` (`4884667`) — 33 commits
**Verificador**: sub-agente independente da rodada 2 (autor ≠ verificador ≠ verificador da rodada 1)

> Não herdei o modelo mental do autor nem o do verificador da rodada 1. Os cinco gates foram
> rodados do zero com código de saída capturado diretamente, a cobertura foi re-derivada a partir
> do `spec.md`, e cada afirmação da rodada 1 foi tratada como hipótese a confirmar.
>
> **O veredito é FAIL.** Não porque a feature esteja quebrada — ela funciona, e os gates provam
> isso —, mas porque o sensor encontrou **outra ocorrência da mesma forma de defeito** que motivou
> esta rodada: uma asserção verdadeira sobre um estado que o aplicativo não alcança sozinho. O
> CLNT-16 AC3 repete, uma rota adiante, o defeito que o T29 fechou no CLNT-14 AC8. A instrução
> desta rodada é explícita: outro AC coberto por partes é FAIL.

---

## 1. Histórico das duas rodadas

| | Rodada 1 (`3fe4d87`, 2026-09-18) | Rodada 2 (esta) |
| --- | --- | --- |
| Veredito | PASS ✅ | **FAIL ❌** |
| Gates | 5 de 5 | 5 de 5 (**confirmado**) |
| Unitários | 542 | **551** (+9 das correções) |
| RLS | 52 | 52 (**confirmado**) |
| E2E | 22 | **23** (+1 da T29) |
| pgTAP | 137 | 137 (**confirmado**) |
| Requisitos com evidência | 18 de 18 | 16 de 18 plenos · **2 cobertos por partes** |
| Mutações | 12 · 11 mortas · 1 equivalente | **10 · 7 mortas · 3 sobreviveram** |
| Lacunas bloqueantes | nenhuma | **L1 (CLNT-16 AC3), L2 (CLNT-13 AC14)** |

### O que a rodada 1 afirmou × o que se confirmou

| # | Afirmação da rodada 1 | Desfecho nesta rodada |
| - | --------------------- | --------------------- |
| A1 | Os cinco gates passam (lint, typecheck, test, e2e, build), sem teste pulado ou deletado | ✅ **Confirmado.** Rodados do zero: `0` nos cinco. 551 + 137 + 52 + 23, 0 pulados |
| A2 | Baseline 244/34/15 → 542/52/22 sem queda em nenhuma suíte | ✅ **Confirmado e superado.** Agora 551/52/23. Nenhuma contagem caiu |
| A3 | A feature não criou migration; a camada de banco veio da `foundation` | ✅ **Confirmado.** `git diff --name-only 984a4c9..HEAD` não toca `supabase/migrations/` |
| A4 | CLNT-14 AC8 — "voltar para a listagem preservando os filtros" está coberto (`FichaDoCliente.test.tsx:171`) | ❌ **Não se confirmou na rodada 1** — a auditoria mostrou que a precondição (query string na URL da ficha) a navegação real nunca produzia. ✅ **Confirmado agora**, depois do T29: a cadeia inteira é percorrida por 4 unitários e 1 E2E, e as duas mutações que a revertem morrem (M1, M2) |
| A5 | CLNT-17 AC5 — "página vazia recua para a anterior" está coberto (`ListaDeClientes.test.tsx:267`) | ⚠️ **Confirmado só em parte na rodada 1**: o caminho de total zero não existia. ✅ **Confirmado agora**, depois do T30 (M3 morre) |
| A6 | CLNT-16 AC3 — "retornar à listagem com os filtros anteriores preservados" está coberto (`DialogoDeExclusao.test.tsx:123`) | ❌ **Não se confirma.** É a **mesma forma de defeito do A4**: o `destino` é entregue como propriedade pelo teste. Nenhum teste prova que a ficha o produz. **M5 sobrevive à suíte inteira, unitários e E2E** — ver §5 e §6 |
| A7 | CLNT-13 AC14 — "sem resultado ≠ carteira vazia" está coberto (`ListaDeClientes.test.tsx:182`–`:205`) | ❌ **Não se confirma.** Confirmado só para busca e status. Os ramos de **origem** e **região** de `temFiltros` não são exercidos: **M6 e M6b sobrevivem** — ver §6 |
| A8 | Sensor: 12 mutações, 11/11 não equivalentes mortas | ⚠️ **Não reproduzível como afirmado.** Bateria independente de 10 mutações: 7 mortas, **3 sobreviveram**. As três sobreviventes são em código que a rodada 1 não mutou |
| A9 | As duas camadas do AD-014 (política e grant) são verificadas separadamente, com controle positivo (L-001) | ✅ **Confirmado.** `tests/rls/client-service.test.ts:343` — `expect(fora.error!.code).toBe('42501')` (coluna fora do grant) **e** `:349` — `expect(dentro.error).toBeNull()` (coluna de dentro), com releitura em `:352`/`:353` provando `created_at` inalterado. É a L-001 aplicada corretamente |
| A10 | AD-016 asserido no objeto construído, e não na função isolada | ✅ **Confirmado.** `src/features/clients/hooks/escrita.test.ts` prende o erro que chega inteiro ao `mutationCache` |
| A11 | Dívidas D1–D10, nenhuma bloqueante | ⚠️ **Em parte.** D1–D10 continuam de pé e continuam não bloqueantes. Mas D9 (a conjunção com região só provada fora da RLS) é **vizinha** da L2 desta rodada: os ramos de região são sistematicamente os menos exercidos da feature |

---

## 2. Gates

Códigos de saída capturados **diretamente** (`comando > log 2>&1; echo $?`), nunca por pipe. Pilha
local do Supabase no ar (`npx supabase status` → DB em `54322` e API em `54321` respondendo;
`imgproxy` e `pooler` parados, irrelevantes para a suíte).

| Gate | Comando | Exit | Resultado |
| ---- | ------- | ---- | --------- |
| Lint | `npm run lint` | `0` | 0 avisos (`--max-warnings 0`) |
| Typecheck | `npm run typecheck` | `0` | sem erro |
| Test | `npm run test` | `0` | descoberta ok · **551 unitários** (50 arquivos) · **137 pgTAP** (9 arquivos) · **52 RLS** (6 arquivos) — 0 falhas, **0 pulados** |
| E2E | `npm run test:e2e` | `0` | **23 passaram** (9,0s) |
| Build | `npm run build` | `0` | `tsc -b` + `vite build` ok (aviso de tamanho de chunk, não bloqueante) |

**Integridade da suíte:**

| Suíte | Baseline (pré-feature) | Rodada 1 | Agora | Delta total |
| ----- | ---------------------- | -------- | ----- | ----------- |
| Unitários | 244 | 542 | **551** | **+307** |
| RLS | 34 | 52 | **52** | **+18** |
| E2E | 15 | 22 | **23** | **+8** |
| pgTAP | 137 | 137 | **137** | 0 |

Nenhuma contagem caiu em nenhum ponto. Nenhum teste pulado, nenhum `.skip`, nenhum `.only`.

---

## 3. Conclusão das tarefas

Os 31 itens de `tasks.md` estão marcados `✅ Done`, incluindo T29, T30 e T31 (a fase de correção
aberta em `d903e09`). Nenhuma tarefa parcial ou bloqueada. As três correções entram na faixa de
diff:

| Commit | Tarefa | O que fechou |
| ------ | ------ | ------------ |
| `af3ef13` | T29 | O link do cliente (tabela e cartão) passa a levar a query string corrente — CLNT-14 AC8 |
| `970128c` | T30 | O recuo de página passa a existir também quando o total zera — CLNT-17 AC5 |
| `4884667` | T31 | O recuo da `Paginacao` repassa o estado da navegação — CLNT-17 AC3 / CLNT-16 AC3 |

---

## 4. Critérios de Aceitação, re-derivados do `spec.md`

Percorrido requisito a requisito a partir do `spec.md`, não do `tasks.md` nem do relatório
anterior. Cada célula coberta cita `arquivo:linha` conferido nesta rodada e reproduz a expressão da
asserção. Sem `arquivo:linha` conferido = não coberto. Abaixo só as linhas onde esta rodada diverge
da anterior ou onde o desfecho merece registro; as demais foram reconferidas e batem.

### CLNT-01 a CLNT-05 — Cadastrar

| Criterion | Desfecho do spec | `file:line` + asserção | Result |
| --------- | ---------------- | ---------------------- | ------ |
| AC1 — cria, confirma, navega para a ficha | cliente criado; confirmação; `/clients/:id` | `pages/NovoCliente.test.tsx:82` — `expect(criar).toHaveBeenCalledWith(SO_O_NOME)`; `:92` — `pathname === '/clients/c1'`; `e2e/clients.spec.ts:174` — `toHaveURL(/\/clients\/[0-9a-f-]{36}$/)` e `:176` — `toContainText('Cliente cadastrado.')` | ✅ PASS |
| AC2 — nome < 2 caracteres → erro, sem requisição | frase exata; serviço não chamado | `schemas.test.ts:30` — `toBe('O nome precisa de ao menos 2 caracteres')`; `FormularioDeCliente.test.tsx:163` — `expect(enviar).not.toHaveBeenCalled()` | ✅ PASS |
| AC3 — e-mail inválido erra, vazio aceita | `'Informe um e-mail válido'`; vazio → `undefined` | `schemas.test.ts:70`, `:66` | ✅ PASS |
| AC4 — renda negativa ou > 99.999.999,99 | duas frases nomeadas | `schemas.test.ts:121`, `:126`; limite persistido: `tests/rls/client-service.test.ts:286` — `expect(relido.income).toBe(99999999.99)` | ✅ PASS |
| AC5/AC6/AC7 — conjuntos de status, origem e tipo de renda | 5 / 6 / 3 valores exatos, `lead` pré-selecionado | `schemas.test.ts:168`, `:175`, `:183` — `toEqual([...])`; `FormularioDeCliente.test.tsx:66` — `toHaveValue('lead')` | ✅ PASS |
| AC8 — região como texto com sugestões | `datalist` com as regiões do consultor; valor livre aceito | `NovoCliente.test.tsx:157` (cadeia real via `useRegioes`); `FormularioDeCliente.test.tsx:128` — envia região fora da lista | ✅ PASS |
| AC9 — envio duplicado impedido | botão `disabled`, `aria-busy`, 1 chamada | `FormularioDeCliente.test.tsx:217`/`:218`/`:231`; `NovoCliente.test.tsx:145` | ✅ PASS |
| AC10 — recusa do Supabase preserva o digitado | frase em português; campos intactos; sem navegação | `NovoCliente.test.tsx:117`, `:120`, `:121`, `:122`; ponto único: `services/client-service.test.ts:444` | ✅ PASS |
| AC11 — sair com alterações pede confirmação | diálogo "Sair sem salvar?", rota mantida | `NovoCliente.test.tsx:167`/`:168` | ✅ PASS |
| CLNT-02 — `owner_id` do usuário autenticado | linha persistida com `owner_id = auth.uid()` | **estado persistido**: `tests/rls/client-service.test.ts:248` — `expect(data!.owner_id).toBe(joana.id)`; carteiras disjuntas: `:112`/`:118` | ✅ PASS |

### CLNT-07 a CLNT-12 — Listar, buscar, filtrar, ordenar

| Criterion | Desfecho do spec | `file:line` + asserção | Result |
| --------- | ---------------- | ---------------------- | ------ |
| AC1 — só os seus, `created_at` desc, páginas de 20 | linhas disjuntas; `.order('created_at',{ascending:false})`; `range(0,19)` | `tests/rls/client-service.test.ts:113`/`:119`; `client-service.test.ts:171`, `:99`, `:113`; observado: `e2e/clients.spec.ts:179` | ✅ PASS (dívida D4) |
| AC2 — atraso de 300ms, parcial, sem caixa nem acento | nada antes de 300ms, uma escrita depois; acha acentuado sem acento | `BarraDeBusca.test.tsx:76`/`:87`; **pilha real**: `tests/rls/client-service.test.ts:129` — `toEqual(['José Gonçalves'])` buscando `'goncalves'`; `e2e:279` | ✅ PASS |
| AC3 — máscara de telefone removida | `(11) 98765` acha `11987654321` | **pilha real**: `tests/rls/client-service.test.ts:142`; padrões: `busca.test.ts:81`; `e2e:284` | ✅ PASS |
| AC4 — status, origem e região por E lógico | interseção | **estado real**: `tests/rls/client-service.test.ts:173`/`:174`; chamada: `client-service.test.ts:160` — `expect(consulta.eq.mock.calls).toEqual([['status','lead'],['source','instagram'],['region','Zona Sul']])` | ✅ PASS (dívida D9) |
| AC5 — regiões distintas do consultor, alfabéticas | lista ordenada, caixa agrupada | **pilha real**: `tests/rls/client-service.test.ts:181` — `toEqual(['Centro','Zona Sul'])` com `Zona Sul` e `zona sul` semeados | ✅ PASS |
| AC6/AC7 — estado na URL e restaurado | parâmetros escritos e relidos | `ListaDeClientes.test.tsx:111`–`:119` — `toHaveBeenCalledWith({busca:'ana',…,page:2})`; `filtros.test.ts:108` — ida e volta idempotente; **outra aba real**: `e2e:222`–`:228` | ✅ PASS |
| AC8 — mudar busca ou filtro volta à página 1 | `page` removido | `BarraDeBusca.test.tsx:118`–`:121`; `PainelDeFiltros.test.tsx:124` | ✅ PASS |
| AC9 — ordenar por nome ou data, asc ou desc | `.order(coluna,{ascending})` | `client-service.test.ts:171`/`:175` | ✅ PASS (dívida D3) |
| AC10 — < 768px cartões em vez de tabela | cartões visíveis, tabela oculta | `CartoesDeClientes.test.tsx` — asserção de **classe** (`md:hidden`, `hidden md:block`); nenhum teste a 375px observa o desfecho | ⚠️ PASS com dívida D1 |
| AC11 — total dos filtros correntes | número filtrado, não da carteira | `tests/rls/client-service.test.ts:161` — `expect(leads.total).toBe(2)` numa carteira de 3; `e2e:214` — `toContainText('5 clientes')` com 25 semeados | ✅ PASS |
| AC12 — carregando exibe esqueleto | esqueleto, sem tabela | `ListaDeClientes.test.tsx:102`/`:103` | ✅ PASS |
| AC13 — carteira vazia convida ao primeiro cadastro | texto + link | `ListaDeClientes.test.tsx:172`/`:173`; `e2e:384` | ✅ PASS |
| **AC14 — filtros sem resultado: mensagem distinta + limpar filtros** | **"Nenhum cliente encontrado" + botão, distinta do estado inicial, para os filtros correntes** | `ListaDeClientes.test.tsx:194`, `:196`, `:205`, `:217` — **exercita apenas `search` e `status`**. Os ramos **origem** e **região** de `temFiltros` (`ListaDeClientes.tsx:26`/`:27`) não são exercidos por nenhum teste | ❌ **COBERTO POR PARTES** — ver L2 |
| AC15 — erro com tentar de novo, sem perder filtros | alerta + botão; URL e controles intactos | `ListaDeClientes.test.tsx:225`, `:236`, `:237`, `:238`, `:248` | ✅ PASS |

### CLNT-14, CLNT-15 — Ver e editar

| Criterion | Desfecho do spec | `file:line` + asserção | Result |
| --------- | ---------------- | ---------------------- | ------ |
| AC1 — todos os campos, renda em BRL, duas datas | valores por termo | `FichaDoCliente.test.tsx:85`–`:90`, `:98`/`:99`, `:107`/`:108`; unidade: `formato.test.ts:20` | ✅ PASS |
| AC2 — não encontrado sem revelar o registro | mesmo estado nos dois casos, com volta | `FichaDoCliente.test.tsx:139`, `:141`, `:142`; **raiz real**: `tests/rls/client-service.test.ts:189` — `rejects.toMatchObject({code:'PGRST116'})` | ✅ PASS |
| **AC8 — editar, excluir e voltar preservando os filtros de origem** | **as três ações a partir da ficha; a volta mantém a query string** | **cadeia inteira, agora percorrida**: `ListaDeClientes.test.tsx:276`–`:287` (pela tabela) e `:290`–`:300` (pelo cartão); `e2e/clients.spec.ts:232`–`:258` com dado real. Mutações M1 e M2 morrem | ✅ **PASS (foi o defeito do T29; confirmado fechado)** |
| AC3/AC4/AC5/AC6/AC7 — edição | pré-preenchimento, persistência, confirmação, rota | `EditarCliente.test.tsx:110`–`:118`, `:143`, `:154`, `:201`/`:202`, `:226`/`:227`; **persistência relida**: `tests/rls/client-service.test.ts:310`–`:328`; `e2e:302`/`:306` | ✅ PASS |
| Somente as oito colunas do grant no update | igualdade profunda + asserção negativa + camada de grant | `client-service.test.ts:354`, `:365`–`:367`; **L-001 com controle positivo**: `tests/rls/client-service.test.ts:343` (`42501` fora do grant) **e** `:349` (`toBeNull()` dentro), releitura em `:352`/`:353` | ✅ PASS |

### CLNT-16, CLNT-17 — Excluir

| Criterion | Desfecho do spec | `file:line` + asserção | Result |
| --------- | ---------------- | ---------------------- | ------ |
| AC1 — diálogo nomeia o cliente, irreversível, notas junto | nome + duas frases | `DialogoDeExclusao.test.tsx:78`/`:79`, `:87`/`:88`; ligação real: `FichaDoCliente.test.tsx:201`/`:202`; `e2e:327` | ✅ PASS |
| AC2 — destrutiva distinta; cancelar focado | `data-variante='destrutiva'`; `toHaveFocus()` | `DialogoDeExclusao.test.tsx:95`, `:105`; `Botao.test.tsx:121`; `e2e:371` | ✅ PASS |
| AC3 — exclui cliente **e notas** | 0 notas e 0 clientes | **estado do banco**: `tests/rls/client-service.test.ts:401`/`:407`; **no navegador**: `e2e/clients.spec.ts:337` — `toEqual([])` | ✅ PASS |
| AC3 — **exibe confirmação** | `role="status"` com a frase | `DialogoDeExclusao.test.tsx:132`; exibição: `ListaDeClientes.test.tsx:269`; sobrevive ao recuo: `Paginacao.test.tsx:95` (T31) e `ListaDeClientes.test.tsx:329` (T30); `e2e:332` | ✅ PASS |
| **AC3 — retorna à listagem com os filtros anteriores preservados** | **`/clients` + a query string de origem** | `DialogoDeExclusao.test.tsx:123` — `expect(router.state.location.search).toBe('?status=lead&page=2')`, **com `destino` entregue como propriedade pelo próprio teste** (`:37`, `:46`). **Nenhum teste prova que `FichaDoCliente` produz esse `destino`**: o E2E de exclusão parte de `/clients` sem filtro (`e2e:320`) e conclui com `toHaveURL(/\/clients$/)` (`e2e:331`) | ❌ **COBERTO POR PARTES** — ver L1 |
| AC4 — sai da listagem, total recalculado | total menor, linha ausente | `e2e:333` — `toContainText('2 clientes')` (era 3) e `:334` — `toHaveCount(0)` | ✅ PASS |
| AC5 — página vazia recua | página anterior / primeira existente | `ListaDeClientes.test.tsx:303`–`:309` (total > 0) e `:314`–`:330` (total zero, T30); `Paginacao.test.tsx:84` | ✅ PASS |
| AC6 — falha mantém o registro | nada invalidado, nada apagado | `DialogoDeExclusao.test.tsx:158`, `:161`, `:162`; `hooks/escrita.test.ts` (guarda de `refazer`); **pilha real**: `tests/rls/client-service.test.ts:421` — `expect(count).toBe(1)` | ✅ PASS |
| AC7 — cancelar fecha sem alteração | `aoFechar` chamado, serviço não | `DialogoDeExclusao.test.tsx:170`/`:171`; `FichaDoCliente.test.tsx:212`/`:213` | ✅ PASS |
| AC8 — progresso, segunda confirmação impedida | `Excluindo…`, `disabled`, `aria-busy`, 1 chamada | `DialogoDeExclusao.test.tsx:141`–`:146` | ✅ PASS |

### CLNT-18 — Acessibilidade

Reconferido integralmente contra a rodada 1; os desfechos batem. AC1, AC3, AC4, AC5 e AC7 ✅ PASS
(`Dialogo.test.tsx`, `Campo.test.tsx`, `FormularioDeCliente.test.tsx:206`,
`e2e/clients.spec.ts:340`–`:384`). AC2 ⚠️ PASS com dívida D2 (o anel de foco não é lido como estilo
computado). AC6 ⚠️ **lacuna de precisão do spec** + dívida D5: o spec exige 4.5:1 sem dizer entre
quais pares, e nenhum teste calcula a razão — os pares medidos estão presos como par de cor
(`Botao.test.tsx:128`, `e2e/smoke.spec.ts:86`/`:87`), o que detecta a troca mas não valida o novo
par.

**Status**: **16 de 18 requisitos com evidência plena. 2 cobertos por partes** (CLNT-16 AC3,
CLNT-13 AC14). 1 lacuna de precisão do spec (CLNT-18 AC6).

---

## 5. Sensor de Discriminação

**Isolamento**: `git worktree add` a partir de `HEAD` em
`…/scratchpad/sensor`, com `node_modules` ligado por link simbólico e `.env.local` copiado.
**Nenhum `git stash` em momento algum.** Baseline de `git status --porcelain` da árvore real
capturada antes (vazia) e conferida depois: **idêntica**. Worktree removido com
`git worktree remove --force` + `git worktree prune`; `git worktree list` mostra **só a principal**.
Baseline do scratch antes de qualquer mutação: **551/551 passando**.

**Escopo**: P0 / caminho crítico → profundidade máxima. **10 mutações**, incluindo a reversão
obrigatória das três correções T29, T30 e T31.

| # | Arquivo:linha | Mutação | Resultado |
| - | ------------- | ------- | --------- |
| M1 | `components/TabelaDeClientes.tsx:111` | **Reverte T29**: o link do cliente perde `search: filtrosDaListagem` | ✅ **Morta** — 2 falhas (`TabelaDeClientes.test.tsx`, `ListaDeClientes.test.tsx > volta da ficha para a listagem filtrada de origem, pela tabela`) |
| M2 | `components/CartoesDeClientes.tsx:45` | **Reverte T29**: idem no cartão | ✅ **Morta** — 2 falhas (`CartoesDeClientes.test.tsx`, `ListaDeClientes.test.tsx > leva os filtros de origem para a ficha também pelos cartões`) |
| M3 | `pages/ListaDeClientes.tsx:89` | **Reverte T30**: remove a chamada a `useRecuoNoVazio` | ✅ **Morta** — 2 falhas (recuo com total zero; estado inicial distinto ao recuar) |
| M4 | `components/Paginacao.tsx:41` | **Reverte T31**: `{ replace: true, state: estado }` → `{ replace: true }` | ✅ **Morta** — 1 falha (`preserva a confirmação da exclusão ao recuar de página`) |
| **M5** | `pages/FichaDoCliente.tsx:140` | `destino={paraAListagem}` → `destino="/clients"`: excluir passa a devolver a listagem **sem os filtros de origem** (CLNT-16 AC3) | ❌ **SOBREVIVEU** — 551/551 unitários **e 8/8 E2E de clientes** passam |
| **M6** | `pages/ListaDeClientes.tsx:27` | `temFiltros` ignora a **região**: filtrar por região sem resultado passa a exibir "Sua carteira está vazia" (CLNT-13 AC14/AC13) | ❌ **SOBREVIVEU** — 551/551 |
| **M6b** | `pages/ListaDeClientes.tsx:26` | `temFiltros` ignora a **origem**: mesmo efeito | ❌ **SOBREVIVEU** — 551/551 |
| M6c | `pages/ListaDeClientes.tsx:25` | `temFiltros` ignora o **status** (controle: mostra que o ramo existe e é detectável quando exercido) | ✅ **Morta** — 1 falha |
| M7 | `pages/ListaDeClientes.tsx:48` | `pagina <= PADROES.page` → `pagina < PADROES.page`: o recuo dispara também na primeira página | ✅ **Morta** — 1 falha (`não navega quando o vazio já está na primeira página`, pela chave da localização) |
| M8 | `services/client-service.ts:97` | Off-by-one no fim do intervalo: `range(primeira, primeira + POR_PAGINA)` | ✅ **Morta** — 2 falhas |

**Profundidade**: P0-full (10 injeções)
**Resultado**: **7 mortas, 3 sobreviveram** — ❌ **FAIL**

A M6c é o controle que fecha o argumento da M6/M6b: o ramo do `status` é detectado porque um teste o
exercita; os de **origem** e **região** passam despercebidos porque nenhum o faz. Não é que a
asserção seja fraca — é que o estado nunca é montado.

---

## 6. Lacunas, ranqueadas

### L1 — CLNT-16 AC3: a preservação dos filtros na exclusão é asserida sobre um estado que só o teste produz · **BLOQUEANTE**

**É a mesma forma de defeito que motivou esta rodada, uma rota adiante.**

O spec exige que confirmar a exclusão "retorne à listagem com os filtros anteriores preservados". A
única evidência é `DialogoDeExclusao.test.tsx:117`–`:124`:

```
expect(router.state.location.search).toBe('?status=lead&page=2')
```

A asserção é boa e o valor é o do spec. Mas a query string vem de `renderizar({ destino =
'/clients?status=lead&page=2' })` (`:37`) — **o próprio teste entrega o `destino` como
propriedade**. Quem o produz em produção é `FichaDoCliente.tsx:64`/`:140`
(`paraAListagem = { pathname: '/clients', search: local.search }`, passado em `destino={paraAListagem}`),
e **nenhum teste assere essa ligação**:

- `FichaDoCliente.test.tsx:167`–`:175` prova que o **link** "Voltar para a listagem" carrega a query
  string — mas não que o **diálogo** a recebe. São dois consumidores do mesmo valor; provar um não
  prova o outro.
- O E2E de exclusão (`e2e/clients.spec.ts:309`–`:338`) parte de `/clients` **sem filtro algum** e
  conclui com `toHaveURL(/\/clients$/)` — uma URL que a versão mutada satisfaz igualmente.

**Prova empírica**: trocar `destino={paraAListagem}` por `destino="/clients"` deixa **551/551
unitários e 8/8 E2E passando**. O consultor que filtra a carteira, abre um cliente e o exclui volta
para a listagem inteira, sem filtro — e a suíte não vê.

**Como fechar**: um teste que percorra a cadeia real, na forma do que o T29 escreveu para o link —
montar a listagem filtrada, clicar no cliente, acionar excluir, confirmar, e asserir
`router.state.location.search`. Um E2E análogo ao de `e2e/clients.spec.ts:232`–`:258`, com a
exclusão no lugar do retorno, prende a mesma cadeia no navegador.

### L2 — CLNT-13 AC14: dois dos quatro filtros não distinguem os estados vazios · **BLOQUEANTE**

O spec separa dois estados vazios e exige que sejam distintos: AC13 (carteira vazia → convite ao
primeiro cadastro) e AC14 (filtros correntes sem resultado → "Nenhum cliente encontrado" + limpar
filtros). A separação vive em `temFiltros` (`ListaDeClientes.tsx:22`–`:29`), que testa os quatro
filtros do AC4 mais a busca.

Os testes exercitam **apenas `search` e `status`**:

- `:190` — `'/clients?search=zzz&status=inactive'`
- `:200` — `'/clients?search=zzz'`
- `:208` — `'/clients?search=zzz&status=inactive&region=Barra'` (mas com `search` presente, o ramo da
  região nunca decide sozinho)

Nenhum teste abre `/clients?region=Barra` ou `/clients?source=portal` com resultado vazio. **M6 e
M6b sobrevivem à suíte inteira**: com o ramo da região ou o da origem desativado, filtrar por região
sem resultado passa a exibir "Sua carteira está vazia" e o botão "Cadastrar o primeiro cliente" para
um consultor que **tem** carteira — exatamente o que o AC14 proíbe ("distinta do estado inicial"), e
sem a ação de limpar os filtros, que é a única saída da situação.

**Como fechar**: dois testes na forma dos que já existem, um com `region` como único filtro e outro
com `source`, asserindo "Nenhum cliente encontrado" e a ausência de "Sua carteira está vazia". A M6c
prova que a forma do teste funciona — falta só exercitar os outros dois ramos.

### L3 — CLNT-14 AC8: a volta pela edição perde os filtros · **MENOR / precisão do spec**

Cadeia reachable e observável: listagem filtrada → ficha (query preservada, T29) → **Editar**
(`FichaDoCliente.tsx:96` — `to={`/clients/${cliente.id}/edit`}`, **sem** `search`) → salvar
(`EditarCliente.tsx:75` — `navegar(`/clients/${id}`)`, **sem** `search`) → ficha sem query → "Voltar
para a listagem" devolve a carteira inteira.

O AC8 prende "preservando os filtros de origem" à ação de voltar para a listagem, e essa ação
cumpre o critério quando a ficha é aberta pela listagem. A leitura literal do spec não cobre o
retorno pela edição — por isso **menor e não bloqueante**, registrada como lacuna de precisão do
spec. Mas é o mesmo filtro perdido pelo mesmo consultor, e vale decidir explicitamente se o spec
quis isso.

---

## 7. Edge Cases

Os nove edge cases do `spec.md` reconferidos; os desfechos da rodada 1 batem.

- [x] Dois clientes de mesmo nome — `TabelaDeClientes.test.tsx:162`–`:164`
- [x] Edição de cliente excluído em outra aba — `EditarCliente.test.tsx:188`; raiz real: `tests/rls/client-service.test.ts:379`
- [x] Termo só com espaços é busca vazia — `filtros.test.ts:62`; `busca.test.ts:92`; `client-service.test.ts:147`/`:148`
- [x] `%` e `_` literais — `busca.test.ts:37`, `:42`, `:48` (contrabarra escapada primeiro). Dívida D6: sem teste de pilha real
- [x] `*` permanece curinga (limite conhecido, documentado no spec) — `busca.test.ts:56`
- [x] Nome longo truncado, valor completo acessível — `TabelaDeClientes.test.tsx:149`–`:151`
- [x] Página acima do total exibe a última existente — `Paginacao.test.tsx:84`/`:85`; serviço: `tests/rls/client-service.test.ts:151`/`:152`
- [x] Região com caixa diferente agrupa — **pilha real**: `tests/rls/client-service.test.ts:181`
- [x] Renda em branco com tipo preenchido é aceita — `schemas.test.ts:136`/`:137`

---

## 8. Success Criteria

| Critério | Evidência | Result |
| -------- | --------- | ------ |
| Cadastro mínimo < 30s no celular | fluxo mínimo provado (`NovoCliente.test.tsx:82`, `e2e:170`–`:176`); o tempo não é medido | ⚠️ Parcial (D7) |
| Busca e filtros compartilháveis por URL e restaurados | `filtros.test.ts:108`; `e2e:222`–`:228` (outra aba de verdade) | ✅ |
| Nenhuma das cinco condições exibe área em branco | `ListaDeClientes.test.tsx:102`, `:130`, `:172`, `:194`, `:225` | ✅ |
| Listagem responde < 1s com 500 clientes | nenhum teste semeia 500 linhas nem mede latência | ❌ Não verificado (D8) |
| Fluxo inteiro operável só pelo teclado | `e2e/clients.spec.ts:340`–`:384` — percurso completo por `Tab`/`Enter`/`Escape` | ✅ |

---

## 9. Qualidade de Código

| Princípio | Status | Nota |
| --------- | ------ | ---- |
| Código mínimo | ✅ | Nenhuma abstração além do necessário; `rotuloDeStatus` repetido de propósito, com a razão escrita |
| Mudanças cirúrgicas | ✅ | As três correções tocam só o que o defeito exigia (7, 3 e 3 arquivos) |
| Sem escopo extra | ✅ | Nada de notas, CSV, seleção múltipla ou filtro por período |
| Segue os padrões existentes | ✅ | Tradução de erro em ponto único como `auth-service`; testes co-locados; domínio em português |
| Sem `loader`/`action` nas rotas (AD-013) | ✅ | `src/app/router.test.tsx` — `expect(comCarregamento).toEqual([])` |
| Spec-anchored: o valor asserido é o desfecho do spec | ⚠️ | Verdadeiro em 16 de 18. Nos dois restantes a asserção é correta mas o estado é montado pelo teste (L1) ou nunca montado (L2) |
| Regra do payload/estado | ✅ | `owner_id`, as oito colunas, a cascata e o total filtrado são asseridos por **estado relido**, não por chamada |
| Cobertura por camada | ⚠️ | Todas as camadas têm arquivo, mas a ligação ficha→diálogo (L1) e dois ramos de `temFiltros` (L2) ficam de fora |
| Todo teste mapeia a um requisito | ⚠️ | Um teste órfão localizado: `Paginacao.test.tsx:114` monta `Paginacao` com `total={0}`, estado que o aplicativo **nunca produz** (`ListaDeClientes.tsx:153` devolve o estado vazio antes de montar a `Paginacao`). Inofensivo, mas é a mesma forma: asserção sobre estado inalcançável |
| Guias documentadas seguidas | ✅ | `CLAUDE.md`, `README.md`, `scripts/check-test-discovery.mjs` (passou) |
| Marcador `SPEC_DEVIATION` justificado | ⚠️ | `ListaDeClientes.tsx:125`–`:129` — razão sólida, texto ainda defasado (dívida D10) |

---

## 10. Dívida registrada

D1–D10 da rodada 1 seguem de pé e **nenhuma virou bloqueante**. Duas merecem nota nesta rodada:

- **D9** (a conjunção com região só é provada fora da suíte de RLS) é vizinha da **L2**: os ramos de
  **região** são sistematicamente os menos exercidos da feature — na consulta (D9) e agora na
  distinção dos estados vazios (L2). Vale tratar como um tema, não como dois itens soltos.
- **D8** (resposta < 1s com 500 clientes) continua o candidato mais forte a tarefa de
  acompanhamento; nenhum dos 18 CLNT o exige.

Item novo desta rodada:

- **D11** — `Paginacao.test.tsx:114` (`renderizar(0)`) assere um estado que a árvore de componentes
  não produz. Não é lacuna de cobertura; é um teste que não pode regredir de forma visível.

---

## 11. Traceabilidade

| Requirement | Status |
| ----------- | ------ |
| CLNT-01 … CLNT-12 | ✅ Verified (CLNT-07 com D4, CLNT-09 com D9, CLNT-11 com D3, CLNT-12 com D1) |
| CLNT-13 | ❌ **Needs Fix** — AC14 coberto por partes (L2) |
| CLNT-14 | ✅ Verified — AC8 confirmado fechado pelo T29 (dívida L3 sobre a volta pela edição) |
| CLNT-15 | ✅ Verified |
| CLNT-16 | ❌ **Needs Fix** — AC3 coberto por partes (L1) |
| CLNT-17 | ✅ Verified — AC5 e AC3 confirmados fechados pelo T30 e T31 |
| CLNT-18 | ✅ Verified (D2, D5; lacuna de precisão do spec no AC6) |

---

## 12. UAT Interativa

Não executada por este sub-agente: é conduzida pelo orquestrador com o usuário presente. A feature
a merece — os pontos que mais pedem julgamento humano são a densidade da tabela no desktop, a
leitura dos cartões no celular e o texto do diálogo de exclusão.

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 16/18 requisitos com evidência plena · **2 cobertos por partes** ·
1 lacuna de precisão do spec (CLNT-18 AC6)
**Sensor**: 10 mutações · **7 mortas, 3 sobreviveram** (M5, M6, M6b)
**Gate**: lint 0 · typecheck 0 · test 0 (551 unitários + 137 pgTAP + 52 RLS) · e2e 0 (23) · build 0

**O que funciona**: a cadeia do produto é percorrida de ponta a ponta — cadastrar com um campo,
achar por nome acentuado e por telefone com máscara, combinar filtros, compartilhar a URL e abri-la
em outra aba, editar, excluir com as notas indo por cascata, tudo pelo teclado. As três correções
T29, T30 e T31 estão de fato fechadas: as quatro mutações que as revertem morrem, e o CLNT-14 AC8
hoje é provado pela navegação real em quatro unitários e um E2E. As duas camadas do AD-014 são
verificadas separadamente com controle positivo, como a L-001 exige.

**O que não funciona**: a lição do T29 foi aplicada onde o defeito foi encontrado, não onde a forma
dele podia estar. O **CLNT-16 AC3** repete o defeito uma rota adiante — a preservação dos filtros na
exclusão é asserida sobre um `destino` que o teste entrega pronto, e trocá-lo por `/clients` não
derruba nada, nem nos 551 unitários nem nos 23 E2E. O **CLNT-13 AC14** tem dois dos quatro filtros
sem nenhum teste que os faça decidir, e desativá-los faz a tela oferecer "Cadastre o primeiro
cliente" a quem já tem carteira.

**Next steps**: (1) fechar L1 com um teste de cadeia real listagem→ficha→excluir e um E2E filtrado;
(2) fechar L2 com dois testes de estado vazio, um por região e um por origem; (3) decidir
explicitamente sobre L3 (a volta pela edição); (4) re-verificar. Iteração 1 de no máximo 3.

A destilação de lições não foi executada por este verificador, por restrição explícita de não
alterar a árvore além deste arquivo. O sinal para ela é nítido e vale mais que as lacunas
individuais: **corrigir um defeito de "precondição que a navegação real não produz" exige varrer os
outros consumidores do mesmo valor** — aqui, o link e o diálogo liam ambos `local.search`, o T29
prendeu o link, e o diálogo ficou solto.
