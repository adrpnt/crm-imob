**Result**: PASS

# Auth — Relatório de Verificação Independente (rodada 2)

> Verificador independente da rodada 2. Não herdei o modelo mental do autor nem o do
> verificador da rodada 1: os gates foram rodados do zero, a cobertura foi re-derivada do
> `spec.md`, e as afirmações do relatório anterior foram tratadas como hipóteses a
> confirmar — duas delas se confirmaram, uma se confirmou apenas em parte, e a terceira se
> revelou **mais forte** do que a rodada 1 supunha.
>
> **O PASS não é a ausência de lacunas.** Sobra dívida registrada, e uma delas — o AUTH-12
> AC5 — continua sem evidência comportamental, em duas formas que este relatório mede.
> O PASS é porque a única lacuna classificada como **bloqueante** foi fechada de verdade,
> em duas camadas independentes, e porque a divergência entre spec, código e testes
> deixou de existir. Detalhes em §6.

---

## 1. Histórico das duas rodadas

| | Rodada 1 | Rodada 2 (esta) |
| --- | --- | --- |
| Veredito | FAIL | **PASS** |
| Gates | 5 de 5 | 5 de 5 |
| Requisitos com evidência real | 13 de 15 | **14 de 15** |
| Edge cases com evidência | 3 de 6 | 3 de 6 (inalterado — dívida L5/L6) |
| Mutações aplicadas | 10 · 5 sobreviveram | 6 reaplicadas + 8 novas · **4 sobreviveram** |
| Lacunas | L1 (bloqueante), L2, L3 abertas; L4–L8 dívida | L1 e L3 **fechadas**; L2 **parcial**; L4–L8 dívida |

Correções auditadas: `a3cebbf` (`test(auth): cobre o serviço de perfil`) e `6920312`
(`fix(auth): fecha as lacunas da verificação independente`).

---

## 2. Gates

Códigos de saída capturados **diretamente** (`cmd; echo $?`), nunca por pipe. Rodados duas
vezes: antes das mutações e depois de tudo revertido. Os números abaixo são os da segunda
passagem, idênticos aos da primeira.

| Gate | Comando | Saída | Código |
| ---- | ------- | ----- | ------ |
| Lint | `npm run lint` | sem avisos | `0` |
| Typecheck | `npm run typecheck` | sem erros | `0` |
| Testes | `npm run test` | 242 unitários (27 arquivos) · pgTAP: 9 arquivos, 137 asserções, desfecho `All tests successful` · 34 RLS (5 arquivos) | `0` |
| E2E | `npm run test:e2e` | 15 passaram | `0` |
| Build | `npm run build` | ok (aviso de tamanho de chunk, pré-existente) | `0` |

Crescimento desde a rodada 1: **+10 unitários** (7 em `profile-service.test.ts`, 3 em
`supabase.test.ts`) e **+5 RLS** (`tests/rls/profile-service.test.ts`). Nenhuma deleção
silenciosa: os 232 unitários e 29 RLS da rodada 1 continuam presentes.

Pré-requisito: `npx supabase status` respondeu com a pilha local no ar (API 54321, DB 54322,
Mailpit 54324). `supabase_imgproxy` e `supabase_pooler` seguem parados e nenhum é usado por
esta feature.

Árvore de trabalho ao final: `git status --porcelain` **vazio**.

---

## 3. As três lacunas corrigidas

### 3.1 L1 (bloqueante) — `profile-service.ts` sem teste algum → **FECHADA, e de forma substantiva**

A correção não é superficial. São **duas camadas independentes que pegam a mesma mutação
por razões diferentes**, que é exatamente o remédio que a lacuna pedia.

**Camada unitária** — `src/features/auth/services/profile-service.test.ts`, 7 testes:

- `:65-69` `expect(update).toHaveBeenCalledWith({ full_name: 'Joana M. Silva', phone: '21912345678' })`
  e `expect(eq).toHaveBeenCalledWith('id', 'u1')`. Igualdade **profunda**, não
  `objectContaining` — é o que faz uma coluna a mais reprovar, e não só uma a menos.
- `:80` `expect(update.mock.calls[0][0]).not.toHaveProperty('email')` — asserção negativa
  explícita sobre a coluna fora do grant.
- `:88` `expect(update).toHaveBeenCalledWith({ full_name: 'Joana', phone: null })` — o nulo
  quando o telefone é apagado.
- `:97` `expect(resultado.ok === false && resultado.mensagem).toMatch(/não foi possível salvar/i)`
- `:106` `expect(console.error).toHaveBeenCalledWith('[falha ao atualizar perfil]', erro)`
- `:55` `await expect(buscarPerfil()).rejects.toMatchObject({ code: 'PGRST116' })` — prova
  que a leitura **propaga** o erro em vez de fabricar um perfil vazio.

**Camada contra a pilha real** — `tests/rls/profile-service.test.ts`, 5 testes:

- `:53-54` `expect(relido.full_name).toBe('Joana M. Silva')` e `expect(relido.phone).toBe('21912345678')`
  **depois de uma releitura**, não confiando no retorno do `update`. É isto que transforma
  o AUTH-14 AC3 de "a tela pede a persistência" em "a persistência ocorre".
