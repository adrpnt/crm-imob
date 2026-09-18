# Clients Validation

**Date**: 2026-09-18
**Spec**: `.specs/features/clients/spec.md`
**Diff range**: `984a4c9..HEAD` (`2a6e0c1`) — 30 commits
**Verifier**: sub-agente independente (autor ≠ verificador)

## Validation: Clients — PASS ✅

**Result**: PASS — com dívida não bloqueante registrada na seção Dívida registrada.

---

## Task Completion

Os 28 itens de `tasks.md` estão marcados `**Status**: ✅ Done` (linhas 131 a 913), com 203 critérios
"Done when" marcados `[x]` e nenhum `[ ]` pendente. Duas correções de artefato do orquestrador entram
na faixa: `3e35f95` (desenho do estado de erro da listagem) e `3456545` (contagem de campos do
formulário). Nenhuma tarefa parcial ou bloqueada.

| Fase | Tarefas | Status |
| ---- | ------- | ------ |
| 1 — Módulos puros e serviço | T1–T6 | ✅ Done |
| 2 — Cache e hooks | T7–T9 | ✅ Done |
| 3 — Componentes de interface | T10–T14 | ✅ Done |
| 4 — Formulário e telas de escrita | T15–T18 | ✅ Done |
| 5 — Listagem | T19–T24 | ✅ Done |
| 6 — Exclusão, fiação e ponta a ponta | T25–T28 | ✅ Done |

A feature **não** criou migration: a camada de banco de `clients` veio pronta da `foundation`
(tabela, dois gatilhos, grant por coluna sem `owner_id`/`created_at`/`updated_at`, quatro políticas,
coluna gerada `search_text`, índice GIN trigram, cascata de `notes`). Conferido: nenhum arquivo sob
`supabase/migrations/` aparece em `git diff --name-only 984a4c9..HEAD`.

---

## Gate Check

Os cinco gates foram rodados com o código de saída capturado diretamente
(`comando > /tmp/log 2>&1; echo $?`), nunca por pipe. Pilha local do Supabase no ar
(`npx supabase status` → DB e API respondendo; `imgproxy` e `pooler` parados, irrelevantes para a
suíte).

| Gate | Comando | Exit | Resultado |
| ---- | ------- | ---- | --------- |
| Lint | `npm run lint` | `0` | 0 avisos (`--max-warnings 0`) |
| Typecheck | `npm run typecheck` | `0` | sem erro |
| Test | `npm run test` | `0` | descoberta ok · **542 unitários** (50 arquivos) · **137 pgTAP** (9 arquivos) · **52 RLS** (6 arquivos) — 0 falhas, 0 pulados |
| E2E | `npm run test:e2e` | `0` | **22 passaram** (9,1s) |
| Build | `npm run build` | `0` | `tsc -b` + `vite build` ok (aviso de tamanho de chunk, não bloqueante) |

**Integridade da suíte** (baseline antes da feature → agora):

| Suíte | Antes | Agora | Delta |
| ----- | ----- | ----- | ----- |
| Unitários | 244 | 542 | **+298** |
| RLS | 34 | 52 | **+18** |
| E2E | 15 | 22 | **+7** |
| pgTAP | 137 | 137 | 0 (nenhuma migration nova) |

Nenhuma contagem caiu; nenhum teste foi deletado ou pulado. Asserções não foram enfraquecidas: a
verificação por amostragem em `query-client.test.ts` mostra que os testes anteriores do `queryCache`
continuam intactos (linhas 100–130) e os do `mutationCache` foram **acrescentados** (linhas 152–191).

---

## Spec-Anchored Acceptance Criteria

Percorrido a partir do `spec.md`, requisito a requisito. Cada célula coberta cita `arquivo:linha` e
reproduz a expressão da asserção. Sem `arquivo:linha` localizado = não coberto.

### CLNT-01 — Cadastrar: schema Zod e formulário reutilizável

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 — envia com nome preenchido → cria, confirma, navega para a ficha | cliente criado; confirmação exibida; rota `/clients/:id` | `src/features/clients/pages/NovoCliente.test.tsx:82` — `expect(criar).toHaveBeenCalledWith(SO_O_NOME)`; `:92` — `expect(router.state.location.pathname).toBe('/clients/c1')`; `:104` — `expect(router.state.location.state).toEqual({ mensagem: 'Cliente cadastrado.' })`; `src/features/clients/pages/FichaDoCliente.test.tsx:183` — `expect(anuncio).toHaveTextContent('Cliente cadastrado.')`; e2e `e2e/clients.spec.ts:174` — `await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}$/)` e `:176` — `toContainText('Cliente cadastrado.')` | ✅ PASS |
| AC2 — nome vazio ou < 2 caracteres → erro no campo, sem requisição | mensagem no campo; serviço não chamado | `src/features/clients/schemas.test.ts:30` — `expect(mensagemDe(analisar({ name: '' }), 'name')).toBe('O nome precisa de ao menos 2 caracteres')`; `src/features/clients/components/FormularioDeCliente.test.tsx:162` — `findByText('O nome precisa de ao menos 2 caracteres')` + `:163` — `expect(enviar).not.toHaveBeenCalled()`; `NovoCliente.test.tsx:132` — `expect(criar).not.toHaveBeenCalled()` | ✅ PASS |
| AC3 — e-mail inválido → erro no campo; e-mail vazio → aceita | erro por formato; vazio vira ausência | `schemas.test.ts:70` — `toBe('Informe um e-mail válido')`; `:66` — `expect(resultado.data?.email).toBeUndefined()`; `FormularioDeCliente.test.tsx:173` + `:174` — erro exibido e `enviar` não chamado | ✅ PASS |
| AC4 — renda negativa ou > 99.999.999,99 → erro no campo | mensagens exatas do schema | `schemas.test.ts:121` — `toBe('A renda não pode ser negativa')`; `:126` — `toBe('A renda pode ser no máximo 99.999.999,99')`; `FormularioDeCliente.test.tsx:184`/`:195` — mesmas frases na tela, `enviar` não chamado | ✅ PASS |
| AC5 — `status` entre 5 valores, `lead` pré-selecionado | lista exata; padrão `lead` | `FormularioDeCliente.test.tsx:73` — `expect([...status.options].map(o => o.value)).toEqual(['lead','contacted','qualified','client','inactive'])`; `:66` — `expect(screen.getByLabelText('Status')).toHaveValue('lead')`; `schemas.test.ts:25` — `expect(resultado.data).toEqual({ name: NOME, status: 'lead' })` | ✅ PASS |
| AC6 — `source` entre 6 valores | lista exata | `FormularioDeCliente.test.tsx:86` — `toEqual(['','indication','instagram','website','whatsapp','portal','other'])`; `schemas.test.ts:175` — mesma lista sem a vazia | ✅ PASS |
| AC7 — `income_type` entre 3 valores, permitindo branco | lista exata + opção vazia | `schemas.test.ts:183` — `expect(TIPOS_DE_RENDA.map(o => o.valor)).toEqual(['formal','informal','mixed'])`; `src/components/ui/Selecao.test.tsx:45` — `expect(vazia.value).toBe('')`; `FormularioDeCliente.test.tsx:107` — envia `income_type: 'formal'` com `income: undefined` | ✅ PASS |
| AC8 — `region` como texto com sugestões do próprio consultor | `datalist` com as regiões usadas; valor livre aceito | `FormularioDeCliente.test.tsx:120` — `expect(sugeridas).toEqual(['Barra','Zona Sul'])` + `:128` — envia `region: 'Recreio dos Bandeirantes'` (fora da lista); `src/components/ui/CampoComSugestoes.test.tsx:39` — `expect(controle).toHaveValue('Ilha do Governador')` | ✅ PASS |
| AC9 — durante o envio, botão desabilitado e segundo envio impedido | botão `disabled`, `aria-busy`, 1 chamada | `FormularioDeCliente.test.tsx:217` — `expect(botao).toBeDisabled()` + `:218` — `toHaveAttribute('aria-busy','true')`; `:231` — `expect(enviar).toHaveBeenCalledTimes(1)`; `NovoCliente.test.tsx:145` — `expect(criar).toHaveBeenCalledTimes(1)` | ✅ PASS |
| AC10 — recusa do Supabase → causa compreensível + dados preservados | frase em português; campos intactos; sem navegação | `NovoCliente.test.tsx:117` — `toHaveTextContent('Você não tem permissão para esta alteração.')`; `:121`/`:122` — `toHaveValue('Ana Prado')` e `toHaveValue('11987654321')`; `:120` — `pathname` continua `/clients/new`; tradução no ponto único: `src/features/clients/services/client-service.test.ts:444` — `expect(criacao).toEqual({ ok: false, mensagem: 'Você não tem permissão para esta alteração.' })` | ✅ PASS |
| AC11 — sair com alterações não salvas → pede confirmação | diálogo "Sair sem salvar?", navegação bloqueada | `NovoCliente.test.tsx:167` — `expect(await screen.findByRole('dialog')).toHaveAccessibleName('Sair sem salvar?')` + `:168` — `pathname` continua `/clients/new` | ✅ PASS |

