# Auth Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/auth/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Inferida do repositório, e não mais de padrões fortes. **Guias encontrados**: `README.md` (seção de testes, com a regra de rodar `test:db` e `test:rls` juntos ao mexer em política), `vitest.config.ts` (dois projetos, ambientes distintos), `package.json` (o script `test` encadeia descoberta, unitários, banco e RLS), `scripts/check-test-discovery.mjs` (impede que um arquivo de teste deixe de ser executado). Vinte e um arquivos de teste existentes serviram de amostra de estilo e localização, e valem como piso: nenhuma camada recebe teste menos completo do que a equivalente na `foundation`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Schemas Zod | unit | Toda regra do schema tem um caso que passa e um que falha, com a mensagem por campo asserida | `src/features/**/schemas.test.ts` | `npm run test:unit` |
| Serviços de feature | unit | Caminho de sucesso mais cada erro traduzido; a tradução é asserida pelo texto, não pela chamada | `src/features/**/services/*.test.ts` | `npm run test:unit` |
| Provedor e guardas | unit | Cada estado e cada transição do diagrama do design; a guarda cobre os três estados, incluindo o de carregamento | `src/features/**/*.test.tsx` | `npm run test:unit` |
| Componentes de interface | unit | Renderização, cada estado declarado, interação por teclado e a associação de rótulo e erro | `src/components/ui/*.test.tsx` | `npm run test:unit` |
| Telas | unit | Validação por campo, envio, prevenção de duplo envio, cada caminho de erro do design | `src/features/**/pages/*.test.tsx` | `npm run test:unit` |
| Configuração do Supabase Auth | integration | Verificada pelo comportamento contra a pilha local, nunca lendo o arquivo de configuração | `tests/rls/*.test.ts` | `npm run test:rls` |
| Fluxo ponta a ponta | e2e | O trecho de autenticação do roteiro do PLAN §13, incluindo o link de recuperação real lido do servidor de e-mail local | `e2e/*.spec.ts` | `npm run test:e2e` |
| Fiação de rotas | unit | A árvore real tem as rotas sob a guarda correta | `src/app/router.test.tsx` | `npm run test:unit` |

**Lições da `foundation` aplicadas a esta matriz.** Configuração é verificada por comportamento, e não lendo o arquivo: ler `config.toml` provaria que o texto mudou, não que o Supabase passou a se comportar assim. E toda asserção sobre estrutura — rota sob a guarda certa, campo associado ao erro — é feita sobre a árvore real exportada, não sobre uma montada no teste.

## Gate Check Commands

> Extraídas do `package.json` do projeto.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tarefas com testes unitários apenas | `npm run lint && npm run typecheck && npm run test:unit` |
| Full | Tarefas que tocam Supabase, rotas ou fluxo | `npm run lint && npm run typecheck && npm run test && npm run test:e2e` |
| Build | Tarefas de configuração ou fiação | `npm run lint && npm run typecheck && npm run build && npm run test:unit` |

`npm run test` já encadeia a verificação de descoberta, os unitários, o pgTAP e a suíte de RLS. Ele falha se um arquivo de teste deixar de ser executado.

---

## Execution Plan

### Phase 1: Base de autenticação

Sem interface. Tudo que as telas vão consumir.

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Guardas e componentes de interface

```
T6 → T7 → T8 → T9 → T10
```

### Phase 3: Telas

```
T11 → T12 → T13 → T14 → T15 → T16
```

### Phase 4: Integração

```
T17 → T18
```

### Phase 5: Correções pós-verificação

Fase inserida após o Verifier independente reprovar a feature.

```
T19 → T20 → T21
```

---

## Task Breakdown

### Phase 1: Base de autenticação

#### T1: Corrigir a configuração do Supabase Auth

**What**: `site_url` apontando para a porta do Vite e mínimo de senha em 8, com verificação por comportamento.
**Where**: `supabase/config.toml`
**Depends on**: None
**Reuses**: harness de `tests/rls/helpers.ts`
**Requirement**: AUTH-01

**Tools**:
- MCP: NONE
- Skill: `supabase`

**Pendência herdada de `foundation` T6**, deixada lá por disciplina de escopo.