- `:83` `expect(error!.code).toBe('42501')` e `:84` `expect((await buscarPerfil()).email).toBe(email)`
  — o banco recusa a escrita do e-mail, e o valor original sobrevive.
- `:32-33` leitura do perfil criado pelo trigger; `:66` o telefone apagado vira nulo; `:99`
  o serviço recusa alterar o perfil alheio.

**Medição**: M1, M2 e M3 reaplicadas — **as três morrem** (§4). M2, a mais severa da rodada
1, morre em duas camadas: nos unitários pela igualdade profunda e no RLS pelo `42501` real
devolvido pelo PostgREST. Verifiquei a causa da falha do RLS na saída, e é o erro de
privilégio autêntico, não um efeito colateral:

```text
[falha ao atualizar perfil] { code: '42501', message: 'permission denied for table profiles' }
```

**Veredito**: fechada. A lacuna bloqueante deixou de existir.

### 3.2 L2 — AUTH-12 AC5 (renovação automática) → **PARCIALMENTE FECHADA**

Esta é a que não resiste inteira ao ceticismo.

O que o autor fez é real e vale registrar: `src/lib/supabase.ts:16-35` tornou explícitas
três opções que antes valiam por padrão implícito da biblioteca — `persistSession: true`
(`:22`), `autoRefreshToken: true` (`:28`) e `detectSessionInUrl: true` (`:33`), esta última
**não pedida** pela lacuna e acrescentada por iniciativa própria. `src/lib/supabase.test.ts`
assere as três (`:14`, `:20`, `:26`).

O problema é **o que a asserção prende**. O teste importa `opcoesDoCliente` e verifica o
valor da constante. A constante é passada a `createClient` em `src/lib/supabase.ts:44-48`,
mas **nada assere esse elo**. A asserção é sobre um objeto exportado, não sobre o cliente
construído. Medi as duas grafias da mesma mutação:

| Grafia de "a renovação automática está desligada" | Gates | Morreu? |
| --- | --- | --- |
| **M5a** — `autoRefreshToken: false` dentro de `opcoesDoCliente` (`supabase.ts:28`) | unit `1` (1 falhou / 241 passaram) | ✅ morre |
| **M5b** — `opcoesDoCliente` ignorada; opções escritas inline na chamada de `createClient` (`supabase.ts:44-48`) | lint `0`, typecheck `0`, unit `0`, rls `0`, **e2e `0`** | ❌ **sobrevive aos cinco gates** |

O comportamento em produção é idêntico nas duas: o cliente roda sem renovar o token. Só a
primeira é vista. O novo teste eleva a barreira contra a edição mais provável — alguém
trocar o valor — e não contra o desvio.

E há uma segunda forma, mais interessante, descoberta em §5: **N3** faz o `AuthProvider`
ignorar o evento `TOKEN_REFRESHED`, e **sobrevive aos cinco gates**. O teste que deveria
guardar isso, `AuthProvider.test.tsx:83-90`, emite `PASSWORD_RECOVERY` e depois
`TOKEN_REFRESHED` **com o mesmo objeto `SESSAO`**, e assere que o estado não mudou — o que
é exatamente o que "ignorar o evento" produz. O teste não consegue distinguir "preservou a
marca ao atualizar" de "não fez nada".

Contrapeso honesto, medido e não suposto: hoje o impacto prático de N3 é **nulo**. O único
consumidor da sessão do contexto em código de produção é `src/features/auth/pages/Perfil.tsx:39`
(`id: sessao!.user.id`), e o identificador do usuário não muda numa renovação. Nenhum
arquivo fora de testes lê `access_token` do contexto — as requisições usam o token que o
próprio supabase-js guarda. É lacuna latente, não defeito vivo.

E duas das três opções **têm** cobertura comportamental de verdade, provada em §5: N1
(`detectSessionInUrl: false`) e N2 (`persistSession: false`), ambas na grafia que ignora a
constante, morrem no E2E. A única sem guardião comportamental é `autoRefreshToken`.

**Veredito**: parcialmente fechada. O AUTH-12 AC5 ganhou uma asserção de **configuração**,
que é mais do que tinha, e continua sem asserção de **comportamento**. Segue não
bloqueante — a mesma classificação que a rodada 1 lhe deu — e vai para a dívida em §6.

### 3.3 L3 — `/reset-password` isenta do redirecionamento → **FECHADA, e a emenda é legítima**

Cheguei a esta com a maior dose de ceticismo, por instrução explícita, e a evidência foi na
direção contrária à que eu esperava: a emenda é **mais** defensável do que a rodada 1
supôs.

**Os três documentos agora concordam.**

- **Spec** — `spec.md:89` (AC6) deixou de listar `/reset-password` entre as rotas
  redirecionadas, e `spec.md:90` acrescenta um critério novo: *"The system SHALL never
  redirecionar `/reset-password`, qualquer que seja o estado da sessão; é a tela que decide
  entre o formulário e a orientação de pedir um novo link."* A premissa em `spec.md:47` foi
  reescrita: saiu o *"enquanto a marca vale"*, entrou a razão medida em T18.