### CLNT-02 — Criação com `owner_id` do usuário autenticado

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| O cliente nasce com o `owner_id` do consultor autenticado | linha persistida com `owner_id = auth.uid()` | **Estado persistido**: `tests/rls/client-service.test.ts:248` — `expect(data!.owner_id).toBe(joana.id)` (releitura pelo admin, não a chamada); payload: `src/features/clients/services/client-service.test.ts:290` — `expect(consulta.insert).toHaveBeenCalledWith({ ...OITO_COLUNAS, owner_id: 'u1' })` (igualdade profunda) | ✅ PASS |
| Sem sessão, a operação não é tentada | frase de sessão expirada, `from` não chamado | `client-service.test.ts:326` — `expect(resultado).toEqual({ ok:false, mensagem:'Sua sessão expirou. Entre de novo para continuar.' })` + `:330` — `expect(from).not.toHaveBeenCalled()` | ✅ PASS |
| A carteira de um consultor não vaza para o outro | listas disjuntas por RLS | `tests/rls/client-service.test.ts:112` — `expect(daJoana.total).toBe(3)` / `:118` — `expect(doBruno.total).toBe(1)` com os nomes asseridos; `:187–189` — `await expect(buscarCliente(clienteDaJoana)).rejects.toMatchObject({ code: 'PGRST116' })` | ✅ PASS |

### CLNT-03 — Seleções de status, origem e tipo de renda

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| Valores exatamente os dos checks do banco | 5 / 6 / 3 valores | `schemas.test.ts:168`, `:175`, `:183` — `toEqual([...])` nas três listas; `:162–166` — cada valor `analisar(...).success === true` | ✅ PASS |
| Rótulos em português | pares valor→rótulo | `schemas.test.ts:188`, `:195`, `:203` — `toEqual(['Lead','Contatado',…])` etc. | ✅ PASS |
| Valor fora do conjunto → erro no campo | mensagem por campo | `schemas.test.ts:152–156` — `toBe('Escolha um status da lista')` / `'Escolha uma origem da lista'` / `'Escolha um tipo de renda da lista'`; banco como autoridade final: `tests/rls/client-service.test.ts:436` — `toEqual({ ok:false, mensagem:'Algum valor não é aceito pelo cadastro. Revise os campos.' })` | ✅ PASS |
| A seleção mostra rótulo e emite o valor do banco | `option.textContent` ≠ `option.value` | `src/components/ui/Selecao.test.tsx:32`/`:33` — `toEqual(['Lead','Contatado','Qualificado'])` e `toEqual(['lead','contacted','qualified'])` | ✅ PASS |

### CLNT-04 — Região com sugestões do próprio consultor

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| Opções = regiões distintas do próprio consultor, alfabéticas | lista ordenada, agrupada por caixa | **Pilha real**: `tests/rls/client-service.test.ts:181` — `expect(await listarRegioes()).toEqual(['Centro','Zona Sul'])` (semeado com `Zona Sul` e `zona sul`); unitário: `client-service.test.ts:242` — `toEqual(['Barra','Centro','Zona Sul'])` | ✅ PASS |
| A lista chega ao filtro da listagem | `<select>` com as opções | `src/features/clients/components/PainelDeFiltros.test.tsx:37` — `expect(valores('Região')).toEqual(['','Barra','Centro','Zona Sul'])` | ✅ PASS |
| A lista chega ao formulário como sugestão, não como domínio fechado | `datalist` + valor livre aceito | `NovoCliente.test.tsx:157` — `expect(sugeridas).toEqual(['Barra','Zona Sul'])`; `FormularioDeCliente.test.tsx:128` — envia região fora da lista | ✅ PASS |
| Uma escrita renova a lista | chave alcançada pela invalidação | `src/features/clients/hooks/leitura.test.ts:208` — `await waitFor(() => expect(regioes).toHaveBeenCalledTimes(2))` após `invalidateQueries({ queryKey: ['clients'] })` | ✅ PASS |

### CLNT-05 — Envio duplicado e erro do Supabase

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| Segundo envio impedido durante o primeiro | 1 chamada ao serviço | `FormularioDeCliente.test.tsx:231`, `NovoCliente.test.tsx:145`, `EditarCliente.test.tsx:216` — `toHaveBeenCalledTimes(1)` | ✅ PASS |
| Erro do banco vira frase em português, num ponto único | mesma frase para o mesmo código nas três escritas | `client-service.test.ts:444–447` — `expect(atualizacao).toEqual(criacao)`, `expect(exclusao).toEqual(criacao)`, `expect(console.error).toHaveBeenCalledWith('[falha ao escrever cliente]', erro)` | ✅ PASS |
| `23514` / `42501` / `PGRST116` → frases distintas e corretas | três mensagens nomeadas | `client-service.test.ts:338` (`'Algum valor não é aceito pelo cadastro. Revise os campos.'`), `:382` (`'Você não tem permissão para esta alteração.'`), `:393` (`'Este cliente não existe mais. Ele pode ter sido excluído em outra aba.'`) | ✅ PASS |
| A escrita devolve em vez de lançar, para o formulário preservar o digitado | `ResultadoDeEscrita` com `ok:false` | `client-service.test.ts:338` — `expect(await criarCliente(DADOS)).toEqual({ ok:false, mensagem:… })` (sem `rejects`) | ✅ PASS |
| 401/403 em mutação não é tratado pela mutação | chega inteiro ao `mutationCache` | `src/features/clients/hooks/escrita.test.ts:130`/`:131` — `expect(aoFalhar).toHaveBeenCalledOnce()` e `expect(aoFalhar.mock.calls[0][0]).toBe(falha)` (AD-016) | ✅ PASS |

### CLNT-06 — Confirmação ao sair com alterações não salvas

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| Navegação interna com alterações pendentes é bloqueada | diálogo aberto, rota inalterada | `src/features/clients/components/ConfirmacaoDeSaida.test.tsx:66`/`:67` — `findByRole('dialog')` + `expect(router.state.location.pathname).toBe('/clients/new')` | ✅ PASS |
| Cancelar mantém o consultor onde está, com o formulário intacto | rota e valores preservados | `ConfirmacaoDeSaida.test.tsx:99`/`:100` — `pathname === '/clients/new'` e `expect(screen.getByLabelText('Nome')).toHaveValue('Ana Prado')` | ✅ PASS |
| Descartar prossegue para o destino bloqueado | navega ao destino | `ConfirmacaoDeSaida.test.tsx:89` — `expect(router.state.location.pathname).toBe('/clients')` | ✅ PASS |
| Depois de salvar não pergunta | sem diálogo | `ConfirmacaoDeSaida.test.tsx:133` — `expect(screen.queryByRole('dialog')).not.toBeInTheDocument()`; `NovoCliente.test.tsx:178` e `EditarCliente.test.tsx:238` idem | ✅ PASS |
| Não cobre recarregar nem fechar aba | limite declarado no spec (linha 45) | limite documentado em `ConfirmacaoDeSaida.tsx:24–29`; o spec o assume | ✅ PASS (limite do spec) |

