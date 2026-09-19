**Result**: PASS

# Clients — Relatório de Verificação Independente (rodada 3)

**Data**: 2026-09-19
**Spec**: `.specs/features/clients/spec.md`
**Faixa de diff**: `984a4c9..HEAD` (`27b322e`) — 40 commits, 58 arquivos
**Verificador**: sub-agente independente da rodada 3 (autor ≠ verificador ≠ verificadores das rodadas 1 e 2)

> Não herdei o modelo mental de nenhum autor nem dos dois verificadores anteriores. Os cinco gates
> foram rodados do zero com código de saída capturado diretamente, a cobertura foi re-derivada a
> partir do `spec.md`, e cada afirmação das rodadas 1 e 2 foi tratada como hipótese a confirmar.
>
> **O veredito é PASS.** As duas lacunas bloqueantes da rodada 2 estão fechadas, e o fechamento é
> empírico: as mutações que as revertem morrem. A forma de defeito que mordeu quatro vezes nesta
> feature — asserção verdadeira sobre um estado que o aplicativo não alcança sozinho — foi procurada
> onde ainda não tinha sido procurada, com 39 mutações. Sobreviveu **uma**, e ela está em código que
> nenhum critério de aceitação reivindica. Registro-a como dívida e como tarefa de correção menor,
> não como lacuna: PASS não é ausência de dívida.

---

## 1. Histórico das três rodadas

| | Rodada 1 (`3fe4d87`, 2026-09-18) | Rodada 2 (`9b2fc14`, 2026-09-19) | Rodada 3 (esta) |
| --- | --- | --- | --- |
| Veredito | PASS ✅ (indevido) | FAIL ❌ | **PASS ✅** |
| Gates | 5 de 5 | 5 de 5 | **5 de 5 (confirmado, exit `0` nos cinco)** |
| Unitários | 542 | 551 | **560** (+9 da fase 9) |
| pgTAP | 137 | 137 | **137** (confirmado) |
| RLS | 52 | 52 | **52** (confirmado) |
| E2E | 22 | 23 | **24** (+1 da fase 9) |
| Requisitos com evidência | 18 de 18 (afirmado) | 16 plenos · 2 por partes | **18 de 18 plenos** |
| Mutações | 12 · 11 mortas · 1 equivalente | 10 · 7 mortas · **3 sobreviveram** | **39 · 38 mortas · 1 sobreviveu** |
| Lacunas bloqueantes | nenhuma (errado) | L1 (CLNT-16 AC3), L2 (CLNT-13 AC14) | **nenhuma** |
| Lacunas de precisão do spec | não registradas | 1 (CLNT-18 AC6) | **2** (CLNT-18 AC6, CLNT-17 AC5) |

### As afirmações das rodadas anteriores, conferidas

| # | Afirmação | Desfecho nesta rodada |
| - | --------- | --------------------- |
| B1 | (R1 e R2) Os cinco gates passam, sem teste pulado ou deletado | ✅ **Confirmado.** Exit `0` nos cinco, capturado com `comando > log 2>&1; echo $?`. `grep -rE '\.(skip\|only\|todo)\('` em `src`, `e2e` e `tests`: **zero ocorrências**. `check-test-discovery` confirma 50/50 e 6/6 arquivos executados |
| B2 | (R1 e R2) Baseline 244/34/15, sem queda em nenhuma suíte | ✅ **Confirmado.** 560/52/24 agora: **+316 unitários, +18 RLS, +9 E2E**. Nenhuma contagem caiu em nenhuma das três rodadas |
| B3 | (R1 e R2) A feature não criou migration | ✅ **Confirmado.** `git diff --name-only 984a4c9..HEAD \| grep -c supabase/migrations` → `0` |
| B4 | (R2) **L1 — CLNT-16 AC3 coberto por partes**: `destino` entregue pelo teste; M5 sobrevive | ✅ **Confirmado como defeito, e confirmado fechado.** Minha M5 (`destino={paraAListagem}` → `destino="/clients"`) hoje **morre**. A cadeia real existe em `FichaDoCliente.test.tsx:289` e `:298`, e no navegador em `e2e/clients.spec.ts:340` |
| B5 | (R2) **L2 — CLNT-13 AC14 coberto por partes**: ramos de origem e região nunca decidem; M6/M6b sobrevivem | ✅ **Confirmado como defeito, e confirmado fechado.** Minhas M6 e M6b hoje **morrem**, pelos testes `:221` e `:233` de `ListaDeClientes.test.tsx` |
| B6 | (R2) **L3 — a volta pela edição perde os filtros** (menor) | ✅ **Confirmado como defeito, e confirmado fechado.** M7, M8 e M9 (as três ligações que a fase 9 costurou) **morrem**, por `EditarCliente.test.tsx:158`/`:170` e `FichaDoCliente.test.tsx:221` |
| B7 | (R2) As correções T29–T31 da fase 8 estão de fato fechadas | ✅ **Confirmado.** M1, M2, M3 e M4 revertem as três e todas morrem |
| B8 | (R2) **D11** — `Paginacao.test.tsx:114` monta `total={0}`, estado que a árvore não produz | ✅ **Confirmado, e segue de pé.** `ListaDeClientes.tsx:153` devolve o estado vazio antes de montar a `Paginacao`. Continua dívida, não lacuna |
| B9 | (R2) A conjunção de filtros com região só é provada fora da RLS (D9) | ❌ **Não se confirma como escrito.** `tests/rls/client-service.test.ts:166`–`:174` combina busca + status + origem contra a pilha real; a região entra pela `:178`–`:181`. A **M20** (remover `.eq('region', …)` do serviço) morre. D9 pode ser encerrada |
| B10 | (R1 e R2) As duas camadas do AD-014 são verificadas com controle positivo (L-001) | ✅ **Confirmado.** `tests/rls/client-service.test.ts:343` (`42501` fora do grant) **e** `:349` (`toBeNull()` dentro), com releitura em `:352`/`:353` provando `created_at` intacto |
| B11 | (R2) Sensor da rodada 1 "não reproduzível como afirmado" | ✅ **Confirmado no espírito.** Bateria independente de 39 mutações: 38 mortas, 1 sobreviveu — e a sobrevivente não é nenhuma das três da rodada 2 |

---

## 2. Gates

Códigos de saída capturados **diretamente** (`comando > /tmp/log 2>&1; echo $?`), **nunca por pipe**.
Pilha local do Supabase no ar antes de começar (`npx supabase status`: DB em `54322`, API em `54321`;
`imgproxy` e `pooler` parados, irrelevantes para a suíte).