- **Código** — `src/features/auth/components/RotaPublica.tsx:36`
  `if (estado === 'autenticado' && local.pathname !== ROTA_DE_REDEFINICAO)`, com a
  justificativa em `:10-27`.
- **Testes** — `RotaPublica.test.tsx:102` `it('nunca redireciona a rota de redefinição, qualquer que seja a sessão')`,
  `:107-108` o formulário aparece e a listagem não.
- **`tasks.md`** — o checkbox de T10 que afirmava o comportamento contrário foi riscado e
  anotado com a revisão.

**A emenda é legítima, não conveniente.** Três razões, a terceira decisiva:

1. Ela **não** afrouxa nada em favor do autor. Não houve ganho de esforço: o AC6 encolheu e
   um AC7 novo apareceu, declarando a exceção em vez de apagá-la. O AC6 ainda **ganhou**
   obrigação — *"ou para a rota pretendida quando houver uma em `?redirect=`"* — que o
   código já cumpria em `RotaPublica.tsx:42` e o spec não registrava.
2. A razão técnica é verificável: o supabase-js emite `INITIAL_SESSION` com a sessão do
   link **antes** de `PASSWORD_RECOVERY`, e uma guarda que decidisse pela marca veria
   "autenticado sem marca" nesse intervalo.
3. **A sonda M8 prova a razão 2 empiricamente.** Restaurei no código o comportamento que o
   spec exigia *antes* da emenda — redirecionar `/reset-password` quando a sessão é comum,
   isentando apenas enquanto `emRecuperacao` vale. Desta vez ela morre em **duas** camadas,
   e a segunda é a que importa: unit `1` (`RotaPublica.test.tsx:102`) e **e2e `1`**, sendo a
   falha do E2E justamente `e2e/auth.spec.ts:93 recupera a senha pelo link real recebido por e-mail`.
   Ou seja: escrever o que o spec original pedia **quebra o fluxo de recuperação num
   navegador real**. O texto anterior era inimplementável, e a emenda o corrigiu.

Na rodada 1 o sinal de M8 era invertido — um teste falhava quando o comportamento do spec
era restaurado, porque a suíte fixava a divergência. **Agora o sinal está certo**: o teste
falha porque o código passou a contrariar o spec vigente.

**Veredito**: fechada. Emenda legítima, propagada ao texto normativo, e agora sustentada
por medição em navegador real. Um defeito **novo** foi introduzido junto, cosmético — ver
D1 em §6.

---

## 4. Reaplicação das cinco mutações sobreviventes da rodada 1

Método: substituição de **bloco inteiro** de função (nunca linha isolada), confirmação por
leitura do arquivo depois de aplicar, medição pelo **código de saída e pela contagem de
falhas**, reversão com `git checkout -- <arquivo>` (nunca `git stash`), e `npm run db:reset`
sempre que uma migration foi tocada.

| # | Alvo | Mutação | Gates | Morreu? | Quem pegou |
| --- | --- | --- | --- | --- | --- |
| **M1** | `profile-service.ts:41-46` | `atualizarPerfil` deixa de gravar `phone` | **unit `1`** (2 falharam / 240), **rls `1`** (1 falhou / 33) | ✅ **morre** | `profile-service.test.ts:65` e `:88`; `tests/rls/profile-service.test.ts:54` |
| **M2** | `profile-service.ts:43` | `atualizarPerfil` passa a gravar `email` — coluna fora do grant | typecheck `0`, **unit `1`** (3 falharam), **rls `1`** (1 falhou) | ✅ **morre em duas camadas** | `profile-service.test.ts:65,80,88`; RLS pelo `42501` real |
| **M3** | `profile-service.ts:22-26` | `buscarPerfil` troca `.single()` por `.maybeSingle()` e fabrica perfil vazio | **unit `1`** (2 falharam), rls `0` | ✅ **morre** | `profile-service.test.ts:48` e `:55` |
| **M5a** | `supabase.ts:28` | `autoRefreshToken: false` na constante | **unit `1`** (1 falhou / 241) | ✅ morre | `supabase.test.ts:20` |
| **M5b** | `supabase.ts:44-48` | mesma desativação, escrita inline na chamada de `createClient` | lint `0`, typecheck `0`, unit `0`, rls `0`, e2e `0` | ❌ **sobrevive** | ninguém — §3.2 |
| **M10** | `MenuDoUsuario.tsx:22` | consulta do perfil ganha `throwOnError: true` | typecheck `0`, unit `0`, e2e `0` | ❌ **sobrevive** | ninguém — dívida L5, esperado |
| **M8** | `RotaPublica.tsx:28-36` | sonda de conformidade: redireciona `/reset-password` para sessão comum | typecheck `0`, **unit `1`**, **e2e `1`** | ✅ **morre, com sinal correto** | `RotaPublica.test.tsx:102` + `e2e/auth.spec.ts:93` |

**Placar das reaplicadas**: das cinco sobreviventes da rodada 1, **M1, M2 e M3 morrem**;
**M5 morre na grafia da rodada 1 e sobrevive na grafia equivalente**; **M10 sobrevive**,
como esperado, por ser dívida aceita (L5). A sonda M8 morre e o sinal deixou de ser
invertido.