### CLNT-07 — Consulta paginada ordenada com total

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 — `/clients` lista só os do consultor | linhas disjuntas por dono | `tests/rls/client-service.test.ts:113` — `expect(nomes(daJoana.clientes)).toEqual(['Carlos Andrade','José Gonçalves','Maria Aparecida'])` e `:119` — `toEqual(['Cliente do Bruno'])` | ✅ PASS |
| AC1 — ordenados por `created_at` decrescente | mais recentes primeiro | `client-service.test.ts:171` — `expect(padrao.order).toHaveBeenCalledWith('created_at', { ascending: false })`; efeito observado: `e2e/clients.spec.ts:179` — `await expect(linhas(page).nth(1)).toContainText('Maria do Carmo')` (recém-criado no topo) | ✅ PASS |
| AC1 — páginas de 20 | intervalo 0–19, 40–59 | `client-service.test.ts:99` — `expect(consulta.range).toHaveBeenCalledWith(0, 19)`; `:113` — `toHaveBeenCalledWith(40, 59)` para `page: 3`; aritmética observada: `Paginacao.test.tsx:33` — `expect(resumo()).toContain('página 2 de 3')` com total 45 | ✅ PASS (ver Dívida D4) |
| AC11 — exibe o total dos filtros correntes | número dos filtros, não da carteira | `tests/rls/client-service.test.ts:161` — `expect(leads.total).toBe(2)` (carteira de 3); `Paginacao.test.tsx:26` — `expect(resumo()).toContain('45 clientes')`; `e2e/clients.spec.ts:214` — `toContainText('5 clientes')` com 25 semeados | ✅ PASS |
| Um único request no caminho normal | 1 chamada a `from`, `count:'exact'` junto do `range` | `client-service.test.ts:97` — `expect(from).toHaveBeenCalledTimes(1)` + `:98` — `toHaveBeenCalledWith('*', { count: 'exact' })` | ✅ PASS |

### CLNT-08 — Busca com atraso por nome, e-mail e telefone

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC2 — aplica após 300ms sem nova digitação | nenhuma escrita antes de 300ms; uma só depois | `src/features/clients/components/BarraDeBusca.test.tsx:76` — `expect(escritas.size).toBe(0)` em `ATRASO - 1`; `:87` — `expect(escritas.size).toBe(1)` para cinco teclas | ✅ PASS |
| AC2 — correspondência parcial ignorando caixa e acentos | acha nome acentuado por termo sem acento | **Pilha real**: `tests/rls/client-service.test.ts:129` — `expect(nomes(semAcento.clientes)).toEqual(['José Gonçalves'])` buscando `'goncalves'`; `:132` — idem com `'JOSÉ'`; unitário de concordância com o banco: `src/features/clients/busca.test.ts:25` — `expect(normalizarTermo('José Gonçalves ÃÕÜÊ ação')).toBe(MEDIDO_NO_BANCO.toLowerCase())`; e2e `e2e/clients.spec.ts:250` — `toHaveCount(2)` buscando `'jose gon'` | ✅ PASS |
| AC3 — máscara de telefone removida antes de comparar | `(11) 98765` acha `11987654321` | **Pilha real**: `tests/rls/client-service.test.ts:142` — `expect(nomes(pagina.clientes)).toEqual(['José Gonçalves'])`; padrões: `busca.test.ts:81` — `expect(padroesDeBusca('(11) 98765')).toEqual(['%(11) 98765%','%1198765%'])`; consulta: `client-service.test.ts:136` — `expect(consulta.or).toHaveBeenCalledWith('search_text.ilike."%(11) 98765%",search_text.ilike."%1198765%"')`; e2e `:255` — `toHaveCount(2)` | ✅ PASS |
| Busca é um `ilike` sobre `search_text`, não um `.or()` de três colunas | índice trigram usado | `client-service.test.ts:123` — `expect(consulta.ilike).toHaveBeenCalledWith('search_text','%joana%')` + `:124` — `expect(consulta.or).not.toHaveBeenCalled()` | ✅ PASS |
| Termo vazio/só espaços não aplica filtro | nenhum `ilike`, nenhum `or` | `client-service.test.ts:147`/`:148` — ambos `not.toHaveBeenCalled()` | ✅ PASS |

### CLNT-09 — Filtros combinados por E lógico

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC4 — status, origem e região combinam com a busca por E | interseção, não união | **Estado real**: `tests/rls/client-service.test.ts:173` — `expect(combinado.total).toBe(1)` e `:174` — `toEqual(['Carlos Andrade'])` para `busca:'a' ∧ status:'lead' ∧ origem:'indication'`; consulta montada: `client-service.test.ts:160` — `expect(consulta.eq.mock.calls).toEqual([['status','lead'],['source','instagram'],['region','Zona Sul']])` | ✅ PASS |
| Região participa do E | linhas filtradas por região | **Estado observado no navegador**: `e2e/clients.spec.ts:211–215` — Status `Lead` + Região `Zona Sul` sobre 25 semeados → `toContainText('5 clientes')` e `toHaveCount(6)` | ✅ PASS |
| Os filtros combinam na URL sem se desfazerem | parâmetros coexistem | `PainelDeFiltros.test.tsx:135–137` — `search='ana'`, `status='lead'`, `region='Centro'` simultâneos; `BarraDeBusca.test.tsx:118–121` — buscar preserva `status`, `region` e `sort` | ✅ PASS |
| `owner_id` não é filtro da aplicação | a política é a fronteira | `client-service.test.ts:187` — `expect(consulta.eq.mock.calls.map(([c])=>c)).not.toContain('owner_id')` + `:188`/`:189` | ✅ PASS |

### CLNT-10 — Sincronização bidirecional com a URL (AD-015)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC6 — toda mudança reflete na query string | parâmetro escrito | `PainelDeFiltros.test.tsx:103` — `expect(router.state.location.search).toBe('?status=qualified')`; `BarraDeBusca.test.tsx:97` — `toBe('?search=zona+sul')`; `Paginacao.test.tsx:41` — `toBe('?page=2')`; `TabelaDeClientes.test.tsx:109` — `toBe('?sort=name&order=asc')` | ✅ PASS |
| AC7 — URL aberta direto restaura exatamente aquele estado | controles e consulta idênticos | `src/features/clients/pages/ListaDeClientes.test.tsx:99–107` — `expect(lista).toHaveBeenCalledWith({ busca:'ana', status:'lead', origem:'portal', regiao:'Barra', sort:'name', order:'desc', page:2 })`; `:150–152` — controles com os valores da URL; **outra aba de verdade**: `e2e/clients.spec.ts:225–228` — `toContainText('5 clientes')`, `toHaveCount(6)`, `toHaveValue('lead')`, `toHaveValue('Zona Sul')` | ✅ PASS |
| Ida e volta idempotente nos sete campos | `lerFiltros(escreverFiltros(f)) === f` | `src/features/clients/filtros.test.ts:108` — `expect(lerFiltros(escreverFiltros(filtros))).toEqual(filtros)` com todos os campos preenchidos; `:112` nos padrões | ✅ PASS |
| URL limpa continua limpa | padrões omitidos | `filtros.test.ts:69` — `expect(escreverFiltros(PADROES).toString()).toBe('')` | ✅ PASS |
| Valor inventado na URL não vira nome de coluna | cai no padrão | `filtros.test.ts:33` — `expect(lerFiltros(new URLSearchParams('sort=income')).sort).toBe('created_at')`; `:42` — `order` idem; `:49–53` — página inválida → 1 | ✅ PASS |
| Campo acompanha mudança externa da URL | valor do campo volta ao da URL | `BarraDeBusca.test.tsx:140` — `expect(campo()).toHaveValue('')` após `router.navigate('/clients')` | ✅ PASS |