| Gate | Comando | Exit | Resultado |
| ---- | ------- | ---- | --------- |
| Lint | `npm run lint` | `0` | 0 avisos (`--max-warnings 0`) |
| Typecheck | `npm run typecheck` | `0` | `tsc -b` sem erro |
| Build | `npm run build` | `0` | 339 módulos, `dist` gerado (aviso de tamanho de chunk, não bloqueante) |
| Test | `npm run test` | `0` | descoberta ok · **560 unitários** (50 arquivos) · **137 pgTAP** (9 arquivos) · **52 RLS** (6 arquivos) — 0 falhas, **0 pulados** |
| E2E | `npm run test:e2e` | `0` | **24 passaram** (8,9s) |

**Integridade da suíte:**

| Suíte | Baseline (pré-feature) | R1 | R2 | Agora | Delta |
| ----- | ---------------------- | -- | -- | ----- | ----- |
| Unitários | 244 | 542 | 551 | **560** | **+316** |
| RLS | 34 | 52 | 52 | **52** | **+18** |
| E2E | 15 | 22 | 23 | **24** | **+9** |
| pgTAP | 137 | 137 | 137 | **137** | 0 (camada da `foundation`) |

Nenhuma contagem caiu em nenhum ponto das três rodadas. Nenhum `.skip`, `.only` ou `.todo` em
`src`, `e2e` ou `tests`. Nenhuma asserção enfraquecida: as quatro tarefas da fase 9 **acrescentam**
testes e não tocam nos existentes, exceto para estender `renderizar` de `ListaDeClientes.test.tsx`
com as rotas da ficha e da edição.

---

## 3. Conclusão das tarefas

35 tarefas em `tasks.md`, **todas `✅ Done`**. Nenhuma parcial, nenhuma bloqueada.

| Commit | Tarefa | O que fechou |
| ------ | ------ | ------------ |
| `af3ef13` | T29 (fase 8) | O link do cliente (tabela e cartão) leva a query string corrente |
| `970128c` | T30 (fase 8) | Recuo de página quando o total zera |
| `4884667` | T31 (fase 8) | O recuo da `Paginacao` repassa o estado da navegação |
| `af69385` | T32 (fase 9) | Prova que a ficha produz o `destino` da exclusão — fecha **L1** |
| `45ff9b6` | T33 (fase 9) | Ramos de região e origem do estado vazio — fecha **L2** |
| `d85aa1d` | T34 (fase 9) | Filtros na ida e na volta da edição — fecha **L3** |
| `27b322e` | T35 (fase 9) | Filtros preservados ao cancelar a edição |

---

## 4. Critérios de Aceitação, re-derivados do `spec.md`

Percorrido requisito a requisito a partir do `spec.md`, **não** do `tasks.md` nem dos relatórios
anteriores. Cada célula cita `arquivo:linha` conferido nesta rodada. Sem `arquivo:linha` conferido =
não coberto.

**Teste da precondição alcançável**, aplicado a todo AC sustentado por teste de unidade: se o
estado asserido não for produzível pela navegação real, o AC é marcado **"coberto por partes"**.
Nesta rodada **nenhum AC caiu nessa marca**. A varredura está em §5.

### CLNT-01 a CLNT-06 — Cadastrar

| Criterion | Desfecho do spec | `file:line` + asserção | Result |
| --------- | ---------------- | ---------------------- | ------ |
| AC1 — cria, confirma, navega para a ficha | cliente criado; confirmação; `/clients/:id` | `NovoCliente.test.tsx:82` — `expect(criar).toHaveBeenCalledWith(SO_O_NOME)`; `:92` — `toBe('/clients/c1')`; `:104` — `toEqual({ mensagem: 'Cliente cadastrado.' })`; navegador: `e2e/clients.spec.ts:174` — `toHaveURL(/\/clients\/[0-9a-f-]{36}$/)` e `:176` | ✅ PASS |
| AC2 — nome < 2 caracteres → erro no campo, sem requisição | frase exata; serviço não chamado | `schemas.test.ts:30`/`:33`; `FormularioDeCliente.test.tsx:162`/`:163` — `expect(enviar).not.toHaveBeenCalled()`; tela: `NovoCliente.test.tsx:131`/`:132` | ✅ PASS |
| AC3 — e-mail inválido erra; vazio aceita | `'Informe um e-mail válido'`; vazio → `undefined` | `schemas.test.ts:70`, `:66` | ✅ PASS |
| AC4 — renda negativa ou > 99.999.999,99 | duas frases nomeadas | `schemas.test.ts:121`, `:126`; limite persistido na pilha real: `tests/rls/client-service.test.ts:286` — `toBe(99999999.99)` | ✅ PASS |
| AC5 — 5 status, `lead` pré-selecionado | conjunto exato + padrão | `FormularioDeCliente.test.tsx:73` — `toEqual([...])`; `:66` — `toHaveValue('lead')` | ✅ PASS |
| AC6 — 6 origens | conjunto exato | `FormularioDeCliente.test.tsx:86`; `schemas.test.ts:163` | ✅ PASS |
| AC7 — 3 tipos de renda, em branco permitido | conjunto + opcional | `schemas.test.ts:136`/`:137` — renda vazia com tipo `'formal'` aceita | ✅ PASS |
| AC8 — região como texto com sugestões do consultor | `datalist` com as regiões dele; valor novo aceito | `FormularioDeCliente.test.tsx:120` — `toEqual(['Barra','Zona Sul'])`; `:127` — envia região fora da lista; cadeia real via `useRegioes`: `NovoCliente.test.tsx:157` | ✅ PASS |
| AC9 — envio duplicado impedido | botão `disabled`, `aria-busy`, 1 chamada | `FormularioDeCliente.test.tsx:217`/`:218`/`:231`; tela: `NovoCliente.test.tsx:143`/`:145` | ✅ PASS |
| AC10 — recusa do Supabase preserva o digitado | frase em português; campos intactos; sem navegação | `NovoCliente.test.tsx:117`, `:120`, `:121`, `:122`; ponto único de tradução: `client-service.test.ts:434` | ✅ PASS |
| AC11 — sair com alterações pede confirmação | diálogo "Sair sem salvar?"; rota mantida | `NovoCliente.test.tsx:167`/`:168`; e o caso inverso em `:177`/`:178`; unidade: `ConfirmacaoDeSaida.test.tsx:66`/`:67` | ✅ PASS |
| CLNT-02 — `owner_id` do usuário autenticado | linha persistida com `owner_id = auth.uid()` | **estado relido**: `tests/rls/client-service.test.ts:248` — `toBe(joana.id)`; carteiras disjuntas: `:112`/`:118`; payload: `client-service.test.ts:290` | ✅ PASS |

### CLNT-07 a CLNT-13 — Listar, buscar, filtrar, ordenar, estados