---

## 5. Sensor de discriminação — 8 mutações novas

Nenhuma coincide com as 10 da rodada 1 nem com as ~68 sondas do autor registradas no
`tasks.md`. Busquei camadas que ninguém tocou: o **elo entre a constante de opções e o
cliente construído**, o **evento de renovação no provedor**, o **grant e as políticas da
migration**, e a **configuração de plataforma** (`config.toml`), que nenhuma sonda anterior
havia visitado.

| # | Alvo | Mutação | Gates | Morreu? | Quem pegou |
| --- | --- | --- | --- | --- | --- |
| **N1** | `src/lib/supabase.ts:44-48` | ignora `opcoesDoCliente`; inline com `detectSessionInUrl: false` | lint `0`, unit `0` (242 passaram), **e2e `1`** (1 falhou / 14) | ✅ morre | só o E2E: `e2e/auth.spec.ts:93` (link real). O contrato unitário fica **cego** |
| **N2** | `src/lib/supabase.ts:44-48` | ignora `opcoesDoCliente`; inline com `persistSession: false` | unit `0` (242 passaram), **e2e `1`** (1 falhou / 14) | ✅ morre | só o E2E: `e2e/auth.spec.ts:49` `recarregar uma rota privada autenticado nunca passa pelo login` |
| **N3** | `AuthProvider.tsx:56-59` | o provedor **ignora `TOKEN_REFRESHED`**; o contexto conserva a sessão antiga | typecheck `0`, unit `0`, e2e `0` | ❌ **sobrevive** | ninguém — `AuthProvider.test.tsx:83` não discrimina (§3.2) |
| **N4** | `20260915174330_profiles.sql:36` | grant alargado: `grant update (full_name, phone, email)` | **pgTAP `1`** (`profiles.test.sql` teste 6), **rls `1`** (2 falharam / 32) | ✅ **morre em duas camadas** | `supabase/tests/database/profiles.test.sql` teste 6 + `tests/rls/profile-service.test.ts:83` (teste novo do autor) |
| **N5** | `20260915174330_profiles.sql:44-47` | política de UPDATE perde o escopo de linha: `using (true) with check (true)` | pgTAP `0`, unit `0`, rls `0`, e2e `0` | ❌ **sobrevive** | ninguém — mas **benigna**, ver abaixo |
| **N6** | `20260915174330_profiles.sql:40-42` | política de SELECT perde o escopo: `using (true)` | **pgTAP `1`** (testes 3 e 9), **rls `1`** (8 falharam / 26) | ✅ **morre com folga** | `profiles.test.sql` testes 3 e 9 + 8 testes RLS |
| **N7** | `AuthProvider.tsx:39` | `queryClient.clear()` vira `invalidateQueries()` — cache invalidado, não descartado | **unit `1`** (1 falhou / 241) | ✅ morre | `AuthProvider.test.tsx:99` `volta a anonimo e limpa o cache ao sair` |
| **N8** | `supabase/config.toml:162` | `additional_redirect_urls` perde a entrada `/reset-password` | rls `0`, **e2e `0`** | ❌ **sobrevive** | ninguém — mas **benigna**, ver abaixo |

**Placar: 5 mortas, 3 sobreviventes.** Tudo revertido; `git status --porcelain` vazio ao
final; `npm run db:reset` executado após cada migration mutada e ao restaurá-la; a pilha foi
parada e reerguida ao mutar o `config.toml` e outra vez ao restaurá-lo.

**Sobre N5 — sobrevive, mas não é brecha.** A primeira leitura assusta: alargar a política
de UPDATE pareceria deixar qualquer consultor autenticado alterar o perfil alheio. Fui
verificar em vez de supor, simulando a escrita cruzada direto no banco com o papel
`authenticated` e o `sub` de outro usuário:

```sql
set local role authenticated;
set local request.jwt.claims = '{"sub":"<consultor A>","role":"authenticated"}';
update public.profiles set full_name = 'INVADIDA POR OUTRO' where id = '<consultor B>';
-- UPDATE 0   → a linha da vítima permanece 'Joana Serviço'
```

A escrita **não passa**: o `UPDATE` precisa localizar a linha, e a política de SELECT
(`profiles_select_own`) a esconde. O escopo de linha do UPDATE é redundância sobre o
SELECT, e a suíte não distingue se ele faz alguma coisa. O teste do autor
`tests/rls/profile-service.test.ts:88` (`não altera o perfil de outro consultor`) passa com
a política correta **e** com a alargada — ele detecta a política de SELECT, não a de UPDATE,
apesar do nome. N6 confirma o outro lado: alargar o SELECT derruba 10 testes de uma vez. A
proteção existe e é forte; o que falta é uma asserção que isole a camada de UPDATE.

**Sobre N8 — sobrevive, e também é benigna.** Confirmei que a mutação estava de fato em
vigor antes de medir, lendo o ambiente do contêiner do GoTrue
(`GOTRUE_URI_ALLOW_LIST=http://localhost:5173`, sem a entrada de `/reset-password`), e ainda
assim `e2e/auth.spec.ts:93` — que segue o link real do Mailpit com `page.goto(link)` e
assere `toHaveURL(/\/reset-password/)` — passou. O GoTrue já autoriza caminhos sob a origem
de `site_url`, então a entrada é redundante nesta configuração. O risco fica para o dia em
que `site_url` divergir da origem da aplicação: aí a entrada passa a ser carregadora e nada
notaria sua remoção.