### CLNT-11 — Ordenação por nome ou data

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC9 — ordenar por nome ou criação, crescente ou decrescente | `.order(coluna, {ascending})` correspondente | `client-service.test.ts:171` — `toHaveBeenCalledWith('created_at',{ascending:false})`; `:175` — `toHaveBeenCalledWith('name',{ascending:true})` | ✅ PASS (ver Dívida D3) |
| A escolha vai para a URL e alterna direção | `?sort=name&order=asc` → `?sort=name` | `TabelaDeClientes.test.tsx:109`, `:119` (alterna), `:127` (coluna de data) | ✅ PASS |
| Reordenar **não** recua a página | `page` intocado | `filtros.test.ts:89–91` (escrita) e `TabelaDeClientes.test.tsx:109` — nenhuma remoção de `page`; contraste: `PainelDeFiltros.test.tsx:124` mostra o recuo só para filtro | ✅ PASS |
| A ordem corrente é anunciada | `aria-sort` | `TabelaDeClientes.test.tsx:133` — `expect(cabecalho('Nome')).toHaveAttribute('aria-sort','ascending')`; `:139` — `'none'` na coluna que não ordena | ✅ PASS |
| Limpar filtros preserva a ordenação | só `sort` sobrevive | `PainelDeFiltros.test.tsx:148` — `expect(router.state.location.search).toBe('?sort=name')` | ✅ PASS |

### CLNT-12 — Tabela no desktop, cartões no mobile

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC10 — abaixo de 768px, cartões em vez de tabela | alternância por utilitária responsiva | `src/features/clients/components/CartoesDeClientes.test.tsx:98` — `expect(screen.getByRole('list').className).toContain('md:hidden')`; `:105`/`:106` — moldura da tabela com `hidden` e `md:block` | ⚠️ PASS com dívida D1 (asserção de classe, não de viewport) |
| A mesma lista chega às duas árvores | nenhum cliente existe só no desktop | `CartoesDeClientes.test.tsx:130`–`:136` — 3 cartões, 4 linhas de tabela, e cada nome com `toHaveLength(2)` apontando para o mesmo `href` | ✅ PASS |
| A alternância não usa `matchMedia` | zero chamadas | `CartoesDeClientes.test.tsx:118` — `expect(consulta).not.toHaveBeenCalled()` | ✅ PASS |
| Busca, filtros e ações continuam acessíveis em tela estreita | painel quebra linha, não some | `PainelDeFiltros.test.tsx:157` — `expect(painel.className).toContain('flex-wrap')` + `:158` — `not.toMatch(/(^\|\s\|:)hidden(\s\|$)/)` | ✅ PASS |

### CLNT-13 — Estados de carregamento, vazio, sem resultado e erro

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC12 — carregando exibe esqueleto | esqueleto, sem tabela | `ListaDeClientes.test.tsx:90` — `expect(screen.getByText('Carregando os clientes…')).toBeInTheDocument()` + `:91` — `queryByRole('table')` ausente | ✅ PASS |
| AC13 — carteira vazia convida ao primeiro cadastro | texto e link de cadastro | `ListaDeClientes.test.tsx:160` — `findByText('Sua carteira está vazia')` + `:161` — link `href='/clients/new'`; e2e `e2e/clients.spec.ts:354` — `toBeVisible()` após a exclusão do último | ✅ PASS |
| AC14 — filtros sem resultado: mensagem distinta + limpar filtros | "Nenhum cliente encontrado" + botão | `ListaDeClientes.test.tsx:182` + `:184` — botão `Limpar filtros` dentro do bloco; `:193` — `queryByText('Sua carteira está vazia')` ausente (distinção); `:205` — limpar devolve `search === ''` | ✅ PASS |
| AC15 — erro exibe estado próprio com tentar de novo, sem perder filtros | alerta + botão; URL e controles intactos | `ListaDeClientes.test.tsx:213` — `toHaveTextContent('Não foi possível carregar a carteira agora.')`; `:224` — `expect(router.state.location.search).toBe('?search=ana&status=lead')`; `:236`/`:237` — refetch traz a tabela de volta | ✅ PASS |
| Nenhum dos cinco estados exibe área em branco | os cinco cobertos | carregando `:86`, vazio `:156`, sem resultado `:178`, erro `:209`, sucesso `:111` | ✅ PASS |
| O esqueleto é anunciado, não só desenhado | `role="status"`, `aria-live="polite"` | `src/components/feedback/Esqueleto.test.tsx:15`/`:16` — `toHaveAttribute('aria-live','polite')` e `toHaveTextContent('Carregando…')` | ✅ PASS |

### CLNT-14 — Ficha do cliente e estado de não encontrado

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 — exibe todos os campos cadastrados | valores por termo da lista | `src/features/clients/pages/FichaDoCliente.test.tsx:85–90` — `expect(valorDe('E-mail')).toBe('joana@exemplo.com')`, `Telefone → '(11) 98765-4321'`, `Status → 'Qualificado'`, `Origem → 'Instagram'`, `Região → 'Zona Sul'`, `Tipo de renda → 'Formal'` | ✅ PASS |
| AC1 — renda formatada em BRL | `R$ 3.500,50` | `FichaDoCliente.test.tsx:98`/`:99` — `toContain('3.500,50')` e `toContain('R$')`; unidade: `src/features/clients/formato.test.ts:20` — `expect(formatarRenda(1234.5)).toBe('R$ 1.234,50')` | ✅ PASS |
| AC1 — datas de criação **e** atualização | formato brasileiro | `FichaDoCliente.test.tsx:107`/`:108` — `toBe('05/01/2026')` e `toBe('10/02/2026')`; unidade: `formato.test.ts:87` | ✅ PASS |
| AC2 — id inexistente ou de outro dono → não encontrado, sem revelar | mesmo estado nos dois casos, com volta | `FichaDoCliente.test.tsx:139` — heading `'Cliente não encontrado'`; `:141` — `queryByText('Joana Silva')` ausente; `:142` — link para `/clients`; **raiz real**: `tests/rls/client-service.test.ts:189` — leitura da linha alheia falha com `PGRST116` | ✅ PASS |
| AC8 — editar, excluir e voltar preservando filtros | três ações, query string mantida | `FichaDoCliente.test.tsx:152` — link `href='/clients/c1/edit'`; `:163` — `data-variante='destrutiva'`; `:171` — `href='/clients?status=lead&region=Zona+Sul&page=2'` | ✅ PASS |
| Campo opcional em branco é ausência, não branco | traço | `FichaDoCliente.test.tsx:125–130` — seis `toBe('—')` | ✅ PASS |
| Carregando exibe esqueleto | `role="status"` com o rótulo | `FichaDoCliente.test.tsx:74` — `toHaveTextContent(/carregando o cliente/i)` | ✅ PASS |