| Criterion | Desfecho do spec | `file:line` + asserção | Result |
| --------- | ---------------- | ---------------------- | ------ |
| AC1 — só os seus, `created_at` desc, páginas de 20 | linhas disjuntas; `.order('created_at',{ascending:false})`; `range(0,19)` | `tests/rls/client-service.test.ts:112`/`:113`/`:118`/`:119`; `client-service.test.ts:99`, `:113`, `:171` | ✅ PASS |
| AC2 — atraso de 300ms; parcial; sem caixa nem acento | nada antes de 300ms, **uma** escrita depois; acha acentuado sem acento | `BarraDeBusca.test.tsx:76`/`:77` (nada antes), `:87`/`:88` (uma escrita); **pilha real**: `tests/rls/client-service.test.ts:129` — `toEqual(['José Gonçalves'])` buscando `'goncalves'`; navegador: `e2e:279` | ✅ PASS |
| AC3 — máscara de telefone removida antes de comparar | `(11) 98765` acha `11987654321` | **pilha real**: `tests/rls/client-service.test.ts:142`; padrões: `busca.test.ts:81` — `toEqual(['%(11) 98765%','%1198765%'])`; navegador: `e2e:284` | ✅ PASS |
| AC4 — status, origem e região por E lógico com a busca | interseção | **estado real**: `tests/rls/client-service.test.ts:173`/`:174` — `total` 1 e o nome exato; chamada: `client-service.test.ts:160` — `expect(consulta.eq.mock.calls).toEqual([['status','lead'],['source','instagram'],['region','Zona Sul']])`; controles: `PainelDeFiltros.test.tsx:135`–`:137` | ✅ PASS |
| AC5 — regiões distintas do consultor, alfabéticas | lista ordenada, caixa agrupada | **pilha real**: `tests/rls/client-service.test.ts:181` — `toEqual(['Centro','Zona Sul'])` com `Zona Sul` e `zona sul` semeados; unidade: `client-service.test.ts:242` | ✅ PASS |
| AC6 — todo filtro, busca, ordenação e página na URL | parâmetros escritos | `BarraDeBusca.test.tsx:97`; `PainelDeFiltros.test.tsx:103`, `:114`/`:115`; `TabelaDeClientes.test.tsx:123`; `Paginacao.test.tsx:42`; `filtros.test.ts:85`–`:91` | ✅ PASS |
| AC7 — URL aberta direto restaura exatamente o estado | consulta e controles iguais aos da URL | `ListaDeClientes.test.tsx:121`–`:129` — `toHaveBeenCalledWith({busca:'ana',status:'lead',origem:'portal',regiao:'Barra',sort:'name',order:'desc',page:2})`; `:172`–`:174`; ida e volta idempotente: `filtros.test.ts:108`; **outra aba real**: `e2e:222`–`:228` | ✅ PASS |
| AC8 — mudar busca ou filtro volta à página 1 | `page` removido da URL | `BarraDeBusca.test.tsx:107` — `expect(…get('page')).toBeNull()`; `PainelDeFiltros.test.tsx:124` | ✅ PASS |
| AC9 — ordenar por nome ou data, asc ou desc | `.order(coluna,{ascending})` + URL + `aria-sort` | `client-service.test.ts:171`/`:175`; `TabelaDeClientes.test.tsx:123`, `:133`, `:141`, `:147`, `:153` | ✅ PASS (dívida D3) |
| AC10 — < 768px cartões em vez de tabela, com busca/filtros/ações acessíveis | cartões visíveis, tabela oculta | `CartoesDeClientes.test.tsx:109` (`md:hidden`), `:116`/`:117` (`hidden md:block`), `:129` (`matchMedia` não consultado), `:141`–`:146` (mesma lista nas duas árvores); filtros não somem: `PainelDeFiltros.test.tsx:157`/`:158` | ⚠️ PASS com dívida D1 |
| AC11 — total dos filtros correntes | número filtrado, não o da carteira | `tests/rls/client-service.test.ts:161` — `toBe(2)` numa carteira de 3; navegador: `e2e:214` — `'5 clientes'` com 25 semeados | ✅ PASS |
| AC12 — carregando exibe esqueleto | esqueleto, sem tabela | `ListaDeClientes.test.tsx:112`/`:113`; ficha: `FichaDoCliente.test.tsx:132`/`:133`; edição: `EditarCliente.test.tsx:94`/`:95` | ✅ PASS |
| AC13 — carteira vazia convida ao primeiro cadastro | texto + link para `/clients/new` | `ListaDeClientes.test.tsx:182`/`:183`; distinção preservada no recuo: `:395`/`:396`; navegador: `e2e:414` | ✅ PASS |
| **AC14 — filtros sem resultado: mensagem distinta + limpar filtros** | **"Nenhum cliente encontrado" + botão, distinta do estado inicial, para os filtros correntes** | `ListaDeClientes.test.tsx:204`/`:206` (busca+status), `:215` (distinção), **`:225`–`:229` (só região)**, **`:237`–`:241` (só origem)**, `:253` (limpar devolve `search === ''`) | ✅ **PASS — era a L2; confirmado fechado (M6 e M6b morrem)** |
| AC15 — erro com tentar de novo, sem perder filtros | alerta + botão; URL e controles intactos | `ListaDeClientes.test.tsx:261`, `:272`, `:273`, `:274`, `:284`, `:295`/`:296` | ✅ PASS |

### CLNT-14, CLNT-15 — Ver e editar

| Criterion | Desfecho do spec | `file:line` + asserção | Result |
| --------- | ---------------- | ---------------------- | ------ |
| AC1 — todos os campos, renda em BRL, duas datas | valores por termo da lista de dados | `FichaDoCliente.test.tsx:143`–`:148`, `:156`/`:157` (`R$` e `3.500,50`), `:165`/`:166` (`05/01/2026`, `10/02/2026`); ausências: `:183`–`:188`; unidade: `formato.test.ts:19` | ✅ PASS |
| AC2 — não encontrado sem revelar o registro, com retorno | mesmo estado nos dois casos + volta à listagem | `FichaDoCliente.test.tsx:197`, `:199` (`queryByText('Joana Silva')` ausente), `:200` (`href === '/clients'`); **raiz real**: `tests/rls/client-service.test.ts:189` — `rejects.toMatchObject({ code: 'PGRST116' })` | ✅ PASS |
| AC3 — `/clients/:id/edit` com o mesmo formulário pré-preenchido | os oito campos com os valores atuais | `EditarCliente.test.tsx:110`–`:118` | ✅ PASS |
| AC4 — salva, confirma, reflete e volta para a ficha | persistência + `role="status"` + `/clients/:id` | `EditarCliente.test.tsx:131` (as oito colunas), `:143`, `:190`; **persistência relida**: `tests/rls/client-service.test.ts:307`–`:310`; navegador (ficha **e** listagem): `e2e:302`, `:303`, `:306` | ✅ PASS |
| AC5 — validação igual à do cadastro, sem enviar | frase do campo; serviço não chamado | `EditarCliente.test.tsx:237`/`:238` | ✅ PASS |
| AC6 — esqueleto enquanto carrega | esqueleto, sem formulário | `EditarCliente.test.tsx:94`/`:95` | ✅ PASS |
| AC7 — sair da edição com alterações pede confirmação | diálogo; rota mantida; e não pergunta após salvar | `EditarCliente.test.tsx:262`/`:263`; `:273`/`:274` | ✅ PASS |
| **AC8 — editar, excluir e voltar preservando os filtros de origem** | **as três ações a partir da ficha; a volta mantém a query string** | **cadeia real percorrida**: `ListaDeClientes.test.tsx:312`–`:323` (pela tabela), `:326`–`:336` (pelo cartão), **`:341`–`:356` (com a edição no meio do caminho)**; ligações: `FichaDoCliente.test.tsx:221` (editar leva a query), `:240`–`:243` (voltar leva a query), `:232` (excluir é destrutiva); volta da edição: `EditarCliente.test.tsx:158`, `:170`, `:179`; navegador: `e2e:252`–`:258` | ✅ **PASS — L3 confirmada fechada (M7, M8, M9 morrem)** |
| Somente as oito colunas do grant no update | igualdade profunda + asserção negativa + camada de grant | `client-service.test.ts:354`, `:365`–`:367`; **L-001 com controle positivo**: `tests/rls/client-service.test.ts:343` (`42501` fora do grant) **e** `:349` (`toBeNull()` dentro), releitura em `:352`/`:353` | ✅ PASS |