**Sobre N1 e N2 — mortas, mas com uma lição sobre camada.** As duas morrem **apenas no
E2E**. Os 242 unitários passam inteiros, incluindo o contrato novo de `supabase.test.ts`,
porque a constante segue intacta. Quem realmente guarda `persistSession` e
`detectSessionInUrl` é o navegador real, não a asserção de configuração. É o mesmo
raciocínio de elevação de camada que o autor fez em T3, aqui confirmado de fora.

---

## 6. Cobertura re-derivada do `spec.md`

Regra aplicada: **evidência ou zero**. Uma célula só conta como coberta quando cita
`arquivo:linha` *e* reproduz a expressão da asserção. Percorri os 15 requisitos a partir do
`spec.md`, não do `tasks.md`.

### 6.1 AUTH-01 a AUTH-15

| Requisito | `arquivo:linha` + expressão da asserção | Coberto? |
| --- | --- | --- |
| **AUTH-01** Criar conta — formulário e validação | `Cadastro.test.tsx:52` quatro campos vazios sem chamar o serviço · `:62` divergência no campo de confirmação · `:74` senha curta sem chamada · `:83` `expect(cadastrarMock).toHaveBeenCalledWith({…})` normalizado · `:97` `expect(router.state.location.pathname).toBe('/clients')` · `:119` formulário preservado na recusa · `:141` `expect(botao).toBeDisabled()` + `toHaveBeenCalledOnce()` · `schemas.test.ts:76` mínimo de 8 | ✅ |
| AUTH-01 AC7 (falha de rede) | `auth-service.test.ts:66` frase de rede ≠ credencial · `Cadastro.test.tsx:119` formulário preservado | ⚠️ parcial — "opção de tentar de novo" não é definida pelo spec (§6.3) |
| AUTH-01 AC8 (perfil existe antes do CRM) | `tests/rls/auth-service.test.ts:58` `expect(data?.full_name).toBe('Bruno Trigger')` · `tests/rls/profile-service.test.ts:32` `expect(perfil.full_name).toBe('Joana Leitura')` | ✅ — cumprido pelo trigger (AD-005) |
| **AUTH-02** Cadastro no Supabase, sessão imediata | `tests/rls/auth-config.test.ts:60-61` `expect(error).toBeNull()`, `expect(data.session).not.toBeNull()` · `e2e/auth.spec.ts:33` `toHaveURL(/\/clients$/)` | ✅ |
| **AUTH-03** E-mail existente e falha de rede | `auth-service.test.ts:83` `/já possui conta/i` · `:66` rede · `:73,79` limite ≠ credencial · `tests/rls/auth-service.test.ts:72` contra a pilha real | ✅ |
| **AUTH-04** Login, frase genérica, sair, AC6/AC7 | `Login.test.tsx:89` `toHaveTextContent('E-mail ou senha inválidos')` · `e2e/auth.spec.ts:148` `expect(comConta).toBe(semConta)` · `:64` leva ao CRM · `:156` botão desabilitado + `aria-busy` · `AuthProvider.test.tsx:99-105` sair limpa o cache | ✅ |
| AUTH-04 AC6 (as **três** rotas redirecionam quando autenticado) | `RotaPublica.test.tsx:51` `/login` · `:92` `/signup` · `:71` respeita `?redirect=` · `router.test.tsx:62` as quatro rotas públicas sob `RotaPublica` (a guarda é agnóstica ao caminho salvo pela exceção, logo `/forgot-password` decorre por composição) | ✅ |
| AUTH-04 AC7 **novo** (`/reset-password` nunca redirecionada) | `RotaPublica.test.tsx:102` `it('nunca redireciona a rota de redefinição, qualquer que seja a sessão')` · `:107-108` · `e2e/auth.spec.ts:129` | ✅ — **fechado nesta rodada**; M8 confirma |
| **AUTH-05** Restauração entre visitas | `AuthProvider.test.tsx:65` `expect(lido()).toBe('anonimo\|sem-sessao\|false')` · `:71` autenticado · `e2e/auth.spec.ts:49-64` sem navegação a `/login` · `supabase.test.ts:14` `expect(opcoesDoCliente.auth.persistSession).toBe(true)` | ✅ — N2 confirma que o E2E discrimina |
| **AUTH-06** Logout + limpeza de cache | `AuthProvider.test.tsx:103` `expect(limpar).toHaveBeenCalled()` · `auth-service.test.ts:198` · `MenuDoUsuario.test.tsx:78` `expect(sairMock).toHaveBeenCalledOnce()` | ✅ — N7 morre aqui |
| **AUTH-07** Solicitação com resposta neutra | `EsqueciSenha.test.tsx:69` `it('confirma sem revelar se a conta existe')` com asserção **negativa** · `:50` link apontando para `/reset-password` na origem atual · `auth-service.test.ts:158` devolve `ok` mesmo com recusa | ✅ |
| **AUTH-08** Nova senha e link inválido | `RedefinirSenha.test.tsx:77` `expect(redefinirMock).toHaveBeenCalledWith('nova-senha-123')` + `pathname === '/clients'` · `:137` `/este link expirou/i` · `:148` `expect(comLink).not.toBe(semLink)` · `:122` orientação sem formulário · `e2e/auth.spec.ts:93-127` link real do Mailpit, senha antiga deixa de valer | ✅ — a evidência mais completa da feature |
| **AUTH-09** Guarda com estado de carregamento | `RotaProtegida.test.tsx:44` nem conteúdo nem login · `:51` `expect(screen.getByRole('status'))` · `:61` visitante vai ao login · `router.test.tsx:54,67` positivo e negativo · `:91,96` rota inexistente | ✅ |
| **AUTH-10** Preservação e retorno à rota pretendida | `RotaProtegida.test.tsx:67` `toHaveTextContent('destino:/clients/123')` · `:74` query sem reinterpretação · `:84` fragmento · `:89` substitui o histórico · `Login.test.tsx:72` · `destino.test.ts:18-32` · `e2e/auth.spec.ts:74,77` | ✅ |
| **AUTH-11** Redirecionamento de rotas públicas | `RotaPublica.test.tsx:51,92,102,116,122` — as cinco situações, incluindo a marca de recuperação que **não** abre as demais rotas | ✅ — **fechado nesta rodada** (era ❌ divergência na rodada 1) |
| **AUTH-12** AC1 (limpa cache, "Sua sessão expirou", preserva rota) | `query-client.test.ts:113` `expect(consumirSessaoExpirada()).toBe(true)` · `:112` `signOut` chamado · `AuthProvider.test.tsx:103` · `Login.test.tsx:135` `/sua sessão expirou/i` · `RotaProtegida.test.tsx:67` | ⚠️ peças isoladas; nenhum teste percorre a cadeia 401 → `signOut` → `SIGNED_OUT` → guarda → `/login?redirect=` (dívida L7) |
| AUTH-12 AC2 (volta à rota preservada) | `e2e/auth.spec.ts:77` `toHaveURL(/\/profile$/)` — pelo caminho do visitante anônimo | ⚠️ evidência é do AUTH-10 (dívida L7) |
| AUTH-12 AC3 (401/403 → expirada) | `query-client.test.ts:66` `expect(ehSessaoExpirada({ status: 401 })).toBe(true)` · `:70` `403` · `:110` · `:128` `expect(queryClient.getQueryCache().config.onError).toBe(aoFalharConsulta)` | ⚠️ **apenas leituras** — não existe `MutationCache` (dívida L4) |
| AUTH-12 AC4 (`42501` = permissão) | `query-client.test.ts:76` `it('NÃO reconhece o 42501 da RLS…')` · `:87` · `:116` | ✅ para a metade negativa |
| AUTH-12 AC5 (renovação automática) | `supabase.test.ts:20` `expect(opcoesDoCliente.auth.autoRefreshToken).toBe(true)` | ⚠️ **asserção de configuração, não de comportamento** — M5b e N3 sobrevivem (§3.2) |
| **AUTH-13** Leitura de `profiles`, e-mail somente leitura | `tests/rls/profile-service.test.ts:32-33` leitura real contra a pilha · `Perfil.test.tsx:65-67` `toHaveValue(…)` nos três campos · `:77` `toHaveAttribute('readonly')` · `:78` `not.toBeDisabled()` · `:83` a dica associada | ✅ — **fechado nesta rodada** (era ⚠️: o módulo era só mockado) |
| **AUTH-14** Edição de nome e telefone | **Persistência**: `tests/rls/profile-service.test.ts:53-54` releitura confirma `full_name` e `phone` · `:66` nulo · `:83` `42501` no e-mail · **Payload**: `profile-service.test.ts:65,80,88` · **Tela**: `Perfil.test.tsx:98` `/informações foram salvas/i` · `:176` `expect(invalidar).toHaveBeenCalledWith({ queryKey: ['perfil'] })` · `:129,140` erro sem envio · `:195` não confirma sucesso quando falha | ✅ — **fechado nesta rodada** (era ❌ evidência zero de persistência) |
| **AUTH-15** Cabeçalho com nome e sair | `MenuDoUsuario.test.tsx:57` `findByText('Joana Silva')` · `:69` leva ao perfil · `:75` encerra a sessão · `:106` chave compartilhada · `e2e/auth.spec.ts:35` | ✅ |