### CLNT-15 — Edição pré-preenchida e persistência

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC3 — mesmo formulário, pré-preenchido | sete campos + renda em reais | `src/features/clients/pages/EditarCliente.test.tsx:110–118` — `toHaveValue('Joana Silva')`, `'joana@exemplo.com'`, `'11987654321'`, `'qualified'`, `'instagram'`, `'Zona Sul'`, `'formal'`, e renda `toContain('3.500,50')` | ✅ PASS |
| AC4 — salva, confirma, reflete e volta à ficha | persistência lida de volta, confirmação, rota | **Persistência**: `tests/rls/client-service.test.ts:310–328` — releitura por `buscarCliente` com `toEqual({name:'Joana Atualizada', …, income:7500.5, income_type:'mixed'})`; rota e confirmação: `EditarCliente.test.tsx:143` — `pathname === '/clients/c1'` e `:154` — `state === { mensagem: 'Alterações salvas.' }`; reflexo na ficha e na listagem: `e2e/clients.spec.ts:274` — `expect(page.locator('dt:text-is("Status") + dd')).toHaveText('Cliente')` e `:277` — a listagem mostra `Cliente` | ✅ PASS |
| AC4 — os novos valores chegam à listagem | invalidação da chave certa | `src/features/clients/hooks/escrita.test.ts:156–159` — listagem e regiões `true`, ficha `c1` `true`, ficha `c2` `false` | ✅ PASS |
| AC5 — validação igual à do cadastro, sem requisição | mensagem no campo, serviço não chamado | `EditarCliente.test.tsx:201`/`:202` — `'O nome precisa de ao menos 2 caracteres'` e `expect(atualizar).not.toHaveBeenCalled()` | ✅ PASS |
| AC6 — carregando exibe esqueleto | `role="status"` e sem formulário | `EditarCliente.test.tsx:94`/`:95` | ✅ PASS |
| AC7 — sair com alterações pendentes pede confirmação | diálogo, rota mantida | `EditarCliente.test.tsx:226`/`:227` | ✅ PASS |
| Somente as oito colunas do grant vão no update | igualdade profunda + asserção negativa | `client-service.test.ts:354` — `expect(consulta.update).toHaveBeenCalledWith(OITO_COLUNAS)`; `:365–367` — `not.toHaveProperty('owner_id'/'created_at'/'updated_at')`; **camada de grant com controle positivo (L-001)**: `tests/rls/client-service.test.ts:343` — `expect(fora.error!.code).toBe('42501')` para `created_at`, `:349` — `expect(dentro.error).toBeNull()` para `name`, `:352`/`:353` — releitura confirma `'Passou pelo grant'` e `created_at` inalterado | ✅ PASS |

### CLNT-16 — Diálogo de confirmação nomeando o cliente

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 — diálogo nomeia o cliente, avisa irreversível e notas junto | nome + duas frases | `src/features/clients/components/DialogoDeExclusao.test.tsx:78`/`:79` — `toHaveAccessibleName('Excluir cliente?')` e `toHaveTextContent('Joana Silva')`; `:87`/`:88` — `toHaveTextContent(/irreversível/)` e `/notas dele serão removidas junto/`; e2e `e2e/clients.spec.ts:298` — `toContainText('Rita Bandeira')` | ✅ PASS |
| AC2 — ação destrutiva visualmente distinta | `data-variante='destrutiva'`, classe ≠ primária | `DialogoDeExclusao.test.tsx:95` — `toHaveAttribute('data-variante','destrutiva')`; `src/components/ui/Botao.test.tsx:121` — `expect(destrutiva.className).not.toBe(primaria.className)`; `:128` — `toHaveClass('bg-danger-fill','text-danger-ink')` | ✅ PASS |
| AC2 — cancelamento é o foco padrão | `Cancelar` focado ao abrir | `DialogoDeExclusao.test.tsx:105` — `expect(screen.getByRole('button',{name:'Cancelar'})).toHaveFocus()`; e2e `:342` — `toBeFocused()` | ✅ PASS |
| AC3 — confirmar exclui, confirma e volta com filtros | id excluído, rota + query, mensagem | `DialogoDeExclusao.test.tsx:113` — `toHaveBeenCalledWith('c1')`; `:123` — `expect(router.state.location.search).toBe('?status=lead&page=2')`; `:132` — `state === { mensagem: 'Cliente excluído.' }`; exibição: `ListaDeClientes.test.tsx:257` — `toHaveTextContent('Cliente excluído.')` | ✅ PASS |
| AC6 — falha mantém o registro e mostra a mensagem | diálogo aberto, rota inalterada | `DialogoDeExclusao.test.tsx:158` — mensagem no `role="alert"`; `:161` — diálogo ainda presente; `:162` — `pathname === '/clients/c1'` | ✅ PASS |
| AC7 — cancelar fecha sem nenhuma alteração | `aoFechar` chamado, serviço não | `DialogoDeExclusao.test.tsx:170`/`:171` — `toHaveBeenCalledTimes(1)` e `expect(excluir).not.toHaveBeenCalled()`; `FichaDoCliente.test.tsx:212`/`:213` — ficha intacta | ✅ PASS |
| AC8 — progresso indicado e segunda confirmação impedida | `Excluindo…`, `disabled`, `aria-busy`, 1 chamada | `DialogoDeExclusao.test.tsx:142`/`:143`/`:146` | ✅ PASS |

### CLNT-17 — Remoção em cascata e ajuste da paginação

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC3 — exclui o cliente **e todas as suas notas** | 0 notas e 0 clientes após a exclusão | **Estado do banco**: `tests/rls/client-service.test.ts:401` — `expect(notasRestantes).toBe(0)` e `:407` — `expect(clientesRestantes).toBe(0)`; **no navegador**: `e2e/clients.spec.ts:308` — `expect(await notasDe(request, sessao, alvo)).toEqual([])` | ✅ PASS |
| AC4 — registro sai da listagem e o total se recalcula | total menor, linha ausente | `e2e/clients.spec.ts:304` — `toContainText('2 clientes')` (era 3) e `:305` — `toHaveCount(0)` para o nome excluído; mecanismo: `hooks/escrita.test.ts:208–211` — chaves marcadas para refazer, e `:114` — nenhuma escrita à mão no cache | ✅ PASS |
| AC5 — página vazia após exclusão recua para a anterior | volta à página 1 | `ListaDeClientes.test.tsx:267` — `await waitFor(() => expect(router.state.location.search).toBe(''))` com `page=2` e total 20; `Paginacao.test.tsx:83` — `toBe('?page=3')` para `page=9` com total 45 | ✅ PASS |
| AC6 — falha mantém o registro visível | nada invalidado, nada apagado | `hooks/escrita.test.ts:225`/`:226`/`:227` — página do cache intacta e `paraRefazer(...) === false`; **pilha real**: `tests/rls/client-service.test.ts:421` — `expect(count).toBe(1)` após tentar excluir cliente alheio | ✅ PASS |
| A exclusão de linha alheia não devolve sucesso silencioso | `ok:false` | `tests/rls/client-service.test.ts:415` — `expect(resultado.ok).toBe(false)`; unitário `client-service.test.ts:416`/`:417` | ✅ PASS |