### CLNT-16, CLNT-17 — Excluir

| Criterion | Desfecho do spec | `file:line` + asserção | Result |
| --------- | ---------------- | ---------------------- | ------ |
| AC1 — diálogo nomeia o cliente, irreversível, notas junto | nome + duas frases | `DialogoDeExclusao.test.tsx:78`/`:79`, `:87`/`:88`; **acionado pela ficha real**: `FichaDoCliente.test.tsx:270`/`:271`; navegador: `e2e:327` | ✅ PASS |
| AC2 — destrutiva distinta; cancelar focado por padrão | `data-variante='destrutiva'`; `toHaveFocus()` | `DialogoDeExclusao.test.tsx:95`, `:105`; `FichaDoCliente.test.tsx:232`; unidade do foco: `Dialogo.test.tsx:79`; navegador: `e2e:402` | ✅ PASS |
| AC3 — exclui o cliente **e as notas** | 0 notas e 0 clientes | **estado do banco**: `tests/rls/client-service.test.ts:401`/`:407`; **no navegador**: `e2e:337` — `toEqual([])` | ✅ PASS |
| AC3 — **exibe confirmação** | `role="status"` com a frase | `DialogoDeExclusao.test.tsx:132`; exibida na listagem: `ListaDeClientes.test.tsx:305`/`:306`; **pela cadeia real**: `FichaDoCliente.test.tsx:301`; sobrevive ao recuo: `Paginacao.test.tsx:95` e `ListaDeClientes.test.tsx:385`; navegador: `e2e:332`, `:366` | ✅ PASS |
| **AC3 — retorna à listagem com os filtros anteriores preservados** | **`/clients` + a query string de origem** | **cadeia real, sem atalho**: `FichaDoCliente.test.tsx:289`–`:294` — listagem filtrada → link da tabela → Excluir → confirmar, e então `expect(router.state.location.search).toBe('?status=lead&region=Zona+Sul')`; a listagem que reaparece é a filtrada: `:301`–`:305` (`toHaveValue('lead')` e `toHaveBeenLastCalledWith(objectContaining({status:'lead',regiao:'Zona Sul'}))`); **navegador**: `e2e/clients.spec.ts:365`/`:367`/`:368` — `toHaveURL(/\/clients\?region=Zona\+Sul$/)` | ✅ **PASS — era a L1; confirmado fechado (M5 e M21 morrem)** |
| AC4 — sai da listagem, total e paginação recalculados | total menor, linha ausente | `e2e:333` — `'2 clientes'` (era 3) e `:334` — `toHaveCount(0)`; invalidação: `hooks/escrita.test.ts:201` | ✅ PASS |
| AC5 — página vazia recua | página anterior / última existente | total > 0: `ListaDeClientes.test.tsx:359`–`:364` e `Paginacao.test.tsx:84`/`:85`; total zero: `ListaDeClientes.test.tsx:370`–`:386`; e não recua na primeira: `:401`–`:411` (`location.key === 'default'`) | ⚠️ PASS com **lacuna de precisão do spec** — ver §8 |
| AC6 — falha mantém o registro e exibe a mensagem | diálogo aberto, rota intacta, nada invalidado | `DialogoDeExclusao.test.tsx:158`, `:161`, `:162`; guarda de `refazer`: `hooks/escrita.test.ts:216`; **pilha real**: `tests/rls/client-service.test.ts:421` — `expect(count).toBe(1)` | ✅ PASS |
| AC7 — cancelar fecha sem alteração | `aoFechar` chamado, serviço não | `DialogoDeExclusao.test.tsx:170`/`:171`/`:172`; **pela ficha real**: `FichaDoCliente.test.tsx:281`/`:282` | ✅ PASS |
| AC8 — progresso, segunda confirmação impedida | `Excluindo…`, `disabled`, `aria-busy`, 1 chamada | `DialogoDeExclusao.test.tsx:142`, `:143`, `:146` | ✅ PASS |

### CLNT-18 — Acessibilidade e uso por teclado

| Criterion | Desfecho do spec | `file:line` + asserção | Result |
| --------- | ---------------- | ---------------------- | ------ |
| AC1 — rótulo visível em cada campo | `getByLabelText` para os oito campos | `FormularioDeCliente.test.tsx:60`; filtros: `PainelDeFiltros.test.tsx:52`–`:54`; busca: `BarraDeBusca.test.tsx:58`/`:59` | ✅ PASS |
| AC2 — foco visível em todo interativo | anel de foco presente | `Botao.test.tsx` (par de classe), `e2e/smoke.spec.ts` | ⚠️ PASS com dívida D2 (não lido como estilo computado) |
| AC3 — diálogo recebe, confina e devolve o foco | foco dentro, tabulação confinada, devolvido ao fechar | `Dialogo.test.tsx:78`/`:79`, `:89`/`:92`, `:101`, `:110`, `:141`; navegador: `e2e:402`, `:405`, `:410` | ✅ PASS |
| AC4 — Escape fecha sem executar a ação | diálogo some, ação não chamada | `Dialogo.test.tsx:121`/`:122`; na saída não salva: `ConfirmacaoDeSaida.test.tsx:111`/`:112`; navegador: `e2e:403`–`:405` | ✅ PASS |
| AC5 — foco no primeiro campo inválido + erro associado | `toHaveFocus()` no primeiro inválido | `FormularioDeCliente.test.tsx:206` — `expect(screen.getByLabelText('Nome')).toHaveFocus()`; associação do erro: `Campo.test.tsx` | ✅ PASS |
| AC6 — contraste mínimo 4.5:1 | razão calculada entre texto e fundo | nenhum teste calcula a razão; os pares são presos como par de cor | ⚠️ **Lacuna de precisão do spec** + dívida D5 |
| AC7 — conclusão anunciada em região assistiva | `role="status"` | `FichaDoCliente.test.tsx:251`/`:252` (`data-tom='sucesso'`); `ListaDeClientes.test.tsx:305`/`:306`; navegador: `e2e:176`, `:302`, `:332` | ✅ PASS |