**Placar: 14 dos 15 requisitos têm evidência real e suficiente** (era 13 na rodada 1). O
único que segue com buraco é o **AUTH-12**, e apenas no AC5 — os AC1/AC2/AC3 estão cobertos
por partes, com as composições faltantes já registradas como dívida L4 e L7 desde a rodada 1.

**AUTH-11 e AUTH-14 saíram da lista de pendências**, que eram as duas afirmações não
provadas que motivaram o FAIL anterior.

### 6.2 Edge Cases

| Edge case | Evidência | Coberto? |
| --- | --- | --- |
| Envio duplo do login processa uma tentativa | `Login.test.tsx:156` `expect(botao).toBeDisabled()` · `:172` `toHaveBeenCalledOnce()` | ✅ |
| Limite de requisições, frase distinta | `auth-service.test.ts:73` e `:79` (429 sem código conhecido) | ✅ |
| Sair numa aba reflete na outra | **nenhuma** — `grep -rn "outra aba\|localStorage\|'storage'\|BroadcastChannel" src tests e2e` → 0 em código de produção | ❌ dívida L6 |
| Link aberto em outro navegador | **nenhuma** — `e2e/auth.spec.ts:93` usa o mesmo contexto | ❌ risco baixo (o token vem no link) |
| E-mail normalizado | `schemas.test.ts:33` · `Login.test.tsx:54` · `EsqueciSenha.test.tsx:60` | ✅ |
| Cadastro ok mas leitura do perfil falha → mantém sessão | `MenuDoUsuario.test.tsx:62` cobre a consulta **pendente**, nunca a **rejeitada** | ❌ dívida L5 — **M10 sobrevive** |