### CLNT-18 — Acessibilidade: rótulos, foco e anúncio assistivo

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 — rótulo visível em cada campo, sem depender de placeholder | rótulo presente e amarrado | `FormularioDeCliente.test.tsx:60` — `getByLabelText(rotulo)` para os oito campos; `src/components/ui/Campo.test.tsx:16` — clicar no rótulo foca o controle; `:23`/`:24` — rótulo permanece com placeholder; `PainelDeFiltros.test.tsx:52–54` | ✅ PASS |
| AC2 — foco visível em todo elemento alcançável por teclado | anel de foco desenhado | `src/styles/globals.css:103–105` — `:focus-visible { outline: 2px solid var(--color-focus) }`; token provado no navegador: `e2e/smoke.spec.ts:142` — `expect(vazios).toEqual([])` inclui `--color-focus`, e `:147` — `expect(tokens['--color-focus']).toBe(tokens['--color-rocket-500'])`; alcançabilidade: `Botao.test.tsx:152`, `Selecao.test.tsx:84`, `e2e/clients.spec.ts:311–355` | ⚠️ PASS com dívida D2 (o anel em si não é medido como estilo computado) |
| AC3 — diálogo move o foco para dentro, confina e devolve ao fechar | foco no cancelamento, tabulação presa, retorno à origem | `src/components/ui/Dialogo.test.tsx:78`/`:79` — `expect(dialogo.contains(document.activeElement)).toBe(true)` e `Cancelar` focado; `:89`/`:92` — ciclo de tabulação; `:109`–`:111` — a tela de trás nunca recebe foco; `:141` — `expect(gatilho).toHaveFocus()` após fechar; e2e `:345` — `await expect(excluir).toBeFocused()` | ✅ PASS |
| AC4 — Escape fecha sem executar a ação | diálogo some, ação não chamada | `Dialogo.test.tsx:121`/`:122` — `queryByRole('dialog')` ausente e `expect(acao).not.toHaveBeenCalled()`; `ConfirmacaoDeSaida.test.tsx:111`/`:112` — fecha sem sair da tela | ✅ PASS |
| AC5 — foco no primeiro campo inválido + erro associado | foco no `Nome`, `aria-describedby`/`aria-invalid` | `FormularioDeCliente.test.tsx:206` — `await waitFor(() => expect(screen.getByLabelText('Nome')).toHaveFocus())`; `Campo.test.tsx:33`/`:34` — `toHaveAttribute('aria-invalid','true')` e `aria-describedby === mensagem.id`; `:57` — apoio e erro na ordem de leitura; `Selecao.test.tsx:63`/`:64`; `CampoComSugestoes.test.tsx:50`/`:51` | ✅ PASS |
| AC6 — contraste mínimo 4.5:1 em todos os estados | razão ≥ 4.5:1 | pares medidos na fase Design e **presos por teste como par de cor**: `Botao.test.tsx:128` — `toHaveClass('bg-danger-fill','text-danger-ink')` (5.31:1) e `e2e/smoke.spec.ts:86`/`:87` — `toHaveCSS('background-color','rgb(255, 106, 0)')` + `toHaveCSS('color','rgb(10, 11, 12)')` (6.86:1). **Nenhum teste calcula a razão.** | ⚠️ Lacuna de precisão do spec + dívida D5 |
| AC7 — operação concluída é anunciada em região assistiva | `role="status"` com a mensagem | `ListaDeClientes.test.tsx:256`/`:257`/`:258` — `getByRole('status')` com `'Cliente excluído.'` e `data-tom='sucesso'`; `FichaDoCliente.test.tsx:182`–`:184`; `src/components/ui/Alerta.test.tsx:25`/`:26` — sucesso é `status` e não `alert`; e2e `e2e/clients.spec.ts:176`, `:273`, `:303` | ✅ PASS |

**Status**: 18/18 requisitos com evidência localizada. 1 lacuna de precisão do spec (CLNT-18 AC6) e 5
itens de dívida não bloqueante registrados abaixo.

---

## Edge Cases

Os nove edge cases do `spec.md` (linhas 171–179):

- [x] **Dois clientes de mesmo nome, distinguidos por e-mail ou telefone** — `TabelaDeClientes.test.tsx:162`–`:164`: `getAllByRole('link',{name:'Ana Prado'})` com `toHaveLength(2)` e as células de contato asseridas como `'ana.p@exemplo.com—'` e `'—(11) 98765-4321'`.
- [x] **Edição de cliente excluído em outra aba avisa ao salvar** — `EditarCliente.test.tsx:188` — `toHaveTextContent('Este cliente não existe mais')`; raiz na pilha real: `tests/rls/client-service.test.ts:379` — `expect(resultado.mensagem).toMatch(/não existe mais/i)`.
- [x] **Termo só com espaços é busca vazia** — `filtros.test.ts:62` — `expect(lerFiltros(new URLSearchParams('search=%20%20%20')).busca).toBe('')`; `busca.test.ts:92` — `expect(padroesDeBusca('    ')).toEqual([])`; `client-service.test.ts:147`/`:148` — nenhum filtro aplicado.
- [x] **`%` e `_` tratados como literais** — `busca.test.ts:37` — `expect(escaparCuringas('100%')).toBe('100\\%')`; `:42` — `toBe('a\\_b')`; `:48` — contrabarra escapada **primeiro**: `toBe('c\\\\d\\%e\\_f')`. Ver dívida D6 (o comportamento literal atravessando o PostgREST foi medido na fase Design, não está preso por teste de pilha real).
- [x] **`*` permanece curinga (limite conhecido, documentado no spec)** — `busca.test.ts:56` — `expect(escaparCuringas('e*f')).toBe('e*f')`, com o comentário que o torna alarme se o PostgREST mudar.
- [x] **Nome longo truncado sem quebrar layout, valor completo acessível** — `TabelaDeClientes.test.tsx:149`–`:151` — `toHaveTextContent(nome)` (texto inteiro no DOM), `toHaveAttribute('title', nome)` e `className` com `truncate`.
- [x] **Página acima do total exibe a última existente** — UI: `Paginacao.test.tsx:83`/`:84` — `toBe('?page=3')` e `toContain('página 3 de 3')`; serviço contra a pilha real: `tests/rls/client-service.test.ts:151`/`:152` — `expect(pagina.clientes).toEqual([])` e `expect(pagina.total).toBe(3)` (o `PGRST103` cai no caminho de contagem, sem derrubar a tela).
- [x] **Região com caixa diferente agrupa como a mesma opção** — pilha real: `tests/rls/client-service.test.ts:181` — `toEqual(['Centro','Zona Sul'])` com `Zona Sul` e `zona sul` semeados; unitário: `client-service.test.ts:242`.
- [x] **Renda em branco com tipo de renda preenchido é aceita** — `schemas.test.ts:136`/`:137` — `expect(resultado.data?.income).toBeUndefined()` e `income_type === 'formal'`; na tela: `FormularioDeCliente.test.tsx:107`.

---

## Success Criteria

| Critério | Evidência | Result |
| -------- | --------- | ------ |
| Cadastrar com o mínimo de dados leva < 30s no celular | fluxo mínimo provado (só o nome): `NovoCliente.test.tsx:82` e `e2e/clients.spec.ts:170`–`:176`. **O tempo em si não é medido.** | ⚠️ Parcial — dívida D7 |
| Qualquer combinação de busca e filtros é compartilhável por URL e restaurada | `filtros.test.ts:108` (ida e volta nos sete campos) + `e2e/clients.spec.ts:222`–`:228` (outra aba de verdade) | ✅ |
| Nenhuma das cinco condições de tela exibe área em branco | `ListaDeClientes.test.tsx:86`, `:111`, `:156`, `:178`, `:209` | ✅ |
| A listagem responde em < 1s com 500 clientes | **Nenhum teste mede latência nem semeia 500 linhas.** O desenho escolheu `ilike` sobre a coluna gerada indexada por trigram justamente por isso (`client-service.ts:65–75`, provado em `client-service.test.ts:124` como asserção negativa contra o `.or()` de três colunas), mas o critério não é verificado. | ❌ Não verificado — dívida D8 |
| Todo o fluxo de cadastro, edição e exclusão operável só pelo teclado | `e2e/clients.spec.ts:311`–`:355` — percurso completo por `Tab`/`Enter`/`Escape`, terminando em `expect(page.getByText('Sua carteira está vazia')).toBeVisible()` | ✅ |

---

## Discrimination Sensor

**Escopo**: P0 / caminho crítico (núcleo do produto, toca autorização) → profundidade máxima,
mínimo de 5 mutações. Foram injetadas **12 mutações**.

**Isolamento**: `git worktree add` em
`/private/tmp/.../scratchpad/sensor` a partir de `HEAD`, com `node_modules` e `.env.local` ligados
por link/cópia. **Nenhum `git stash`.** Baseline de `git status --porcelain` da árvore real capturada
antes (vazia); worktree removido com `git worktree remove --force` + `git worktree prune`; porcelain
depois da limpeza: **vazia, idêntica à baseline**.