**Done when**:
- [x] `site_url` aponta para `http://localhost:5173`
- [x] A lista de redirecionamentos permitidos inclui o endereço local de desenvolvimento
- [x] `minimum_password_length` é 8, conforme a premissa do spec
- [x] Teste verifica o comportamento: cadastro com senha de 7 caracteres é recusado, com 8 é aceito
- [x] Contagem de testes: 3 testes passam (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test`

**Tests**: integration
**Gate**: full
**Status**: ✅ Done

> **Terceiro teste acrescentado**: que o cadastro devolve sessão imediatamente, sem confirmação de e-mail. É a verificação comportamental do AD-007, que até agora só existia como linha no `config.toml`. Se alguém ligar a confirmação, este teste é o alarme.
>
> **A mudança só vale após reiniciar a pilha.** `supabase stop` seguido de `start` é obrigatório; alterar o arquivo e rodar o teste sem reiniciar dá falso verde. Isso reforça por que o teste verifica comportamento e não o conteúdo do arquivo — a diferença entre os dois é exatamente esta janela.
>
> **`site_url` verificado pelo servidor de e-mail local**: solicitei uma recuperação e li a mensagem no Mailpit. O link aponta para `localhost:5173` e não contém a porta 3000 antiga. A verificação foi manual aqui; T18 a transforma em teste de regressão permanente.
>
> **Mutação detectada**: devolver `minimum_password_length` a 6 derruba o teste da senha curta.
**Commit**: `fix(auth): corrige site_url e mínimo de senha`

---

#### T2: Schemas de validação

**What**: Os cinco schemas Zod das entradas de formulário, com as mensagens em português.
**Where**: `src/features/auth/schemas.ts`
**Depends on**: T1
**Reuses**: Zod já instalado
**Requirement**: AUTH-01, AUTH-08, AUTH-14

**Tools**:
- MCP: `context7` (refinamento com caminho no Zod 4)
- Skill: NONE

**Done when**:
- [x] `schemaDeLogin`, `schemaDeCadastro`, `schemaDeRecuperacao`, `schemaDeNovaSenha` e `schemaDePerfil` existem, com tipos inferidos exportados
- [x] Senha exige 8 caracteres; confirmação divergente reporta no campo de confirmação, não no de senha
- [x] E-mail é aparado e convertido para minúsculas antes de validar
- [x] Nome completo é obrigatório e limitado a 120 caracteres, casando com a constraint de `profiles`
- [x] Cada regra tem um caso que passa e um que falha, com a mensagem asserida
- [x] Contagem de testes: 21 testes passam (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done

> **Uma justificativa minha foi refutada por medição, dentro da própria tarefa.** Escrevi que o parâmetro `when` do refinamento existia porque, sem ele, um erro em campo não relacionado impediria a checagem de senhas de rodar — que é o que a documentação do Zod descreve. A sonda de mutação mostrou que remover o `when` não quebrava teste algum, então medi os três cenários diretamente:
>
> | Cenário | sem `when` | com `when` |
> | --- | --- | --- |
> | erro de validação em outro campo | `nome, confirmacao` | idêntico |
> | erro de **tipo** em outro campo | só `nome` | `nome, confirmacao` |
> | senha curta **e** divergente | `senha, confirmacao` | só `senha` |
>
> A documentação fala do segundo caso, que **não ocorre neste app**: o React Hook Form sempre entrega strings. O efeito real aqui é o terceiro — suprimir o ruído de "confirmação não confere" enquanto a própria senha é inválida. Comentário corrigido para o efeito medido, e o teste que não discriminava foi substituído por um que mede exatamente esse caso.
>
> **Cinco mutações, cinco detecções** após a correção: remover o `when`, mover o `path` para o campo de senha, remover a normalização do e-mail, baixar o mínimo para 6 e remover a redução do telefone a dígitos.
>
> **Senha no login não tem mínimo**, de propósito: exigi-lo rejeitaria senha legítima anterior à regra e informaria a política de senha a quem ainda não tem conta.
**Commit**: `feat(auth): adiciona schemas de validação`

---

#### T3: Serviço de autenticação e tradução de erros

**What**: Envelopes das chamadas do Supabase Auth e o ponto único de tradução de erro.
**Where**: `src/features/auth/services/auth-service.ts`
**Depends on**: T2
**Reuses**: cliente `supabase` da `foundation`
**Requirement**: AUTH-02, AUTH-03, AUTH-04, AUTH-06, AUTH-07

**Tools**:
- MCP: `context7` (formato de erro do supabase-js)
- Skill: `supabase`

**Done when**:
- [x] `entrar`, `cadastrar`, `sair`, `pedirRecuperacao` e `redefinirSenha` envolvem as chamadas correspondentes
- [x] `cadastrar` envia `full_name` em `user_metadata`, que é de onde o trigger o lê (AD-005)
- [x] `traduzirErro` devolve a mesma frase para credencial inválida e e-mail inexistente
- [x] Falha de rede e limite de requisições têm frases distintas de credencial inválida
- [x] O erro original é registrado no console antes de a frase genérica ser devolvida
- [x] Contagem de testes: 21 unitários mais 3 contra a pilha real (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test` (elevado — ver nota)

**Tests**: unit + integration (elevado — ver nota)
**Gate**: full
**Status**: ✅ Done

> **Formatos de erro obtidos por provocação, não por suposição.** Provoquei cada falha contra a pilha local antes de escrever o mapeamento: credencial inválida e e-mail inexistente devolvem ambos `invalid_credentials` com status 400; e-mail repetido, `user_already_exists` 422; senha curta, `weak_password` 422. A discrição que o spec exige já vem do provedor, e o trabalho desta camada é não desfazê-la.
>
> **Camada de teste elevada de `unit` para `unit + integration`, com demonstração.** Os 21 testes unitários substituem o cliente por mock, o que os torna cegos à forma da API. Provei: troquei a chave dos metadados de `full_name` para `fullName` **no serviço e no teste unitário ao mesmo tempo**, mantendo-os consistentes entre si. Os 86 testes unitários passaram; só o teste contra a pilha real caiu, porque só ele conhece o outro lado do contrato — o trigger que lê `full_name`. É a mesma classe de lacuna que o Verifier apontou na `foundation` sobre o truncamento de `error_logs`, e aqui ela foi fechada na origem em vez de esperar a verificação.
>
> **Cinco mutações unitárias, cinco detecções**: revelar senha incorreta, remover a detecção de rede, remover o registro em console, revelar a recusa da recuperação, e remover o nome dos metadados.
>
> **Falha de processo registrada.** Commitei esta tarefa com o `typecheck` reprovando. Rodei os gates em laço, li a saída, e commitei na mesma invocação sem parar diante do `exit=2` — que é exatamente o que a regra do fluxo proíbe. É a segunda vez; a primeira foi em T28 da `foundation`. A causa raiz do erro de tipo: `tests/**/*.ts` estava no projeto **node** do TypeScript, que usa resolução `nodenext`, e o novo teste importa de `src/`, onde os imports relativos não têm extensão. Corrigido com um `tsconfig.tests.json` próprio, de resolução `bundler` — forçar extensões no código de produção por causa da configuração de teste seria a cauda balançando o cachorro. O gate inteiro foi reexecutado e passa.
**Commit**: `feat(auth): adiciona serviço de autenticação`

---

#### T4: Provedor de sessão

**What**: `AuthProvider` traduzindo o fluxo de eventos em estado, mais o hook de acesso.
**Where**: `src/features/auth/AuthProvider.tsx`
**Depends on**: T3
**Reuses**: `queryClient`, ponto de encaixe deixado em `app/providers.tsx`
**Requirement**: AUTH-05, AUTH-06, AUTH-08, AUTH-12

**Tools**:
- MCP: `context7` (eventos de `onAuthStateChange`)
- Skill: `supabase`

**Done when**:
- [x] O estado é a união discriminada do design, e o compilador recusa ler a sessão em `carregando`
- [x] O estado sai de `carregando` em `INITIAL_SESSION`, com e sem sessão
- [x] `PASSWORD_RECOVERY` marca `emRecuperacao`; a marca cai ao redefinir a senha ou ao sair
- [x] `SIGNED_OUT` limpa o cache do TanStack Query
- [x] O callback de `onAuthStateChange` é síncrono — teste falha se virar assíncrono
- [x] A assinatura é cancelada ao desmontar
- [x] Limite de tempo resolve para `anonimo` se `INITIAL_SESSION` não chegar
- [x] Contagem de testes: 12 testes passam (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done

> **Uma redundância encontrada pela sonda e removida.** O limite de tempo tinha duas defesas contra sobrescrever um estado já resolvido: `clearTimeout` no topo do callback, e uma guarda sobre o estado atual dentro do próprio limite. Remover a guarda não quebrou teste algum — porque, com o cancelamento presente, ela nunca é alcançada. Era código morto que dava a impressão de proteção. Removida; agora o único mecanismo é testado e remover *ele* derruba a suíte.
>
> **A marca de recuperação sobrevive à renovação de token, de propósito.** Durante a redefinição o token pode ser renovado; perder a marca ali expulsaria o consultor da própria tela de redefinir senha. `USER_UPDATED` é o que a derruba, e é o evento que o Supabase emite quando `updateUser` conclui — a queda é automática, sem a tela precisar avisar o provedor.
>
> **Seis mutações, seis detecções** após a simplificação: callback assíncrono, remoção do cancelamento do limite, `PASSWORD_RECOVERY` ignorado, marca perdida na renovação, cache não limpo, e assinatura não cancelada.
>
> **Três arquivos em vez de um**: o contexto e o tipo de estado saíram do módulo do componente porque o Fast Refresh do Vite exige que um módulo de componente exporte apenas componentes.
**Commit**: `feat(auth): adiciona provedor de sessão`

---

#### T5: Detecção de sessão expirada nas consultas

**What**: `ehSessaoExpirada` separada de `ehErroDeAutorizacao`, ligada ao `QueryCache`.
**Where**: `src/lib/query-client.ts`
**Depends on**: T4
**Reuses**: `ehErroDeAutorizacao` da `foundation`
**Requirement**: AUTH-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `ehSessaoExpirada` reconhece 401 e 403, e **não** reconhece `42501`
- [x] `ehErroDeAutorizacao` segue reconhecendo os três, porque repetir a tentativa e encerrar a sessão são decisões diferentes
- [x] `QueryCache.onError` dispara a expiração apenas para os status HTTP
- [x] Um erro `42501` não encerra a sessão — teste explícito
- [x] Contagem de testes: 12 acrescentados, 110 unitários no total (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done — encerra a Fase 1

> **Um sinalizador de expiração, não um sistema de notificações.** A guarda de rota não distingue um visitante que nunca entrou de um consultor desconectado no meio do trabalho: os dois chegam ao login sem sessão. `marcarSessaoExpirada` e `consumirSessaoExpirada` resolvem isso com leitura destrutiva, para que a mensagem apareça uma vez e não reapareça ao recarregar. A tela de login consome o sinal em T11.
>
> **Terceiro artefato de sonda desta sessão, e o mais instrutivo.** A mutação principal — fazer `ehSessaoExpirada` aceitar `42501` — apareceu como sobrevivente. Não era: `ehErroDeAutorizacao` contém uma linha idêntica e vem antes no arquivo, então a substituição por texto atingiu a função errada, onde a checagem de `42501` já existe e portanto nada mudava. Refeita mirando o bloco inteiro da função, a mutação derruba três testes. A lição operacional é que substituição por linha isolada não serve para sondar arquivo com funções parecidas; o alvo precisa ser o bloco.
>
> **Cinco mutações, cinco detecções** após a correção da sonda.
**Commit**: `feat(auth): distingue sessão expirada de permissão negada`

---

### Phase 2: Guardas e componentes de interface

#### T6: Componente de campo de formulário

**What**: Rótulo visível, controle, mensagem de erro e a associação acessível entre eles.
**Where**: `src/components/ui/Campo.tsx`
**Depends on**: T5
**Reuses**: tokens de tema da `foundation`
**Requirement**: AUTH-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Rótulo visível sempre; texto de exemplo nunca faz as vezes de rótulo (PLAN §11)
- [x] A mensagem de erro é associada ao controle por `aria-describedby`, e o controle recebe `aria-invalid`
- [x] O controle é alcançável pelo rótulo: clicar no rótulo foca o campo
- [x] Contagem de testes: 9 testes passam (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done

> **O rótulo é prop obrigatória, não opcional.** Deixá-lo opcional permitiria um campo só com texto de exemplo, que é exatamente o que o PLAN §11 proíbe — ele some quando o consultor começa a digitar e nunca existiu para quem usa leitor de tela. O teste confirma que o rótulo permanece mesmo com texto de exemplo presente.
>
> **A amarração é provada por comportamento, não por atributo.** O teste clica no rótulo e verifica que o controle recebeu foco. Assertar `htmlFor` seria verificar a implementação; clicar verifica o que o consultor obtém.
>
> **Um teste meu estava errado.** Eu esperava que `e.target.value` devolvesse a tecla digitada; ele devolve o valor acumulado do controle. Corrigi a expectativa, que ficou mais precisa, e anotei o porquê no teste.
>
> **Cinco mutações, cinco detecções**: rótulo sem amarração, erro não associado, controle não marcado como inválido, apoio fora da descrição, e props não encaminhadas.
**Commit**: `feat(ui): adiciona componente de campo de formulário`

---

#### T7: Componente de botão

**What**: Botão com estado de envio que desabilita e anuncia progresso.
**Where**: `src/components/ui/Botao.tsx`
**Depends on**: T6
**Reuses**: tokens de tema
**Requirement**: AUTH-01, AUTH-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Em estado de envio, fica desabilitado e um segundo clique não dispara a ação
- [ ] ~~A variante destrutiva é visualmente distinta da primária (PLAN §11)~~ — **transferido para `clients`**, ver nota
- [x] O botão é alcançável pelo teclado; o foco visível vem da regra global de `:focus-visible` e é verificado em navegador real
- [x] Contagem de testes: 12 testes passam (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done, com um critério transferido

> **A variante destrutiva não foi construída, de propósito.** `auth` não tem ação destrutiva — sair não é uma. Criar a variante agora seria abstração especulativa, contra o princípio que o próprio design desta feature enuncia: componente novo nasce quando há consumidor. Ela nasce em `clients`, junto da exclusão que a exige e que o PLAN §7 descreve com diálogo de confirmação. O critério foi transferido, não apagado.
>
> **O tipo padrão é `button`, não `submit`.** Dentro de um formulário o padrão do HTML é `submit`, o que transforma qualquer botão esquecido — cancelar, alternar visibilidade da senha — em envio acidental. Dois testes cobrem isso: um verifica o atributo, outro verifica que o formulário de fato não é enviado.
>
> **A prevenção de duplo envio mora no componente**, e não em cada tela. Se dependesse da tela, bastaria um formulário esquecer. O teste clica duas vezes durante o envio e assere zero chamadas.
>
> **Quatro mutações, quatro detecções**: envio que não desabilita, tipo padrão trocado, progresso não anunciado, variante não exposta.
**Commit**: `feat(ui): adiciona componente de botão`

---

#### T8: Componente de alerta

**What**: Mensagem de nível de formulário, anunciada a leitores de tela.
**Where**: `src/components/ui/Alerta.tsx`
**Depends on**: T7
**Reuses**: tokens de tema
**Requirement**: AUTH-03, AUTH-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Usa região assistiva, de modo que a mensagem seja anunciada e não apenas exibida
- [x] Distingue erro de informação por cor e por texto, nunca só por cor
- [x] Contagem de testes: 7 testes passam (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done

> **Dois papéis, não um.** Erro usa `role="alert"`, que interrompe o leitor de tela — quem acabou de enviar um formulário precisa saber agora que falhou, não quando chegar ali lendo. Sucesso, aviso e informação usam `role="status"`, que aguarda uma pausa: anunciar "pronto, salvo" por cima do que está sendo lido atrapalha mais do que ajuda.
>
> **O marcador textual é o que cumpre o critério.** A cor sozinha deixa de fora quem não separa vermelho de verde, que é a deficiência de visão de cores mais comum. Um teste assere que os quatro tons produzem marcadores distintos — remover o marcador ou repetir um entre tons derruba a suíte.
>
> **Quatro mutações, quatro detecções**: erro sem anúncio assertivo, marcador removido, marcador repetido entre tons, e tom padrão trocado.
**Commit**: `feat(ui): adiciona componente de alerta`

---

#### T9: Guarda das rotas privadas

**What**: `RotaProtegida` com os três estados e preservação da rota pretendida.
**Where**: `src/features/auth/components/RotaProtegida.tsx`
**Depends on**: T8
**Reuses**: `useAuth` de T4
**Requirement**: AUTH-09, AUTH-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Em `carregando`, não renderiza nem o conteúdo privado nem a tela de login
- [x] Em `anonimo`, redireciona para `/login` gravando a rota pretendida em `?redirect=`
- [x] Em `autenticado`, renderiza o `Outlet`
- [x] A rota pretendida preserva caminho, parâmetros de consulta e fragmento
- [x] Contagem de testes: 8 testes passam (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done

> **O estado do meio tem dois testes, não um.** Um verifica que nem o conteúdo privado nem o login aparecem; outro, que há indicação de progresso. Separados de propósito: renderizar `null` passaria no primeiro e daria tela em branco, que é o outro defeito que o PLAN §10 proíbe.
>
> **Outra expectativa minha estava errada, e a correção revelou a garantia certa.** Eu esperava que `Zona+Sul` chegasse ao destino como `Zona Sul`. Não chega: a URL é codificada inteira, então o `+` vira `%2B` e volta como `+`. Isso está correto — o destino precisa ser **idêntico** ao pedido. Reinterpretar a query devolveria o consultor a um filtro diferente daquele que ele tentou abrir. O teste passou a assertar a igualdade com a URL original em vez de um valor que eu tinha suposto.
>
> **`Carregando` nasceu compartilhado**, e não extraído depois: T10 é o segundo consumidor, o que já é razão suficiente.
>
> **Quatro mutações, quatro detecções**: carregamento ignorado, rota pretendida sem query e fragmento, destino não enviado ao login, e conteúdo privado nunca renderizado.
**Commit**: `feat(auth): adiciona guarda das rotas privadas`

---

#### T10: Guarda das rotas públicas

**What**: `RotaPublica`, simétrica, com a exceção de `/reset-password` em recuperação.
**Where**: `src/features/auth/components/RotaPublica.tsx`
**Depends on**: T9
**Reuses**: `useAuth` de T4
**Requirement**: AUTH-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Em `carregando`, não renderiza nada de decisivo
- [x] Em `autenticado`, redireciona para `/clients`
- [x] WHILE `emRecuperacao`, `/reset-password` é acessível mesmo autenticado
- [x] Autenticado normalmente, sem a marca, `/reset-password` também redireciona
- [x] Contagem de testes: 9 testes passam (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test && npm run build`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done — encerra a Fase 2

> **A exceção tem duas metades, e cada uma é guardada por um teste diferente.** A condição é `emRecuperacao && pathname === '/reset-password'`. Remover a segunda metade faz a marca abrir cadastro e login; remover a primeira faz a redefinição abrir para qualquer sessão. As duas mutações derrubam testes distintos, o que prova que nenhuma das metades é decorativa.
>
> **Quem não tem sessão alcança `/reset-password`**, de propósito: é ali que a orientação de pedir um link novo precisa aparecer, conforme o AUTH-08 AC7. A guarda não bloqueia anônimos nessa rota; quem decide o que exibir é a própria tela, em T14.
>
> **Quatro mutações, quatro detecções.**
**Commit**: `feat(auth): adiciona guarda das rotas públicas`

---

### Phase 3: Telas

#### T11: Tela de login

**What**: Formulário de entrada com mensagem genérica e retorno à rota pretendida.
**Where**: `src/features/auth/pages/Login.tsx`
**Depends on**: T10
**Reuses**: `Campo`, `Botao`, `Alerta`, `auth-service`, `schemaDeLogin`
**Requirement**: AUTH-04, AUTH-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Credencial inválida exibe a frase genérica, sem distinguir e-mail inexistente de senha errada
- [x] Falha de rede exibe frase distinta — garantida em `traduzirErro` e coberta em T3
- [x] Durante o envio o botão desabilita e um segundo envio não acontece
- [x] Após entrar, navega para a rota de `?redirect=` quando houver, e para `/clients` quando não
- [x] **Acrescentado**: destino externo em `?redirect=` é ignorado (redirecionamento aberto)
- [x] Links para cadastro e recuperação estão presentes
- [x] Contagem de testes: 12 da tela mais 6 do destino seguro (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done

> **Uma vulnerabilidade que o design não previu.** `?redirect=` é vetor clássico de redirecionamento aberto: bastaria enviar `/login?redirect=https://site-falso.com` para que o consultor, após digitar a senha corretamente, caísse numa cópia da tela. Como o endereço de origem é legítimo, o golpe é difícil de perceber. `destinoSeguro` aceita apenas caminhos internos e recusa também `//host`, que o navegador trata como absoluto herdando o protocolo, e `/\host`, que alguns normalizam.
>
> **Um teste meu não discriminava, e a correção revelou o comportamento certo.** O teste "limpa o erro anterior ao reenviar" na verdade verificava navegação: como a tela desmonta ao navegar, o alerta some de qualquer forma. A diferença real aparece **durante** o segundo envio — manter o erro antigo em tela enquanto a nova tentativa está em voo faz parecer que ela já falhou. O teste passou a interceptar o envio em voo e assertar que o alerta já saiu.
>
> **Cinco mutações, cinco detecções** após a correção: validação do destino removida por completo, só a barra dupla liberada, a tela confiando no parâmetro sem validar, aviso de expiração lido a cada renderização, e erro anterior não limpo.
**Commit**: `feat(auth): adiciona tela de login`

---

#### T12: Tela de cadastro

**What**: Criação de conta com entrada imediata no CRM.
**Where**: `src/features/auth/pages/Cadastro.tsx`
**Depends on**: T11
**Reuses**: `Campo`, `Botao`, `Alerta`, `auth-service`, `schemaDeCadastro`
**Requirement**: AUTH-01, AUTH-02, AUTH-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Validação por campo antes de qualquer chamada: nome vazio, e-mail inválido, senha curta, confirmação divergente
- [x] E-mail já cadastrado exibe orientação e preserva o que foi digitado
- [x] Após cadastrar, entra no CRM sem passo intermediário (AD-007)
- [x] Contagem de testes: 10 da tela mais 1 acrescentado ao schema (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done

> **O AUTH-01 AC8 não é cumprido por código da aplicação, e isso é deliberado.** O critério pede garantir que o perfil exista antes de renderizar o CRM. Ele nasce do trigger na mesma transação que o usuário (AD-005), e o próprio edge case do spec manda exibir o CRM mesmo que a leitura do perfil falhe. Checar aqui seria uma ida ao banco para confirmar o que o banco já garantiu — e ainda contrariaria o edge case. A evidência vive em `tests/rls/auth-service.test.ts`, que assere o perfil criado com o nome enviado pelo serviço.
>
> **Um helper genérico foi removido dos schemas, por dano real de tipagem.** `confirmacaoCoincide` recebia `z.ZodType<T>`, e aquele parâmetro descreve apenas a saída: o tipo de ENTRADA virava `unknown`, deixando os campos do formulário sem tipagem. Substituído por um objeto de opções compartilhado, que preserva os dois tipos. Os 173 testes anteriores seguiram passando, o que confirma que a troca não mudou comportamento.
>
> **O nome passou a colapsar espaços internos.** O banco já faz isso com `clients.name` pelo trigger de normalização; manter `profiles.full_name` diferente faria o mesmo consultor aparecer grafado de dois jeitos conforme a tela que o cadastrou. Mudança no entregável de T2, registrada aqui.
>
> **Três mutações, três detecções**: formulário limpo na recusa, cadastro que não navega, e nome sem colapso de espaços.
**Commit**: `feat(auth): adiciona tela de cadastro`

---

#### T13: Tela de solicitação de recuperação

**What**: Pedido de link de redefinição, com resposta neutra.
**Where**: `src/features/auth/pages/EsqueciSenha.tsx`
**Depends on**: T12
**Reuses**: `Campo`, `Botao`, `Alerta`, `auth-service`, `schemaDeRecuperacao`
**Requirement**: AUTH-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] A confirmação exibida é idêntica para e-mail com e sem conta
- [x] O redirecionamento pedido ao Supabase aponta para `/reset-password`
- [x] Contagem de testes: 8 testes passam (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done

> **A discrição tem duas camadas, e ambas são testadas.** O serviço já silencia recusas do Supabase (T3); a tela usa frase condicional — "se houver uma conta" — em vez de "enviamos para você". A asserção não verifica só que a frase certa aparece: verifica também que a frase **errada** não aparece, com uma expressão que rejeita "enviamos para você", "conta encontrada" e "não existe". Trocar o texto por um que confirme a existência derruba o teste.
>
> **A origem vem do navegador, não de configuração.** `globalThis.location.origin` faz o mesmo código montar o endereço certo em desenvolvimento e em produção. O teste assere a URL completa, então perder a origem — o que faria o Supabase recusar o redirecionamento — é detectado.
>
> **O formulário some depois do envio.** Sem isso, o consultor reenviaria por reflexo e bateria no limite de envio de e-mail do Supabase, recebendo um erro onde deveria ver uma confirmação.
>
> **Quatro mutações, quatro detecções**.
**Commit**: `feat(auth): adiciona tela de solicitação de recuperação`

---

#### T14: Tela de redefinição de senha

**What**: Nova senha a partir da sessão de recuperação, e a orientação quando não houver.
**Where**: `src/features/auth/pages/RedefinirSenha.tsx`
**Depends on**: T13
**Reuses**: `useAuth`, `auth-service`, `schemaDeNovaSenha`
**Requirement**: AUTH-08

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Com `emRecuperacao`, apresenta o formulário de nova senha
- [x] Sem a marca, exibe a orientação de solicitar um link em `/forgot-password`
- [x] Senha curta ou divergente da confirmação reporta no campo, sem chamar o Supabase
- [x] Após redefinir, a marca cai e o consultor segue para `/clients` autenticado
- [x] Link expirado ou já usado exibe o motivo e o caminho para pedir outro
- [x] Contagem de testes: 10 da tela mais 8 do leitor de fragmento (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done

> **Dois critérios que pareciam um só.** O AC5 pede explicar um link expirado; o AC7, orientar quem chegou sem link. Os dois casos chegam à tela **sem sessão de recuperação** — e sem mais informação seriam indistinguíveis. O Supabase resolve isso devolvendo o erro no fragmento da URL, na forma `#error=access_denied&error_code=otp_expired`. `lerErroDoFragmento` extrai esse código, e um teste assere que as duas situações produzem mensagens **diferentes** — não apenas que cada uma produz a sua.
>
> **A navegação após redefinir é explícita, mesmo sendo redundante.** O provedor derruba a marca ao receber `USER_UPDATED`, o que faria a guarda pública redirecionar sozinha. Navegar aqui torna o destino visível no código da tela em vez de efeito colateral de outra camada — e o teste de T4 continua garantindo que a marca cai.
>
> **Quatro mutações, quatro detecções**: formulário exibido sem sessão de recuperação, motivo do link não lido, mensagem específica do link expirado removida, e redefinição que não navega.
**Commit**: `feat(auth): adiciona tela de redefinição de senha`

---

#### T15: Tela de perfil

**What**: Leitura do perfil e edição de nome e telefone.
**Where**: `src/features/auth/pages/Perfil.tsx`
**Depends on**: T14
**Reuses**: `Campo`, `Botao`, `supabase`, `schemaDePerfil`
**Requirement**: AUTH-13, AUTH-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Exibe nome, e-mail e telefone vindos de `profiles`
- [x] O e-mail é somente leitura, com a indicação de que não muda por aqui (AD-008)
- [x] Salvar nome ou telefone persiste e exibe confirmação
- [x] Nome vazio ou acima de 120 caracteres reporta no campo, sem enviar
- [x] A alteração reflete no cabeçalho sem recarregar a página — garantida pela invalidação da chave compartilhada; o consumo pelo cabeçalho é T16
- [x] Contagem de testes: 13 testes passam (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done

> **`readOnly` e não `disabled`, e a distinção é testada.** Campo desabilitado sai da ordem de tabulação e alguns leitores de tela o ignoram — esconderia justamente a informação que o consultor veio conferir. O teste assere as duas coisas: que digitar não muda o valor **e** que o campo não está desabilitado. Trocar por `disabled` derruba o teste, assim como remover a proteção por completo. São dois defeitos diferentes, e a asserção separa ambos.
>
> **A busca não filtra por identificador.** A política de RLS já restringe a leitura ao próprio registro (AD-014). Filtrar no cliente repetiria uma regra que o banco impõe e daria a impressão falsa de que é o filtro que protege. O update filtra porque precisa de alvo, não de proteção.
>
> **Invalidação em vez de escrita no cache.** Escrever o perfil novo diretamente seria mais rápido, mas o cabeçalho de T16 lê a mesma chave e pode montar depois; invalidar garante que qualquer leitor da chave busque o valor atual.
>
> **Cinco mutações, cinco detecções**, incluindo as duas variantes distintas do campo de e-mail.
**Commit**: `feat(auth): adiciona tela de perfil`

---

#### T16: Identificação do consultor no cabeçalho

**What**: `MenuDoUsuario` preenchendo o espaço que `AppLayout` reservou.
**Where**: `src/features/auth/components/MenuDoUsuario.tsx`
**Depends on**: T15
**Reuses**: espaço `acoesDoUsuario` de `AppLayout`
**Requirement**: AUTH-06, AUTH-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Exibe o nome do consultor autenticado
- [x] A ação de sair encerra a sessão; a limpeza de cache e o redirecionamento ficam a cargo do provedor e da guarda — ver nota
- [x] Oferece acesso à tela de perfil
- [x] Contagem de testes: 6 testes passam (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test && npm run build`

**Tests**: unit
**Gate**: quick
**Status**: ✅ Done — encerra a Fase 3

> **Sair não navega, de propósito, e há teste que guarda isso.** Navegar para `/login` daqui faria a guarda pública devolver o consultor ao CRM no instante entre a navegação e a chegada do evento `SIGNED_OUT` — um piscar visível. Encerrar a sessão basta: o provedor limpa o cache (T4) e a guarda redireciona (T9). O teste assere que a rota **não muda** ao clicar em sair, o que é uma asserção incomum mas é exatamente a propriedade desejada.
>
> **A chave de consulta compartilhada é testada como tal.** O teste invalida a chave e verifica que o nome exibido muda — trocar por uma chave própria do cabeçalho derruba o teste. Sem essa forma, um `queryKey` diferente passaria por qualquer asserção que apenas verificasse o nome inicial.
>
> **Três mutações, três detecções.**
**Commit**: `feat(auth): adiciona identificação do consultor no cabeçalho`

---

### Phase 4: Integração

#### T17: Ligar as rotas de autenticação à árvore

**What**: As cinco rotas sob as guardas corretas, na árvore real.
**Where**: `src/app/router.tsx`
**Depends on**: T16
**Reuses**: `rotas` da `foundation`, ambas as guardas
**Requirement**: AUTH-09, AUTH-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `/login`, `/signup`, `/forgot-password` e `/reset-password` ficam sob `RotaPublica` e `PublicLayout`
- [x] `/profile` fica sob `RotaProtegida` e `AppLayout`, com `MenuDoUsuario` no cabeçalho
- [x] `AuthProvider` envolve a árvore por dentro do `QueryClientProvider`
- [x] Um teste percorre a árvore real e assere que cada rota está sob a guarda correta
- [x] A asserção de que nenhuma rota tem `loader` continua valendo (AD-013)
- [x] Contagem de testes: 8 testes de rota (sem deleções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test && npm run build`

**Tests**: unit
**Gate**: full
**Status**: ✅ Done

> **Cada rota é verificada duas vezes, positiva e negativamente.** Um teste assere que as rotas de CRM estão sob `RotaProtegida`; outro, que **não** estão sob `RotaPublica`. Cadastrar uma rota no lugar errado derruba os dois. Só a asserção positiva deixaria passar uma rota aninhada sob ambas as guardas, que compila e roda.
>
> **A verificação sobe a árvore real, e não uma montada no teste.** `ancestraisDe` percorre `rotas` a partir da raiz até o caminho pedido. É o que faz esta suíte detectar uma rota nova cadastrada no lugar errado — exatamente a lição que a `foundation` registrou sobre asserções estruturais.
>
> **A estrutura é guarda → layout → telas**, e a ordem importa. A guarda por fora decide antes de qualquer moldura ser desenhada; inverter faria o cabeçalho aparecer e só então descobrir que não há sessão, produzindo o piscar que o PLAN §6 proíbe.
>
> **`/clients` é lugar-tenente.** A rota pertence à feature `clients`, mas as guardas e o login apontam para ela. Sem um destino real, o fluxo de autenticação não fecharia de ponta a ponta e T18 não teria o que testar. Renderiza o conteúdo de espera atual e será substituída.
>
> **Quatro mutações, quatro detecções.**
**Commit**: `feat(auth): liga as rotas de autenticação à árvore`

---

#### T18: Fluxo de autenticação ponta a ponta

**What**: O trecho de autenticação do roteiro do PLAN §13, em navegador real, com o link de recuperação lido do servidor de e-mail local.
**Where**: `e2e/auth.spec.ts`
**Depends on**: T17
**Reuses**: configuração do Playwright da `foundation`
**Requirement**: AUTH-01, AUTH-04, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Criar conta leva ao CRM sem passo intermediário
- [x] Sair e entrar de novo funciona com as mesmas credenciais
- [x] Recarregar uma rota privada autenticado nunca exibe a tela de login, nem por um instante
- [x] Visitante sem sessão que abre rota privada é levado ao login e, após entrar, chega à rota pretendida
- [x] O fluxo de recuperação usa o link real capturado no servidor de e-mail local, e a nova senha passa a valer
- [x] O link do e-mail aponta para o domínio de desenvolvimento, e não para a porta padrão do `config.toml`
- [x] Contagem de testes: 8 de autenticação mais 7 de fumaça, 15 E2E no total
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test && npm run test:e2e && npm run build`

**Tests**: e2e
**Gate**: full
**Status**: ✅ Done — encerra a feature `auth`

> **Dois defeitos reais que 232 testes unitários não pegaram.** Ambos são corridas entre o evento de sessão e a renderização, invisíveis fora de um navegador.
>
> O primeiro: ao entrar vindo de `/login?redirect=%2Fprofile`, o consultor caía em `/clients`. Quando a autenticação conclui, o evento chega e a guarda pública redireciona **antes** de a tela navegar — e ela não lia o destino pretendido. Corrigido na guarda, que é quem de fato redireciona.
>
> O segundo: o formulário de nova senha aparecia e sumia. O supabase-js emite `INITIAL_SESSION` com a sessão do link **antes** de `PASSWORD_RECOVERY`, e nesse intervalo a guarda via "autenticado sem marca" e expulsava o consultor. Ao investigar, descobri que eu havia lido o spec errado: o AUTH-08 AC7 manda orientar quem chega "sem sessão de recuperação", o que **inclui uma sessão comum**. A rota nunca deve ser redirecionada; quem decide é a tela. A correção simplificou a guarda e eliminou a corrida.
>
> **Um teste unitário codificava a leitura errada** e foi corrigido junto: ele afirmava que a guarda redireciona uma sessão comum na rota de redefinição. Agora assere que a guarda **nunca** redireciona ali, nos três estados.
>
> **Asserção do piscar, sem estado final.** "Recarregar nunca exibe o login, nem por um instante" não se verifica olhando o resultado. O teste observa os eventos de navegação durante o recarregamento e assere que nenhum foi para `/login` — um piscar seria justamente uma dessas navegações.
>
> **Os testes de fumaça precisaram mudar** porque a raiz deixou de ser pública. Passaram a usar `/login`, e ganharam um teste novo: a raiz leva quem não tem sessão ao login.
**Commit**: `test(e2e): cobre o fluxo de autenticação ponta a ponta`

---


### Phase 5: Correções pós-verificação

#### T19: Testar o serviço de perfil

**What**: Testes unitários e contra a pilha real para `profile-service`, hoje sem teste algum.
**Where**: `src/features/auth/services/profile-service.test.ts`
**Depends on**: T18
**Reuses**: harness de `tests/rls/helpers.ts`
**Requirement**: AUTH-13, AUTH-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Lacuna L1, a única classificada como bloqueante.** Três mutações sobrevivem aos cinco gates: parar de gravar o telefone, passar a gravar o e-mail, e fabricar um perfil vazio em vez de falhar.

**Done when**:
- [x] `atualizarPerfil` tem teste que assere o payload exato enviado, incluindo o telefone
- [x] Um teste contra a pilha real salva nome e telefone e relê, provando a persistência
- [x] Um teste contra a pilha real prova que escrever `email` é recusado pelo grant
- [x] `buscarPerfil` tem teste do caminho de erro, que não pode devolver perfil fabricado
- [x] As três mutações do relatório passam a ser detectadas
- [x] Gate check passa: `npm run lint && npm run typecheck && npm run test`

**Tests**: unit + integration
**Gate**: full
**Status**: ✅ Done

> **A mesma lição, cometida duas vezes na mesma feature.** Em T3 acrescentei um teste contra a pilha real para `auth-service` justamente porque mock esconde desvio de contrato — e provei isso trocando a chave dos metadados nos dois lugares ao mesmo tempo. Criei `profile-service` depois e não fiz o mesmo. A lição L-001 do `LESSONS.md` descreve exatamente este caso: quando o grant cobre a operação, o teste comportamental desaparece.
>
> **M2 morre nas duas camadas, e por razões diferentes.** O teste unitário assere que o payload não contém `email`; o teste contra a pilha real prova que o banco recusa a escrita com `42501`. Um verifica a intenção do serviço, o outro o contrato do grant. Se só o unitário existisse, alterar o grant da migration passaria despercebido.
>
> **A releitura é o que prova a persistência.** Conferir o retorno do update provaria apenas que a chamada devolveu algo; o teste relê da tabela.
>
> **Um teste a mais que o pedido**: atualizar o perfil de outro consultor é recusado. A RLS filtra a linha, o `.single()` não encontra alvo, e o serviço devolve recusa em vez de sucesso silencioso.
**Commit**: `test(auth): cobre o serviço de perfil`

---

#### T20: Fixar a configuração de sessão do cliente

**What**: Tornar explícitas e asseridas as opções de sessão do cliente Supabase.
**Where**: `src/lib/supabase.ts`
**Depends on**: T19
**Reuses**: cliente da `foundation`
**Requirement**: AUTH-05, AUTH-12

**Lacuna L2.** Desligar a renovação automática de token não derruba teste algum, e é o AUTH-12 AC5.

**Done when**:
- [ ] `persistSession` e `autoRefreshToken` ficam explícitos no código, em vez de implícitos por padrão
- [ ] Teste assere as duas opções, de modo que desligar qualquer uma derrube a suíte
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test`

**Tests**: unit
**Gate**: quick
**Commit**: `fix(auth): fixa a configuração de sessão do cliente`

---

#### T21: Emendar o spec sobre a rota de redefinição

**What**: Alinhar `spec.md` ao comportamento que T18 provou necessário.
**Where**: `.specs/features/auth/spec.md`
**Depends on**: T20
**Reuses**: medição de T18
**Requirement**: AUTH-08, AUTH-11

**Lacuna L3.** O spec exige redirecionar `/reset-password` para sessão autenticada; a implementação a isenta incondicionalmente, e um teste fixa a divergência em vez de denunciá-la.

**Done when**:
- [ ] O AC6 do AUTH-11 deixa de listar `/reset-password` entre as rotas redirecionadas
- [ ] A premissa correspondente registra a razão medida em T18
- [ ] O checkbox de T10 deixa de afirmar o comportamento antigo
- [ ] `validate_spec.py` sai limpo
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm run test`

**Tests**: none
**Gate**: build
**Commit**: `docs(auth): emenda o spec sobre a rota de redefinição`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 → T2 → T3 → T4 → T5
Phase 2:  T6 → T7 → T8 → T9 → T10
Phase 3:  T11 → T12 → T13 → T14 → T15 → T16
Phase 4:  T17 → T18
Phase 5:  T19 → T20 → T21
```

A execução é estritamente sequencial dentro de cada fase.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Configuração do Auth | 1 arquivo de configuração mais seu teste | ✅ Granular |
| T2: Schemas | 1 módulo | ✅ Granular |
| T3: Serviço | 1 módulo | ✅ Granular |
| T4: Provedor | 1 componente mais o hook que o acompanha | ⚠️ Aceito — o hook existe só para ler aquele contexto |
| T5: Classificação de erro | 1 módulo modificado | ✅ Granular |
| T6, T7, T8: componentes de interface | 1 componente cada | ✅ Granular |
| T9, T10: guardas | 1 componente cada | ✅ Granular |
| T11–T15: telas | 1 página cada | ✅ Granular |
| T16: Menu do usuário | 1 componente | ✅ Granular |
| T17: Fiação de rotas | 1 módulo modificado | ✅ Granular |
| T18: Fluxo ponta a ponta | 1 arquivo de teste | ✅ Granular |

A única marca ⚠️ é deliberada: separar o hook do provedor produziria um commit com código sem consumidor.

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
| T11 | T10 | cruza fase | ✅ isento |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T16 | cruza fase | ✅ isento |
| T18 | T17 | T17 → T18 | ✅ |

Como na `foundation`, `Depends on` registra o antecessor imediato, que é verdadeiro sob execução sequencial e mais restritivo que a dependência mínima. O acoplamento real, mais frouxo, está em `Reuses`.

---

## Test Co-location Validation

| Task | Camada criada | Matriz exige | Tarefa declara | Status |
| ---- | ------------- | ------------ | -------------- | ------ |
| T1 | Configuração do Supabase Auth | integration | integration | ✅ |
| T2 | Schemas Zod | unit | unit | ✅ |
| T3 | Serviço de feature | unit | unit | ✅ |
| T4 | Provedor | unit | unit | ✅ |
| T5 | Módulo de `src/lib` | unit | unit | ✅ |
| T6, T7, T8 | Componentes de interface | unit | unit | ✅ |
| T9, T10 | Guardas | unit | unit | ✅ |
| T11–T15 | Telas | unit | unit | ✅ |
| T16 | Componente de feature | unit | unit | ✅ |
| T17 | Fiação de rotas | unit | unit | ✅ |
| T18 | Fluxo ponta a ponta | e2e | e2e | ✅ |

Nenhuma violação, e **nenhuma tarefa declara `Tests: none`** — diferente da `foundation`, onde seis o faziam. A razão é que esta feature não cria configuração de ferramental: tudo que ela entrega ou é lógica, ou é interface, ou é comportamento observável do Supabase.