**3 dos 6**, inalterado. As três ausências são exatamente L5 e L6, deixadas como dívida por
decisão do usuário.

### 6.3 Lacunas de precisão do spec (não são falhas do autor)

1. **AUTH-01 AC7 / AUTH-04 AC7-rede** dizem "com opção de tentar de novo" sem definir o que
   constitui a opção. A implementação reabilita o botão. Nada a corrigir, nada verificável.
2. **AUTH-12 AC4** fala em "erro de permissão **na tela que a originou**" sem que exista, em
   `auth`, tela capaz de originar `42501`. Só se torna testável em `clients`.
3. **AUTH-12 AC5** ("renovar automaticamente") continua sem definir observável — nem janela,
   nem evento, nem efeito visível. É parte da razão de a evidência seguir indireta, e
   continua valendo depois da correção.

---

## 7. Dívida remanescente

Reordenada pelo estado atual. Nenhum item abaixo é bloqueante para esta feature de
autenticação, e digo explicitamente por quê em cada um.

### D1 — `spec.md` tem **dois critérios numerados `7.`** no AUTH-04 · **novo, introduzido pela correção de L3** · cosmético

`spec.md:90` (a isenção de `/reset-password`, acrescentada em `6920312`) e `spec.md:91` (a
falha de rede, preexistente) são ambos `7.`. Em markdown renderizado a lista se renumera e
o segundo vira 8, mas no texto-fonte "AUTH-04 AC7" passou a nomear duas coisas — e o
relatório da rodada 1 usa "AUTH-04 AC7" para a falha de rede. `validate_spec.py` sai limpo
(`0 error(s), 0 warning(s)`), então a ferramenta não pega.

Não bloqueante: é ambiguidade de referência, não de comportamento. Custo de fechar: um
caractere.

### D2 — AUTH-12 AC5 sem evidência comportamental · resíduo de L2 · fechar antes de produção

Duas formas medidas, ambas sobreviventes aos cinco gates: **M5b** (opções inline ignorando
`opcoesDoCliente`) e **N3** (o provedor descarta `TOKEN_REFRESHED`). A asserção atual prende
uma constante, não o cliente construído nem o comportamento.

Não bloqueante por três razões medidas, não supostas: o comportamento correto é o padrão da
biblioteca e funciona; nenhum código de produção lê `access_token` do contexto, e o único
consumidor da sessão (`Perfil.tsx:39`) usa `user.id`, invariante à renovação; e a edição
mais provável — trocar o valor da opção — **é** detectada agora (M5a morre). Fecha barato:
asserir o terceiro argumento efetivamente recebido por `createClient`, e emitir
`TOKEN_REFRESHED` com uma sessão **diferente** em `AuthProvider.test.tsx:83`.

### D3 — AUTH-12 AC3 cobre leituras, não escritas · L4 · dívida registrada

`src/lib/query-client.ts:68-69` liga `aoFalharConsulta` só ao `QueryCache`; não há
`MutationCache`. A única escrita da feature, `atualizarPerfil`, ainda captura o erro ela
mesma (`profile-service.ts:48-51`) e devolve mensagem genérica — o 401 é engolido duas
vezes. Não bloqueante em `auth` (uma escrita, P2); vira relevante em `clients`.

### D4 — cadeia do AUTH-12 AC1/AC2 nunca percorrida de ponta a ponta · L7 · dívida registrada

As quatro peças têm teste; a composição não. Um E2E que invalide a sessão e dispare uma
leitura fecharia AC1 e AC2 de uma vez.

### D5 — edge case "perfil ilegível após o cadastro" · L5 · dívida registrada

**M10 sobrevive**, como previsto. `MenuDoUsuario.test.tsx:62` cobre a consulta pendente,
nunca a rejeitada. O comportamento atual está correto (`MenuDoUsuario.tsx:26` renderiza
`null`); falta o teste. Um caso com `buscar.mockRejectedValue(...)` fecha.

### D6 — edge case "sair numa aba reflete na outra" · L6 · dívida registrada

Zero ocorrências na busca. Provavelmente existe por `BroadcastChannel` do
`@supabase/auth-js`, mas é herdado e não verificado.