| # | Arquivo:linha | Mutação | Testes rodados | Resultado |
| - | ------------- | ------- | -------------- | --------- |
| 1 | `client-service.ts:226` | Remove `owner_id: dono` do payload do insert (efeito exigido pelo `with check` da política) | `client-service.test.ts` e `tests/rls/client-service.test.ts` | ✅ **Morta** — 2 falhas unitárias, 8 falhas de RLS |
| 2 | `client-service.ts:197` | Acrescenta `owner_id` a `colunasEditaveis` (coluna fora do grant de update, AD-014 / L-001) | `client-service.test.ts` | ✅ **Morta** — 1 falha, pela asserção **negativa** `not.toHaveProperty('owner_id')` (`:365`). Registro: a igualdade profunda sozinha **não** a mataria, porque o Vitest ignora chave com valor `undefined` — a asserção negativa que a L-001 motivou é o que discrimina aqui |
| 3 | `busca.ts:43` | Inverte a ordem do escape: `%` e `_` antes da contrabarra | `busca.test.ts` | ✅ **Morta** — 4 falhas |
| 4 | `filtros.ts:62` | Off-by-one no piso da página: `numero < 1` → `numero < 0` | `filtros.test.ts` | ✅ **Morta** — 3 falhas |
| 5 | `client-service.ts:80` | Remove o filtro de região da consulta (quebra o E lógico do CLNT-09) | `client-service.test.ts` e `tests/rls/client-service.test.ts` | ✅ **Morta** pelo unitário (1 falha). **Sobreviveu à suíte de RLS** (18/18 passaram): o teste de conjunção da pilha real usa busca+status+origem, sem região. O e2e cobre o efeito (`e2e/clients.spec.ts:211`–`:215`), mas ele não foi alvo desta rodada — ver dívida D9 |
| 6 | `Paginacao.tsx:33` | `pagina > paginas` → `pagina >= paginas` | `Paginacao.test.tsx` | ⚪ **Mutante equivalente** — 10/10 passaram. Com `>=`, a condição só dispara a mais quando `pagina === paginas`, e então reescreve a URL com o **mesmo** valor: nenhuma mudança observável. Não conta como lacuna; substituída por 6a |
| 6a | `Paginacao.tsx:35` | Recua para a **primeira** página em vez da última existente (`page: paginas` → `page: 1`) | `Paginacao.test.tsx` | ✅ **Morta** — 1 falha |
| 7 | `BarraDeBusca.tsx:64` | Remove `page: PADROES.page` ao aplicar a busca (CLNT-08 AC8) | `BarraDeBusca.test.tsx` | ✅ **Morta** — 1 falha |
| 8 | `BarraDeBusca.tsx:12` | `ATRASO = 300` → `0` (elimina o atraso do CLNT-08 AC2) | `BarraDeBusca.test.tsx` | ✅ **Morta** — 1 falha |
| 9 | `client-service.ts:178` | Desvia o `case 'PGRST116'` (perde "este cliente não existe mais") | `client-service.test.ts` e `tests/rls/client-service.test.ts` | ✅ **Morta** — 2 falhas unitárias, 1 de RLS |
| 10 | `Dialogo.tsx:79` | Remove a devolução do foco à origem ao fechar (CLNT-18 AC3) | `Dialogo.test.tsx` e `DialogoDeExclusao.test.tsx` | ✅ **Morta** — 1 falha |
| 11 | `hooks/escrita.ts:30` | Remove o guarda `if (!resultado.ok) return` de `refazer` (invalida mesmo com escrita recusada, CLNT-17 AC6) | `hooks/escrita.test.ts` | ✅ **Morta** — 1 falha |
| 12 | `client-service.ts:259` | `.single()` → `.maybeSingle()` na exclusão: apagar linha alheia passaria a devolver sucesso silencioso | `tests/rls/client-service.test.ts` | ✅ **Morta** — 1 falha ("não apaga nada ao tentar excluir o cliente de outro consultor") |

**Sensor depth**: P0-full (12 injeções, incluindo autorização, grant por coluna, cascata e busca)
**Result**: **11/11 mutações não equivalentes mortas**, 1 equivalente identificada e substituída — ✅

---

## Code Quality

| Princípio | Status | Nota |
| --------- | ------ | ---- |
| Código mínimo | ✅ | Nenhuma abstração além do necessário. `rotuloDeStatus` é deliberadamente repetido em `TabelaDeClientes.tsx:16` e `CartoesDeClientes.tsx:16`, com o motivo escrito (exportar função de um arquivo de componentes quebra o recarregamento rápido do Vite) |
| Mudanças cirúrgicas | ✅ | 30 arquivos de produção e teste; os quatro arquivos fora de `features/clients` mudados (`Botao`, `Dialogo`, `Selecao`, `CampoComSugestoes`, `Esqueleto`, `query-client`, `router`) são exigidos por requisitos nomeados |
| Sem escopo extra | ✅ | Nada de notas, CSV, seleção múltipla ou filtro por período — os itens do Out of Scope. A ficha reserva o lugar das notas com um parágrafo, sem lógica (`FichaDoCliente.tsx:124`–`:129`) |
| Segue os padrões existentes | ✅ | Serviço com tradução de erro em ponto único como `auth-service`; chaves de consulta exportadas do serviço como `CHAVE_DO_PERFIL`; testes co-locados; domínio em português, termos de schema em inglês |
| Sem `loader`/`action` nas rotas (AD-013) | ✅ | Asserido em `src/app/router.test.tsx:103` — `expect(comCarregamento).toEqual([])` |
| Spec-anchored: o valor asserido é o desfecho do spec | ✅ | Verificado requisito a requisito acima; a única exceção marcada é CLNT-18 AC6, onde o spec dá um número que nenhum teste calcula |
| Regra do payload/conjunção | ✅ | Os campos persistidos críticos são asseridos por **estado**, não por chamada: `owner_id` (`rls:248`), as oito colunas do update (`rls:310–328`), a cascata de notas (`rls:401`), o total filtrado (`rls:161`), as regiões agrupadas (`rls:181`) |
| Coverage Expectation por camada | ✅ | Módulos puros, schema, serviço (unit + pilha real), hooks, cliente de cache, componentes, telas, rotas e e2e — todas as linhas da matriz de `tasks.md:20–32` têm arquivo correspondente |
| Todo teste mapeia a um requisito, edge case ou "Done when" | ✅ | Amostragem em `filtros.test.ts`, `DialogoDeExclusao.test.tsx` e `client-service.test.ts`: cada bloco traz o requisito no comentário. Nenhum teste órfão encontrado |
| Guias documentadas seguidas | ✅ | `CLAUDE.md` (rodar `test:db` e `test:rls` juntos ao mexer em política — aqui não houve migration, e ambos rodaram mesmo assim via `npm run test`), `README.md`, `scripts/check-test-discovery.mjs` (passou) |
| Marcador `SPEC_DEVIATION` justificado | ⚠️ | `ListaDeClientes.tsx:96`–`:100` — a razão é sólida e foi medida em T24, mas o texto ("o desenho previa `TelaDeErro`") ficou **defasado**: `3e35f95` já corrigiu `design.md:298` e `:129`. Ver dívida D10 |

---

## Dívida registrada (não bloqueante)

Nenhum dos itens abaixo deixa um requisito do spec sem comportamento verificável — por isso nenhum
bloqueia. Cada um traz a razão explícita.