**Status**: ✅ **18 de 18 requisitos com evidência plena.** Nenhum coberto por partes.
2 lacunas de precisão do spec (CLNT-18 AC6, CLNT-17 AC5) — §8.

---

## 5. Teste da precondição alcançável

Aplicado a **todo** AC sustentado por teste de unidade. A pergunta é sempre a mesma: *o caminho real
do consultor produz esse estado?*

| Precondição montada pelo teste | Produzida pela navegação real? | Veredito |
| ------------------------------ | ------------------------------ | -------- |
| `DialogoDeExclusao` com `cliente` e `destino` por propriedade (`:37`, `:46`) | **Sim, e agora provado**: `FichaDoCliente.test.tsx:289` percorre listagem filtrada → tabela → ficha → Excluir → confirmar, sem atalho; `e2e:340` faz o mesmo no navegador | ✅ Alcançável e percorrida |
| `ListaDeClientes` montada em `/clients?region=Barra` / `?source=portal` com total 0 (`:221`, `:233`) | **Sim**: a URL é o estado da listagem (AD-015) e o AC7 exige que abrir essa URL restaure a lista. O `PainelDeFiltros` produz exatamente essas query strings (`PainelDeFiltros.test.tsx:114`/`:115`) | ✅ Alcançável |
| `ListaDeClientes` em `/clients?status=lead&page=2` + `state:{mensagem}` e total 0 (`:370`) | **Sim**: é o destino que `DialogoDeExclusao.tsx:47` navega, com `destino` vindo de `FichaDoCliente.tsx:69`, cuja `local.search` vem do link da tabela (`TabelaDeClientes.tsx:111`) — cadeia inteira provada | ✅ Alcançável |
| `ListaDeClientes` em `/clients?page=2` com total 20 (`:359`) | **Sim**: página 2 pelo controle da `Paginacao`, total encolhendo por exclusão | ✅ Alcançável |
| `Paginacao` com `total={45}` e `?page=9` (`:81`, `:91`) | **Sim para a página além do total** (URL digitada — edge case explícito do spec). O **composto** "página muito além do total **e** estado de exclusão" não é exatamente produzível; a versão que é (`page=3`, total 40, após excluir) exercita **o mesmo ramo e a mesma linha** (`Paginacao.tsx:34`–`:43`) | ⚠️ Alcançável no mecanismo; composto artificial — nota, não lacuna |
| **`Paginacao` com `total={0}` (`:114`)** | **Não.** `ListaDeClientes.tsx:153` devolve o estado vazio **antes** de montar a `Paginacao`. A árvore nunca produz esse par | ❌ **Inalcançável — dívida D11, confirmada** |
| `FormularioDeCliente` montado com `valoresIniciais` e `aoEnviar` por propriedade | **Sim**: `NovoCliente.test.tsx` e `EditarCliente.test.tsx` montam as telas reais, que produzem ambos | ✅ Alcançável |
| `ConfirmacaoDeSaida` dentro de um `Formulario` de mentira (`:15`–`:34`) | **Sim**: o gesto real está em `NovoCliente.test.tsx:161`/`:171` e `EditarCliente.test.tsx:255`/`:266`, nas telas verdadeiras | ✅ Alcançável |
| `TabelaDeClientes` / `CartoesDeClientes` com `clientes` por propriedade | **Sim**: `ListaDeClientes.test.tsx:133`/`:146` monta a tela, e `:312`/`:326` percorre o link até a ficha | ✅ Alcançável |
| `BarraDeBusca` / `PainelDeFiltros` montados numa rota `/clients` com query | **Sim**: é o estado da própria listagem | ✅ Alcançável |
| Estado "não encontrado" de `/clients/:id/edit` (`EditarCliente.test.tsx:99`) | **Sim** (id de outro consultor, ou registro excluído em outra aba + recarregar) — mas a **saída** oferecida nesse estado não é asserida por teste nenhum | ⚠️ Alcançável, **asserção não discriminante** — ver M27 em §6 e D12 em §11 |

**Nenhum AC** ficou marcado "coberto por partes" nesta rodada.

---

## 6. Sensor de Discriminação

**Isolamento**: `git worktree add --detach <scratch> HEAD`, com `node_modules` por link simbólico e
`.env.local` copiado. **Nenhum `git stash` em momento algum.**
Baseline de `git status --porcelain` da árvore real capturada **antes** de qualquer trabalho do
sensor: **vazia**. Baseline do scratch: **560/560 passando**.
Ao terminar: `git worktree remove --force` + `git worktree prune`; `git worktree list` mostra
**só a principal**; `git status --porcelain` **idêntico à linha de base** (`diff` vazio); `HEAD`
segue em `27b322e`.

**Escopo**: P0 / caminho crítico → profundidade máxima. **39 mutações**, incluindo a **reversão
obrigatória das sete correções das fases 8 e 9**. Cada mutação roda a suíte unitária inteira; as
duas sobreviventes foram reexecutadas contra **RLS e E2E** também.

### As reversões obrigatórias — todas morrem

| # | Arquivo:linha | Mutação (reverte) | Resultado |
| - | ------------- | ----------------- | --------- |
| M1 | `components/TabelaDeClientes.tsx:111` | **T29** — o link do cliente perde `search: filtrosDaListagem` | ✅ Morta |
| M2 | `components/CartoesDeClientes.tsx:45` | **T29** — idem no cartão | ✅ Morta |
| M3 | `pages/ListaDeClientes.tsx:89` | **T30** — remove a chamada a `useRecuoNoVazio` | ✅ Morta |
| M4 | `components/Paginacao.tsx:41` | **T31** — `{ replace: true, state: estado }` → `{ replace: true }` | ✅ Morta |
| **M5** | `pages/FichaDoCliente.tsx:145` | **T32 / L1** — `destino={paraAListagem}` → `destino="/clients"` | ✅ **Morta** (sobrevivia na rodada 2) |
| **M6** | `pages/ListaDeClientes.tsx:27` | **T33 / L2** — `temFiltros` ignora a **região** | ✅ **Morta** — `ListaDeClientes.test.tsx:221` |
| **M6b** | `pages/ListaDeClientes.tsx:26` | **T33 / L2** — `temFiltros` ignora a **origem** | ✅ **Morta** — `:233` |
| **M7** | `pages/EditarCliente.tsx:78`–`:81` | **T34 / L3** — salvar navega sem `search: local.search` | ✅ **Morta** |
| **M8** | `pages/EditarCliente.tsx:118` | **T35** — "Voltar para a ficha" perde a query string | ✅ **Morta** |
| **M9** | `pages/FichaDoCliente.tsx:101` | **T34** — o link "Editar" perde a query string | ✅ **Morta** |