### D7 — escopo de linha da política de UPDATE de `profiles` é indistinguível · **novo** · benigno

**N5 sobrevive.** Alargar `profiles_update_own` para `using (true) with check (true)` não
derruba nada. Verifiquei no banco que a escrita cruzada **não** passa (`UPDATE 0`): a
política de SELECT a bloqueia. Não é brecha — é redundância que a suíte não consegue
enxergar, e o teste que parece cobri-la (`tests/rls/profile-service.test.ts:88`) na verdade
detecta a camada de SELECT. Fecha com um caso que leia a linha alheia com service role após
a tentativa.

### D8 — entrada `/reset-password` em `additional_redirect_urls` é indistinguível · **novo** · benigno

**N8 sobrevive**, com a mutação comprovadamente em vigor no contêiner do GoTrue. A entrada é
redundante enquanto `site_url` cobrir a origem. Torna-se carregadora se as duas divergirem
em produção, e aí nada notaria sua remoção.

### D9 — tabela de rastreabilidade do `spec.md` desatualizada · L8 · cosmético

`spec.md:186-200` ainda marca os 15 requisitos como `Phase: Design` / `Status: Pending`, e
`spec.md:202` afirma "15 total, 0 mapeados para tarefas", depois de Tasks e Execute terem
ocorrido.

---

## 8. Observações a favor da implementação

- **A correção de L1 é o padrão certo, não o mínimo.** Duas camadas que pegam a mesma
  mutação por razões diferentes: a unitária pela igualdade profunda do payload, a de pilha
  real pelo `42501` que o PostgREST devolve. N4 mostra que o alcance foi além do pedido — o
  teste novo também guarda a **migration**, derrubando o alargamento do grant.
- **A emenda de L3 foi validada por medição, não por argumento.** M8 prova que o texto
  anterior do spec quebrava o fluxo de recuperação num navegador real. Poucas emendas de
  spec chegam com essa qualidade de evidência.
- **O autor acrescentou o que não foi pedido.** `detectSessionInUrl` não estava na lacuna
  L2; N1 mostra que a opção é carregadora de verdade — desligá-la derruba o E2E de
  recuperação.
- **A asserção negativa segue sendo a marca da suíte.** `EsqueciSenha.test.tsx:69` assere
  que a frase errada **não** aparece; `RedefinirSenha.test.tsx:148` `expect(comLink).not.toBe(semLink)`
  assere que dois casos produzem mensagens **diferentes**; `profile-service.test.ts:80`
  assere que o payload **não** tem `email`. É o formato que detecta colapso, e não só
  presença.
- **A honestidade do registro se manteve.** O checkbox de T10 foi riscado com a anotação da
  revisão em vez de apagado, e a mensagem de `a3cebbf` admite a reincidência de L-001 sem
  suavizar: *"Em T3 eu havia aplicado a correção ao serviço de autenticação e não repeti aqui."*

---

## 9. Devolutiva

| | |
| --- | --- |
| **Veredito** | **PASS** |
| Gates | 5 de 5 (códigos de saída capturados diretamente) |
| Lacunas fechadas | **2 de 3 integralmente** (L1 e L3); **L2 parcialmente** |
| Mutações reaplicadas | M1, M2, M3 **morrem**; M5 morre na grafia da rodada 1 e **sobrevive** na equivalente; M10 **sobrevive** (dívida L5, esperado); sonda M8 morre com sinal correto |
| Mutações novas | 8 aplicadas · **3 sobreviveram** (N3 real porém latente; N5 e N8 benignas) |
| Requisitos com evidência real | **14 de 15** (era 13) — falta apenas o AUTH-12 AC5 |
| Edge cases com evidência | 3 de 6 (inalterado — dívida L5/L6) |
| Emendas ao spec | a de L3 é **legítima**, propagada ao texto normativo e comprovada por M8 no E2E |
| Dívida remanescente | D1–D9 · **nenhuma bloqueante** para autenticação |
| Árvore ao final | `git status --porcelain` vazio |

**Por que PASS.** A rodada 1 reprovou por afirmação não provada, e nomeou uma lacuna
bloqueante. Ela foi fechada de forma substantiva e verificável: as três mutações que
sobreviviam agora morrem, duas delas em camadas independentes, e a persistência do AUTH-14
AC3 está provada por releitura contra o banco real. A divergência de L3 — o caso em que a
suíte fixava o desacordo em vez de denunciá-lo — deixou de existir, e a emenda que a
resolveu é legítima pelo critério mais duro disponível: restaurar o texto anterior quebra o
fluxo num navegador real.

O que resta é dívida, e é dívida do tipo que a rodada 1 já havia classificado como não
bloqueante. O único item que eu gostaria de ver fechado antes de produção é **D2** — e o
digo com a severidade calibrada pela medição, não pela aparência: a renovação funciona, o
padrão da biblioteca está explícito, nenhum consumidor lê o token do contexto, e a edição
mais provável já é detectada. O que falta é prender a asserção ao cliente construído em vez
da constante, e fazer o teste de `TOKEN_REFRESHED` emitir uma sessão diferente. São duas
mudanças pequenas, e nenhuma delas justifica segurar a feature.