| # | Item | Por que não bloqueia |
| - | ---- | ------------------- |
| D1 | **CLNT-12 AC10 é asserido por classe, não por viewport.** `CartoesDeClientes.test.tsx:98`/`:105` conferem `md:hidden` e `hidden md:block` no `className`; nenhum teste renderiza a listagem a 375px e observa cartões visíveis com tabela oculta. | O mecanismo (a utilitária) está preso por teste, e o pipeline do Tailwind que a faz valer já é provado por estilo **computado** em `e2e/smoke.spec.ts:86`. A regressão realista — trocar a utilitária ou usar `matchMedia` — é detectada (`:118`). |
| D2 | **CLNT-18 AC2: o anel de foco não é medido como estilo computado.** A regra existe (`globals.css:103`) e o token é provado no navegador (`smoke.spec.ts:142`, `:147`), mas nenhum teste aciona `:focus-visible` e lê `outline`. | Token e regra estão cobertos nas pontas, e a alcançabilidade por teclado é provada de fato (`e2e/clients.spec.ts:311`–`:355`). O que falta é a ponte entre os dois, não o comportamento. |
| D3 | **CLNT-11: nenhum teste observa um conjunto de resultados efetivamente ordenado.** A cobertura é o parâmetro (`client-service.test.ts:171`/`:175`) e a URL (`TabelaDeClientes.test.tsx:109`). O teste de RLS ordena os nomes ele mesmo (`rls:52`) justamente para **não** depender da ordem. | O padrão decrescente por criação é observado de fato no e2e (`clients.spec.ts:179`), e `lerFiltros` restringe a coluna ao conjunto conhecido (`filtros.test.ts:33`). O que não é observado é `sort=name` chegando ordenado do banco. |
| D4 | **Página de 20 é coberta por cálculo, não por contagem observada.** `range(0,19)`/`range(40,59)` + `Paginacao` com 45 → 3 páginas. Nenhum teste lista 25 linhas e conta 20 na primeira página — o e2e que semeia 25 filtra antes de olhar. | O tamanho da página é constante única (`POR_PAGINA`, `client-service.ts:12`) consumida pelos dois lados, e o intervalo é asserido por valor. |
| D5 | **CLNT-18 AC6: nenhum teste calcula a razão de contraste.** Os pares medidos estão presos (`Botao.test.tsx:128`, `smoke.spec.ts:86`/`:87`), as razões vivem em comentário (`Botao.tsx:15`, `:20`). | Trocar a cor derruba os testes que prendem o par; o que não existe é a verificação de que o par **novo** satisfaria 4.5:1. É também lacuna de precisão do spec: o critério cita um número sem dizer quais pares. |
| D6 | **O `%`/`_` literal não tem teste de pilha real.** O escape é asserido como valor (`busca.test.ts:37`, `:42`), e o comentário diz que o comportamento através do PostgREST foi medido na fase Design — mas a medição não virou teste. | A concordância cliente↔banco mais frágil (o `unaccent`) **tem** teste de pilha real (`rls:129`), e o escape é lógica pura sem dependência de estado. |
| D7 | **Success Criterion "cadastro em menos de 30s no celular" não é cronometrado.** | O que o critério exige de fato — um único campo obrigatório — está provado (`NovoCliente.test.tsx:82`). Tempo de digitação humana não é mensurável em CI. |
| D8 | **Success Criterion "listagem responde em menos de 1s com 500 clientes" não é verificado.** Nenhum teste semeia 500 linhas nem mede latência. | É critério de sucesso, não requisito: nenhum dos 18 CLNT o exige. A decisão de desenho que o sustenta (um `ilike` sobre a coluna gerada indexada, em vez de `.or()` de três colunas) **está** presa por asserção negativa (`client-service.test.ts:124`). É o candidato mais forte a virar tarefa futura. |
| D9 | **A conjunção com região só é provada fora da camada de RLS.** A mutação 5 sobreviveu à suíte de RLS: o teste de E lógico da pilha real (`rls:166`–`:175`) usa busca+status+origem. | O e2e cobre o efeito com dado real e navegador (`clients.spec.ts:211`–`:215`: 25 semeados, 5 depois de Status+Região), e o unitário prende a chamada exata (`client-service.test.ts:160`). A cadeia inteira é percorrida — só não pela suíte de RLS. |
| D10 | **O marcador `SPEC_DEVIATION` em `ListaDeClientes.tsx:96` está defasado.** Diz que "o desenho previa `TelaDeErro`"; `design.md:129` e `:298` já registram a decisão medida desde `3e35f95`. | É comentário, não comportamento. Corrigir é uma linha; deixar como está confunde quem lê o código depois. |

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| CLNT-01 | Pending | ✅ Verified |
| CLNT-02 | Pending | ✅ Verified |
| CLNT-03 | Pending | ✅ Verified |
| CLNT-04 | Pending | ✅ Verified |
| CLNT-05 | Pending | ✅ Verified |
| CLNT-06 | Pending | ✅ Verified |
| CLNT-07 | Pending | ✅ Verified (dívida D4) |
| CLNT-08 | Pending | ✅ Verified |
| CLNT-09 | Pending | ✅ Verified (dívida D9) |
| CLNT-10 | Pending | ✅ Verified |
| CLNT-11 | Pending | ✅ Verified (dívida D3) |
| CLNT-12 | Pending | ✅ Verified (dívida D1) |
| CLNT-13 | Pending | ✅ Verified |
| CLNT-14 | Pending | ✅ Verified |
| CLNT-15 | Pending | ✅ Verified |
| CLNT-16 | Pending | ✅ Verified |
| CLNT-17 | Pending | ✅ Verified |
| CLNT-18 | Pending | ✅ Verified (dívidas D2 e D5; lacuna de precisão do spec no AC6) |

---

## Interactive UAT

Não executada por este sub-agente: a UAT interativa é conduzida pelo orquestrador com o usuário
presente. A feature é fortemente voltada ao usuário e a merece — os pontos que mais pedem julgamento
humano são a densidade da tabela no desktop, a leitura dos cartões no celular e o texto do diálogo de
exclusão.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 18/18 requisitos com evidência `arquivo:linha` localizada e desfecho
conferido contra o spec · 1 lacuna de precisão do spec (CLNT-18 AC6: exige 4.5:1 sem dizer quais
pares, e nenhum teste calcula a razão)
**Sensor**: 12 mutações injetadas · 11/11 não equivalentes **mortas** · 1 equivalente identificada e
substituída por variante não equivalente, também morta
**Gate**: lint 0 · typecheck 0 · test 0 (542 unitários + 137 pgTAP + 52 RLS) · e2e 0 (22) · build 0

**O que funciona**: a cadeia inteira do produto é percorrida por teste de ponta a ponta — cadastrar
com um campo, achar por nome acentuado e por telefone com máscara, combinar filtros, compartilhar a
URL e abri-la em outra aba, editar, excluir com as notas indo por cascata, tudo pelo teclado. As
duas camadas de autorização do AD-014 são verificadas separadamente e com controle positivo (L-001):
`42501` para a coluna fora do grant **e** sucesso para a de dentro, com releitura confirmando que
`created_at` não mudou. A decisão AD-016 é asserida no objeto construído
(`queryClient.getMutationCache().config.onError`), e não na função isolada — a forma exata da dívida
D3 da feature `auth`.

**Problemas encontrados**: nenhum bloqueante. Dez itens de dívida (D1–D10), dos quais os dois mais
substantivos são **D8** (o critério de resposta em menos de 1s com 500 clientes nunca é medido) e
**D9** (a conjunção com região não aparece na suíte de RLS, embora o e2e a cubra).

**Next steps**: (1) o orquestrador conduz a UAT interativa; (2) avaliar D8 e D9 como tarefas de
acompanhamento; (3) D10 é uma linha de comentário e pode acompanhar qualquer correção futura.
A destilação de lições (`scripts/lessons.py`) **não** foi executada por este verificador, por
restrição explícita de não alterar a árvore além deste arquivo — fica com o orquestrador, tendo como
sinal o mutante equivalente da linha 6, a lacuna de precisão do CLNT-18 AC6 e a dívida D9.