### As demais 29

| # | Arquivo:linha | Mutação | Resultado |
| - | ------------- | ------- | --------- |
| M10 | `pages/ListaDeClientes.tsx:24` | `temFiltros` ignora a **busca** (controle) | ✅ Morta |
| M11 | `services/client-service.ts:97` | Off-by-one no fim do intervalo: `+ POR_PAGINA` | ✅ Morta |
| M12 | `pages/ListaDeClientes.tsx:48` | `pagina <= PADROES.page` → `pagina < PADROES.page` | ✅ Morta |
| M13 | `components/PainelDeFiltros.tsx:25` | Filtro deixa de recuar para a primeira página | ✅ Morta |
| M14 | `components/BarraDeBusca.tsx:64` | Busca deixa de recuar para a primeira página | ✅ Morta |
| M15 | `components/DialogoDeExclusao.tsx:47` | Exclusão navega sem a mensagem de confirmação | ✅ Morta |
| M16 | `services/client-service.ts:152` | Regiões devolvidas sem `.sort()` | ✅ Morta |
| M17 | `components/BarraDeBusca.tsx:12` | `ATRASO = 300` → `0` | ✅ Morta |
| M18 | `filtros.ts:106` | `escreverFiltros` nunca escreve `page` | ✅ Morta |
| M19 | `pages/ListaDeClientes.tsx:53` | O recuo do vazio não repassa o estado da navegação | ✅ Morta |
| M20 | `services/client-service.ts:80` | Filtro de **região** removido da consulta | ✅ Morta (encerra a dúvida D9) |
| M21 | `pages/FichaDoCliente.tsx:69` | `paraAListagem` com `search: ''` (atinge link **e** diálogo) | ✅ Morta |
| M22 | `components/Paginacao.tsx:34` | `pagina > paginas` → `pagina >= paginas` | ✅ Morta |
| M23 | `hooks/escrita.ts:71` | Exclusão deixa de invalidar `['clients']` | ✅ Morta — `escrita.test.ts:201` |
| M24 | `components/ui/Dialogo.tsx:75` | Remove `cancelamento.current?.focus()` | ✅ Morta |
| M25 | `services/client-service.ts:108` | Fallback de 416 devolve `total: 0` em vez da contagem | ✅ Morta |
| M26 | `pages/ListaDeClientes.tsx:22` | `temFiltros` sempre verdadeiro (carteira vazia vira "sem resultado") | ✅ Morta — 3 falhas |
| **M27** | `pages/EditarCliente.tsx:94` | O link "Voltar para a listagem" do estado **não encontrado da edição** aponta para outro lugar | ❌ **SOBREVIVEU** — 560 unitários **e** 52 RLS **e** 24 E2E passam |
| M28 | `components/CartoesDeClientes.tsx:38` | `md:hidden` → `lg:hidden` (ponto de quebra errado) | ✅ Morta (por asserção de classe — dívida D1) |
| M29 | `components/FormularioDeCliente.tsx:88` | `shouldFocusError: false` (CLNT-18 AC5) | ✅ Morta |
| M30 | `services/client-service.ts:147` | Remove `caseFirst: 'upper'` do desempate de caixa | ✅ Morta |
| M31 | `services/client-service.ts:26` | Chave da listagem deixa de depender da página | ✅ Morta |
| M32 | `hooks/leitura.ts:38` | Remove `placeholderData: keepPreviousData` | ✅ Morta |
| M33 | `filtros.ts:62` | `numero < 1` → `numero < 0` (aceita página 0) | ✅ Morta — 8 falhas |
| M34 | `services/client-service.ts:72` | Busca com dígitos perde o padrão de telefone | ✅ Morta |
| M35 | `components/DialogoDeExclusao.tsx:42` | Falha na exclusão passa a navegar mesmo assim (CLNT-17 AC6) | ✅ Morta |
| M36 | `pages/ListaDeClientes.tsx:153` | Estado vazio nunca é alcançado | ✅ Morta — 10 falhas |
| M37 | `services/client-service.ts:105` | `'PGRST103'` → `'PGRST999'`: o fallback de 416 deixa de existir | ⚠️ **Sobrevive aos 560 unitários; morta pelo gate `test`** — `tests/rls/client-service.test.ts:146` |
| M38 | `components/Paginacao.tsx:28` | `Math.ceil` → `Math.floor` na contagem de páginas | ✅ Morta — 10 falhas |

**Profundidade**: P0-full (39 injeções)
**Resultado**: **38 mortas, 1 sobreviveu** — a sobrevivente está em código que **nenhum AC
reivindica**. Ver a leitura abaixo.

### Leitura das duas mutações que não morreram no primeiro golpe

**M37 — morre, mas só na camada certa.** O fallback de `PGRST103` implementa o edge case "página
acima do total exibe a última existente". Nenhum unitário o cobre; quem o cobre é
`tests/rls/client-service.test.ts:146` — `expect(pagina.clientes).toEqual([])` e `:152` —
`expect(pagina.total).toBe(3)`, contra a pilha local, que é onde o 416 de verdade acontece. Rodando
só `--project unit`, o mutante passa; rodando o gate `test` (que é o gate real), ele morre. **Não é
lacuna**: é a camada correta para esse comportamento, e ficaria errado simulá-lo num mock. Fica
registrado para que ninguém confunda "unit verde" com "coberto".

**M27 — sobrevivente legítima, em código fora do spec.** `EditarCliente.tsx:88`–`:100` exibe um
estado "Cliente não encontrado" quando a **leitura** de `/clients/:id/edit` falha, e oferece um
único caminho de saída. Trocar o destino desse link por qualquer outro deixa **560 + 52 + 24**
passando, porque `EditarCliente.test.tsx:104` assere só a **presença** do link
(`getByRole('link', { name: 'Voltar para a listagem' })`), nunca o `href` — ao contrário da ficha,
onde `FichaDoCliente.test.tsx:200` assere `toHaveAttribute('href', '/clients')`.

Por que **não** é lacuna de AC: o CLNT-14 AC2 prende o estado de não encontrado à rota
`/clients/:id`, e ali ele está coberto com destino asserido. O edge case do spec sobre o cliente
excluído em outra aba prende o estado à ação de **salvar**, e ali também está coberto
(`EditarCliente.test.tsx:224` — `toHaveTextContent('Este cliente não existe mais')`). O estado de
não encontrado na **leitura** da rota de edição é código defensivo que o spec não pede. É a forma
espelhada do defeito desta feature: em vez de asserção verdadeira sobre estado inalcançável, um
estado alcançável com asserção que não discrimina. Vira **D12** e a tarefa de correção menor da §10.

---

## 7. Edge Cases

Os nove edge cases do `spec.md`, reconferidos com citação própria.

- [x] **Dois clientes de mesmo nome** — `TabelaDeClientes.test.tsx:176`–`:178`: dois links de mesmo nome, distinguidos por e-mail e telefone nas células
- [x] **Edição de cliente excluído em outra aba** — `EditarCliente.test.tsx:224`; **raiz real**: `tests/rls/client-service.test.ts:379` — `toMatch(/não existe mais/i)`
- [x] **Termo só com espaços é busca vazia** — `filtros.test.ts:62`; `busca.test.ts:29`, `:92`; serviço não filtra: `client-service.test.ts:147`/`:148`
- [x] **`%` e `_` literais** — `busca.test.ts:37`, `:42`, `:48` (a contrabarra é escapada primeiro, e não o escape recém-inserido). Dívida D6: sem teste de pilha real
- [x] **`*` permanece curinga** — `busca.test.ts:56` — `expect(escaparCuringas('e*f')).toBe('e*f')`; limite documentado no próprio spec
- [x] **Nome longo truncado, valor completo acessível** — `TabelaDeClientes.test.tsx:163`–`:165`: texto completo, `title` e classe `truncate`
- [x] **Página acima do total exibe a última existente** — `Paginacao.test.tsx:84`/`:85`; **serviço contra a pilha real**: `tests/rls/client-service.test.ts:151`/`:152` (é ela que mata a M37)
- [x] **Região com caixa diferente agrupa** — **pilha real**: `tests/rls/client-service.test.ts:181`; unidade: `client-service.test.ts:242`
- [x] **Renda em branco com tipo preenchido é aceita** — `schemas.test.ts:135`–`:137`

---

## 8. Lacunas de precisão do spec

Não são falhas de implementação nem de teste: são pontos em que o spec não define o desfecho com
precisão suficiente para ancorar a asserção. Registradas, não silenciadas.

**S1 — CLNT-18 AC6 (contraste 4.5:1).** O spec exige a razão mínima sem dizer entre quais pares de
texto e fundo. Nenhum teste calcula a razão; os pares são presos como par de cor
(`Botao.test.tsx`, `e2e/smoke.spec.ts`), o que detecta uma **troca** mas não valida o **novo** par.
Confirma a leitura da rodada 2.

**S2 — CLNT-17 AC5 ("navegar para a página anterior"), nova nesta rodada.** Lido ao pé da letra,
"página anterior" é a página N−1. A implementação faz duas coisas diferentes: com total > 0 recua
para a **última página existente** (`Paginacao.tsx:34`–`:43`), que coincide com N−1 no caso da
exclusão; com total 0 recua para a **primeira** (`ListaDeClientes.tsx:48`–`:54`), e o teste
`ListaDeClientes.test.tsx:390`–`:397` assere exatamente isso para `?page=3`. Com total zero nenhuma
página existe e N−1 seria tão vazia quanto, de modo que a escolha é melhor produto — mas ela é a
leitura do autor, não o desfecho do spec. O AC deveria dizer o que fazer quando o total zera.

---

## 9. Success Criteria

| Critério | Evidência | Result |
| -------- | --------- | ------ |
| Cadastro mínimo < 30s no celular | fluxo mínimo provado (`NovoCliente.test.tsx:82`; `e2e:169`–`:176`); o **tempo** não é medido | ⚠️ Parcial (D7) |
| Busca e filtros compartilháveis por URL e restaurados | `filtros.test.ts:108`; `e2e:218`–`:228` (outra aba de verdade, com 25 clientes semeados) | ✅ |
| Nenhuma das cinco condições exibe área em branco | `ListaDeClientes.test.tsx:112` (carregando), `:182` (vazio), `:204` (sem resultado), `:261` (erro), `:140` (sucesso) | ✅ |
| Listagem responde < 1s com 500 clientes | nenhum teste semeia 500 linhas nem mede latência | ❌ Não verificado (D8) |
| Fluxo inteiro operável só pelo teclado | `e2e/clients.spec.ts:371`–`:415` — cadastro, edição e exclusão por `Tab`/`Enter`/`Escape`, com foco confinado e devolvido | ✅ |

---

## 10. Fix Plans

Nenhum bloqueante. Um item menor, vindo do único mutante sobrevivente.

### Fix 1: a saída do estado "não encontrado" da edição não é asserida

- **Root cause**: `EditarCliente.test.tsx:104` assere a **presença** do link, não o destino. A M27 troca `EditarCliente.tsx:94` de `to="/clients"` para qualquer outra coisa e a suíte inteira passa. O link também é o único ponto da tela de edição que **não** carrega a query string de origem, depois de a fase 9 tê-la costurado em todos os outros (`:79`, `:118`).
- **Fix task**: estender o teste para `expect(…).toHaveAttribute('href', …)`, decidindo antes se o destino deve levar `local.search` como os demais caminhos da tela.
- **Priority**: **Minor** — nenhum AC do spec exige este estado nesta rota; o estado equivalente em `/clients/:id` está coberto com destino asserido (`FichaDoCliente.test.tsx:200`), e o caso do salvamento também (`EditarCliente.test.tsx:224`).

---

## 11. Qualidade de Código

| Princípio | Status | Nota |
| --------- | ------ | ---- |
| Código mínimo | ✅ | Nenhuma abstração além do necessário; `rotuloDeStatus` repetido de propósito, com a razão escrita no arquivo |
| Mudanças cirúrgicas | ✅ | As quatro correções da fase 9 tocam 2, 1, 3 e 2 arquivos; três delas são só teste |
| Sem escopo extra | ✅ | Nada de notas, CSV, seleção múltipla ou filtro por período |
| Segue os padrões existentes | ✅ | Tradução de erro em ponto único como `auth-service`; testes co-locados; domínio em português |
| Sem `loader`/`action` nas rotas (AD-013) | ✅ | `src/app/router.test.tsx` |
| Spec-anchored: o valor asserido é o desfecho do spec | ✅ | Verdadeiro em 18 de 18; as duas exceções são de **precisão do spec** (§8), não de asserção |
| Precondição alcançável | ✅ | Varredura completa em §5; nenhum AC coberto por partes. Uma precondição inalcançável remanescente, sem AC associado (D11) |
| Regra do payload/estado | ✅ | `owner_id`, as oito colunas, a cascata, o total filtrado e o limite da renda são asseridos por **estado relido**, não por chamada |
| Cobertura por camada | ✅ | Domínio 1:1 com os ACs; rotas e E2E cobrem feliz + borda + erro. O edge case de 416 vive na camada de RLS, que é a única onde ele acontece |
| Todo teste mapeia a um requisito | ⚠️ | Um teste órfão remanescente: `Paginacao.test.tsx:114` (`total={0}`) — **D11**, confirmada |
| Guias documentadas seguidas | ✅ | `CLAUDE.md`, `README.md`, `scripts/check-test-discovery.mjs` (passou: 50/50 e 6/6) |
| Marcador `SPEC_DEVIATION` justificado | ⚠️ | `ListaDeClientes.tsx:125`–`:129` — razão sólida (`TelaDeErro` recarrega a página e descarta o cache, o que não é "tentar de novo"), texto ainda defasado — **D10** |

---

## 12. Dívida registrada

Herdadas e reconferidas:

| # | Dívida | Situação |
| - | ------ | -------- |
| D1 | CLNT-12 AC10 provado por **classe** (`md:hidden` / `hidden md:block`), não por viewport de 375px | De pé. A M28 morre, mas por asserção de classe — detecta a troca, não valida o desfecho |
| D2 | Anel de foco não lido como estilo computado | De pé |
| D3 | Ordenação provada na chamada ao `.order()`, não em linhas reordenadas pela pilha real | De pé |
| D4 | "Somente os seus" provado por carteiras disjuntas na RLS, sem controle de terceiro consultor | De pé |
| D5 | Contraste não calculado — ver S1 | De pé |
| D6 | `%` e `_` literais sem teste de pilha real | De pé |
| D7 | "< 30s no celular" não medido | De pé |
| D8 | "< 1s com 500 clientes" não verificado | De pé — continua o candidato mais forte a tarefa de acompanhamento |
| D9 | Conjunção com região só fora da RLS | **Encerrada.** `tests/rls/client-service.test.ts:166`–`:181` cobre a conjunção e a região na pilha real; a M20 morre |
| D10 | Texto do `SPEC_DEVIATION` defasado | De pé |
| D11 | `Paginacao.test.tsx:114` monta `total={0}`, estado que a árvore não produz | **De pé e confirmada.** Única precondição inalcançável restante; sem AC associado, portanto inofensiva |

Nova:

| # | Dívida | Origem |
| - | ------ | ------ |
| **D12** | `EditarCliente.test.tsx:104` assere a presença do link de saída do estado "não encontrado" da edição, nunca o destino. Único mutante sobrevivente de 39 | M27, §6 |

---

## 13. Traceabilidade

| Requirement | Status anterior | Novo status |
| ----------- | --------------- | ----------- |
| CLNT-01 … CLNT-06 | ✅ Verified | ✅ **Verified** |
| CLNT-07 | ✅ Verified (D4) | ✅ **Verified** (D4) |
| CLNT-08 | ✅ Verified | ✅ **Verified** |
| CLNT-09 | ✅ Verified (D9) | ✅ **Verified** (D9 encerrada) |
| CLNT-10 | ✅ Verified | ✅ **Verified** |
| CLNT-11 | ✅ Verified (D3) | ✅ **Verified** (D3) |
| CLNT-12 | ✅ Verified (D1) | ✅ **Verified** (D1) |
| CLNT-13 | ❌ Needs Fix (L2) | ✅ **Verified** — AC14 fechado pelo T33; M6 e M6b morrem |
| CLNT-14 | ✅ Verified (L3 aberta) | ✅ **Verified** — AC8 fechado ponta a ponta pelo T34/T35; M7, M8, M9 morrem |
| CLNT-15 | ✅ Verified | ✅ **Verified** (dívida D12 em código fora do AC) |
| CLNT-16 | ❌ Needs Fix (L1) | ✅ **Verified** — AC3 fechado pelo T32; M5 e M21 morrem |
| CLNT-17 | ✅ Verified | ✅ **Verified** (lacuna de precisão S2 no AC5) |
| CLNT-18 | ✅ Verified (D2, D5) | ✅ **Verified** (D2, D5; lacuna de precisão S1 no AC6) |

---

## 14. UAT Interativa

Não executada por este sub-agente: é conduzida pelo orquestrador com o usuário presente. Os pontos
que mais pedem julgamento humano continuam sendo a densidade da tabela no desktop, a leitura dos
cartões no celular e o texto do diálogo de exclusão.

---

## Summary

**Overall**: ✅ **Ready**

**Spec-anchored check**: **18/18 requisitos com evidência plena**, nenhum coberto por partes ·
2 lacunas de precisão do spec (CLNT-18 AC6, CLNT-17 AC5)
**Sensor**: **39 mutações · 38 mortas · 1 sobreviveu** (M27, em código que nenhum AC reivindica)
**Gate**: lint `0` · typecheck `0` · build `0` · test `0` (560 unitários + 137 pgTAP + 52 RLS) ·
e2e `0` (24)

**O que funciona**: as duas lacunas bloqueantes da rodada 2 estão fechadas, e o fechamento é
empírico e não declarativo — a M5 (`destino={paraAListagem}` → `"/clients"`), que na rodada 2
sobreviveu a 551 unitários e 23 E2E, hoje morre pela cadeia real que o T32 escreveu; a M6 e a M6b,
que apagavam os ramos de região e origem do estado vazio, morrem pelos dois testes do T33. As sete
correções das fases 8 e 9 foram revertidas uma a uma e **todas as sete morrem**. Além disso, 29
mutações novas em lugares que nenhuma rodada anterior tocou — a chave da consulta, o
`placeholderData`, o desempate de caixa das regiões, o `Math.ceil` da paginação, o foco no primeiro
campo inválido, o caminho de recusa da exclusão, o filtro de região no serviço — foram todas
mortas. A cadeia do produto é percorrida de ponta a ponta: cadastrar com um campo, achar por nome
acentuado e por telefone com máscara, combinar filtros, compartilhar a URL e abri-la em outra aba,
editar sem perder o filtro na ida nem na volta, excluir de uma listagem filtrada com as notas indo
por cascata, tudo pelo teclado.

**O que fica**: um mutante sobrevivente, **M27**, na saída do estado "não encontrado" da rota de
edição — um estado alcançável cuja única asserção prova presença e não destino. Nenhum critério de
aceitação o reivindica, e o estado equivalente na ficha está coberto com destino asserido, por isso
ele é dívida (**D12**) e tarefa menor, não lacuna. Seguem também as dívidas D1–D8 e D10–D11, todas
herdadas e nenhuma bloqueante; **D9 pode ser encerrada**. Vale decidir explicitamente as duas
lacunas de precisão do spec (§8): o que "contraste 4.5:1" mede, e o que "página anterior" significa
quando o total zera.

**Next steps**: (1) tratar D12 como tarefa menor de acompanhamento; (2) decidir S1 e S2 no spec;
(3) UAT interativa com o usuário; (4) D8 (500 clientes em < 1s) como tarefa de acompanhamento
própria, já que nenhum dos 18 CLNT a exige.

A destilação de lições não foi executada por este verificador, por restrição explícita de não
alterar a árvore além deste arquivo. O sinal que vale a pena guardar desta rodada não é uma falha,
e sim o que fechou as anteriores: **o teste que prova uma ligação tem de partir da tela que a
produz, e não receber o valor por propriedade** — a fase 9 aplicou isso às três ligações que
faltavam, e a prova de que funcionou é que revertê-las mata a suíte. O corolário que a M27 mostra é
o outro lado da mesma moeda: **asserir que um caminho de saída existe não é asserir para onde ele
leva**.
