# Auth — Relatório de Verificação Independente

**Result**: FAIL

> Verificador independente. O autor da implementação não participou deste relatório; a
> cobertura foi re-derivada do `spec.md`, e não do `tasks.md`.
>
> **O FAIL não é sobre comportamento quebrado.** O fluxo P1 do MVP funciona de ponta a
> ponta, os cinco gates passam, e nenhuma lacuna encontrada é brecha de segurança. O FAIL
> é sobre **afirmação não provada**: um critério declarado cumprido cuja metade de
> persistência não tem nenhuma evidência, um AC do spec com evidência zero, e uma
> divergência entre implementação e spec que a suíte de testes fixa em vez de denunciar.
> Detalhes em §5, ranqueados.

---

## 1. Faixa verificada e gates

**Faixa de diff**: `783f8e6~1..HEAD` (`2e4bf8a`) — 19 commits, 56 arquivos, +4499/−189.

Códigos de saída capturados **diretamente** (`cmd; echo $?`), nunca por pipe.

| Gate | Comando | Saída | Código |
| ---- | ------- | ----- | ------ |
| Lint | `npm run lint` | sem avisos | `0` |
| Typecheck | `npm run typecheck` | sem erros | `0` |
| Testes | `npm run test` | 232 unitários (25 arquivos); pgTAP — desfecho de todos os arquivos: PASS; 29 RLS (4 arquivos) | `0` |
| E2E | `npm run test:e2e` | 15 passaram | `0` |
| Build | `npm run build` | ok (aviso de tamanho de chunk, pré-existente) | `0` |

Pré-requisito: `npx supabase status` respondeu com a pilha local no ar (API 54321, DB 54322,
Mailpit 54324). `supabase_imgproxy` e `supabase_pooler` estão parados — nenhum dos dois é
usado por esta feature.

Árvore de trabalho ao final: `git status --porcelain` vazio.

---

## 2. Cobertura ancorada no spec

Regra aplicada: **evidência ou zero**. Uma célula só conta como coberta quando cita
`arquivo:linha` *e* reproduz a expressão da asserção. Onde declaro ausência, o comando de
busca está registrado em §2.3.

### 2.1 Requisitos AUTH-01 a AUTH-15

| Requisito / AC | `arquivo:linha` + expressão da asserção | Resultado esperado pelo spec | Coberto? |
| --- | --- | --- | --- |
| **AUTH-01** AC1 (envio válido cria usuário e vai a `/clients`) | `src/features/auth/pages/Cadastro.test.tsx:88` `expect(cadastrarMock).toHaveBeenCalledWith({…})` · `:103` `expect(router.state.location.pathname).toBe('/clients')` | usuário criado, redireciona a `/clients` com sessão | ✅ |
| AUTH-01 AC2 (confirmação divergente reporta no campo de confirmação, sem chamar o Supabase) | `src/features/auth/pages/Cadastro.test.tsx:69` `expect(confirmacao).toHaveAttribute('aria-describedby', erro.id)` · `:70` `expect(screen.getByLabelText('Senha')).not.toHaveAttribute('aria-invalid')` · `:71` `expect(cadastrarMock).not.toHaveBeenCalled()` | erro no campo de confirmação; Supabase não chamado | ✅ |
| AUTH-01 AC3 (senha < 8) | `src/features/auth/schemas.test.ts:76` mensagem `'A senha precisa de ao menos 8 caracteres'` · `src/features/auth/pages/Cadastro.test.tsx:79-80` `expect(cadastrarMock).not.toHaveBeenCalled()` | erro no campo de senha; Supabase não chamado | ✅ |
| AUTH-01 AC4 (e-mail inválido / nome vazio) | `src/features/auth/pages/Cadastro.test.tsx:56-59` `findByText('Informe seu nome completo')`, `getByText('Informe um e-mail válido')`, `expect(cadastrarMock).not.toHaveBeenCalled()` | erro no campo correspondente; sem chamada | ✅ |
| AUTH-01 AC5 (e-mail já existente preserva o digitado) | `src/features/auth/pages/Cadastro.test.tsx:115` `toHaveTextContent(/já possui conta/i)` · `:126-128` `expect(screen.getByLabelText('Nome completo')).toHaveValue('Joana Silva')` | orienta a entrar/recuperar; formulário preservado | ✅ |
| AUTH-01 AC6 (duplo envio impedido) | `src/features/auth/pages/Cadastro.test.tsx:154` `expect(botao).toBeDisabled()` · `:156` `expect(cadastrarMock).toHaveBeenCalledOnce()` · `src/components/ui/Botao.test.tsx` (estado de envio) | botão desabilitado, uma única tentativa | ✅ |
| AUTH-01 AC7 (falha de rede preserva formulário) | `src/features/auth/services/auth-service.test.ts:66` frase de rede ≠ credencial · `src/features/auth/pages/Cadastro.test.tsx:126-128` formulário preservado na recusa | mensagem temporária, formulário preservado | ⚠️ parcial — a frase de rede é asserida no serviço, não na tela de cadastro; "opção de tentar de novo" não é asserida em lugar nenhum (o botão apenas volta a ficar habilitado) |
| AUTH-01 AC8 (perfil existe antes de renderizar o CRM) | `tests/rls/auth-service.test.ts:58` `expect(data?.full_name).toBe('Bruno Trigger')` · `:59` `expect(data?.email).toBe(email)` | perfil garantido | ✅ — cumprido pelo trigger (AD-005), não por código de tela. Justificativa do autor (T12) é sólida e consistente com o edge case de perfil ilegível |
| **AUTH-02** (cadastro no Supabase, sessão imediata) | `tests/rls/auth-config.test.ts:60-61` `expect(error).toBeNull()`, `expect(data.session).not.toBeNull()` · `e2e/auth.spec.ts:33` `expect(page).toHaveURL(/\/clients$/)` | sessão sem confirmação de e-mail (AD-007) | ✅ |
| **AUTH-03** (e-mail existente e falha de rede) | `src/features/auth/services/auth-service.test.ts:83` `/já possui conta/i` · `:66` rede ≠ credencial · `:73,79` limite ≠ credencial · `tests/rls/auth-service.test.ts:72` `toMatch(/já possui conta/i)` | frases distintas por causa | ✅ |
| **AUTH-04** AC1-2 (login; frase genérica) | `src/features/auth/pages/Login.test.tsx:94` `toHaveTextContent('E-mail ou senha inválidos')` · `e2e/auth.spec.ts:148` `expect(comConta).toBe(semConta)` | mesma frase para e-mail inexistente e senha errada | ✅ — o E2E compara os dois casos reais, é a asserção mais forte da feature |
| AUTH-04 AC3 (restaura sessão ao reabrir) | `src/features/auth/AuthProvider.test.tsx:71` `expect(lido()).toBe('autenticado\|u1\|false')` · `e2e/auth.spec.ts:64` `expect(navegacoes.filter((url) => url.includes('/login'))).toEqual([])` | sessão restaurada sem pedir credenciais | ✅ |
| AUTH-04 AC4 (sair encerra, limpa cache, vai a `/login`) | `src/features/auth/AuthProvider.test.tsx:99-105` `expect(limpar).toHaveBeenCalled()` e `expect(lido()).toBe('anonimo\|sem-sessao\|false')` · `e2e/auth.spec.ts:43` `expect(page).toHaveURL(/\/login/)` | sessão encerrada, cache descartado, `/login` | ✅ |
| AUTH-04 AC5 (botão desabilitado durante autenticação) | `src/features/auth/pages/Login.test.tsx:168-169` `expect(botao).toBeDisabled()`, `toHaveAttribute('aria-busy', 'true')` · `:172` `toHaveBeenCalledOnce()` | desabilita e anuncia progresso | ✅ |
| AUTH-04 AC6 (autenticado em `/login`, `/signup`, `/forgot-password`, **`/reset-password`** → `/clients`) | `src/features/auth/components/RotaPublica.test.tsx:51-52` e `:87` `expect(screen.getByText('listagem de clientes')).toBeInTheDocument()` — **apenas para `/login` e `/signup`**. Para `/reset-password` a asserção é a **oposta**: `:102` `it('nunca redireciona a rota de redefinição, qualquer que seja a sessão')`, `:107` `expect(screen.getByText('formulário de nova senha')).toBeInTheDocument()` | redirecionar **as quatro** rotas | ❌ **divergência** — ver §5 L3 |
| AUTH-04 AC7 (falha de rede ≠ credencial) | `src/features/auth/services/auth-service.test.ts:66` `traduzirErro({ status: undefined })` devolve a frase de rede | frase distinta | ✅ (nível de serviço) |
| **AUTH-05** (restauração entre visitas) | `src/features/auth/AuthProvider.test.tsx:65` `expect(lido()).toBe('anonimo\|sem-sessao\|false')`, `:71` autenticado · `e2e/auth.spec.ts:49-64` | `INITIAL_SESSION` encerra o carregamento | ✅ — M4 (§3) confirma que o E2E discrimina |
| **AUTH-06** (logout + limpeza de cache) | `src/features/auth/AuthProvider.test.tsx:103` `expect(limpar).toHaveBeenCalled()` · `src/features/auth/services/auth-service.test.ts:198` `it('encerra a sessão')` · `src/features/auth/components/MenuDoUsuario.test.tsx:78` `expect(sairMock).toHaveBeenCalledOnce()` | encerra, descarta cache, redireciona | ✅ — M9 (§3) morre em 1 unitário + 5 E2E |
| **AUTH-07** AC1-2 (solicitação com resposta neutra) | `src/features/auth/pages/EsqueciSenha.test.tsx:74` `toHaveTextContent(/se houver uma conta/i)` · `:75` `expect(confirmacao.textContent).not.toMatch(/enviamos para você\|conta encontrada\|não existe/i)` · `src/features/auth/services/auth-service.test.ts:158` devolve `ok` mesmo com recusa do servidor · `:54` `expect(pedirMock).toHaveBeenCalledWith(…)` com a URL de retorno | confirmação idêntica com e sem conta; link aponta para `/reset-password` | ✅ — a asserção negativa em `:75` é o que dá força real ao critério |
| **AUTH-08** AC3-4 (sessão de recuperação, nova senha, `/clients`) | `src/features/auth/pages/RedefinirSenha.test.tsx:81` `expect(redefinirMock).toHaveBeenCalledWith('nova-senha-123')` · `:83` `expect(router.state.location.pathname).toBe('/clients')` · `e2e/auth.spec.ts:110-127` (link real do Mailpit, senha antiga deixa de valer) | reconhece a recuperação, atualiza e autentica | ✅ — o E2E com link real é a evidência mais completa do relatório |
| AUTH-08 AC5 (link expirado/usado explica e oferece caminho) | `src/features/auth/pages/RedefinirSenha.test.tsx:144` `expect(aviso).toHaveTextContent(/este link expirou/i)` · `:145` `not.toHaveTextContent(/abra o link que enviamos/i)` · `:164` `expect(comLink).not.toBe(semLink)` | mensagem explica o motivo + caminho para novo link | ✅ — `:164` assere que as duas situações produzem frases **diferentes**, não só que cada uma produz a sua |
| AUTH-08 AC6 (senha curta/divergente não chama o Supabase) | `src/features/auth/pages/RedefinirSenha.test.tsx:61-62` e `:70-74` `expect(redefinirMock).not.toHaveBeenCalled()` | erro no campo, sem chamada | ✅ |
| AUTH-08 AC7 (acesso direto sem sessão de recuperação) | `src/features/auth/pages/RedefinirSenha.test.tsx:125` `expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()` · `:126` `toHaveTextContent(/abra o link que enviamos/i)` · `e2e/auth.spec.ts:132-133` | orientação para pedir link em `/forgot-password` | ✅ |
| **AUTH-09** AC1 (carregando: nem privado nem login) | `src/features/auth/components/RotaProtegida.test.tsx:47` `expect(screen.queryByText('listagem privada')).not.toBeInTheDocument()` · `:48` `expect(screen.queryByTestId('login')).not.toBeInTheDocument()` · `:53` `expect(screen.getByRole('status')).toHaveTextContent(/verificando sua sessão/i)` | estado de carregamento visível, nada decidido | ✅ — dois testes separados (nada renderiza / há progresso) evitam o defeito de tela em branco |
| AUTH-09 AC2 (visitante em rota privada vai ao login) | `src/features/auth/components/RotaProtegida.test.tsx:63-64` · `src/app/router.test.tsx:54` rotas de CRM sob `RotaProtegida` · `:72` **não** sob `RotaPublica` | redireciona preservando a rota | ✅ |
| AUTH-09 AC4 (rotas públicas acessíveis sem sessão) | `src/app/router.test.tsx:60` as quatro rotas sob `RotaPublica` · `src/features/auth/components/RotaPublica.test.tsx:46` `expect(screen.getByText('formulário de login')).toBeInTheDocument()` | quatro rotas acessíveis | ✅ |
| AUTH-09 AC5 (rota inexistente) | `src/app/router.test.tsx:92,97` · `e2e/smoke.spec.ts:23` | página de não encontrado com volta ao CRM | ✅ |
| **AUTH-10** AC2-3 (preserva e devolve à rota pretendida) | `src/features/auth/components/RotaProtegida.test.tsx:69` `toHaveTextContent('destino:/clients/123')` · `:81` `toHaveTextContent(\`destino:${pedida}\`)` (query preservada sem reinterpretação) · `:86` `'destino:/clients/123#notas'` · `src/features/auth/pages/Login.test.tsx:77` `expect(router.state.location.pathname).toBe('/clients/123')` · `src/features/auth/components/RotaPublica.test.tsx:71` · `e2e/auth.spec.ts:74,77` | caminho, query e fragmento preservados; retorno à rota pretendida | ✅ — M6 (§3) morre em 2 testes |
| AUTH-10 (redirecionamento aberto — **acrescentado pelo autor**) | `src/features/auth/destino.test.ts:18,24,28,32` · `src/features/auth/pages/Login.test.tsx:86` · `e2e/auth.spec.ts:90` | não previsto no spec | ✅ — acréscimo legítimo e bem coberto |
| **AUTH-11** (rotas públicas redirecionam quando autenticado) | `src/features/auth/components/RotaPublica.test.tsx:51-52,87,92,116,122` | ver AUTH-04 AC6 | ⚠️ coberto para 3 das 4 rotas; `/reset-password` diverge — §5 L3 |
| **AUTH-12** AC1 (limpa cache, exibe "Sua sessão expirou", redireciona preservando a rota) | `src/lib/query-client.test.ts:113` `expect(consumirSessaoExpirada()).toBe(true)` (+ `signOut` chamado) · `src/features/auth/AuthProvider.test.tsx:103` `expect(limpar).toHaveBeenCalled()` · `src/features/auth/pages/Login.test.tsx:135` `expect(aviso).toHaveTextContent(/sua sessão expirou/i)` · `RotaProtegida.test.tsx:69` preserva a rota | mensagem + limpeza + redirecionamento com rota preservada | ⚠️ as três peças são asseridas **isoladamente**; nenhum teste percorre a cadeia 401 → `signOut` → `SIGNED_OUT` → guarda → `/login?redirect=` |
| AUTH-12 AC2 (após autenticar volta à rota preservada) | `e2e/auth.spec.ts:77` `expect(page).toHaveURL(/\/profile$/)` — mas pelo caminho do **visitante anônimo**, não pelo da expiração | volta à rota preservada após expiração | ⚠️ evidência é do AUTH-10, não do AUTH-12 |
| AUTH-12 AC3 (401/403 → sessão expirada) | `src/lib/query-client.test.ts:66` `expect(ehSessaoExpirada({ status: 401 })).toBe(true)` · `:70` `403` · `:110` `it('encerra a sessão e sinaliza a expiração em um 401')` | **qualquer requisição** com 401/403 | ⚠️ **apenas leituras** — `QueryCache.onError` é a única ligação; não existe `MutationCache` (§5 L4) |
| AUTH-12 AC4 (`42501` = permissão, não expiração) | `src/lib/query-client.test.ts:77` `expect(ehSessaoExpirada({ code: '42501' })).toBe(false)` · `:87` `it('o 42501 não é repetido, mas também não encerra a sessão')` · `:116` `it('não encerra a sessão em um 42501')` | não encerra a sessão | ✅ para a metade negativa. A metade positiva — "erro de permissão **na tela que a originou**" — não tem consumidor em `auth` |
| AUTH-12 AC5 (renovação automática da sessão) | **nenhuma** | renova enquanto o refresh token valer | ❌ **evidência zero** — M5 (§3) sobrevive |
| **AUTH-13** AC1 (exibe nome, e-mail e telefone de `profiles`) | `src/features/auth/pages/Perfil.test.tsx:65-67` `toHaveValue('Joana Silva')`, `toHaveValue('joana@exemplo.com')`, `toHaveValue('11987654321')` | três campos vindos de `profiles` | ⚠️ o módulo que lê `profiles` é **mockado**; a leitura real nunca é exercida (§5 L1) |
| AUTH-13 AC2 (e-mail somente leitura, com indicação) | `src/features/auth/pages/Perfil.test.tsx:77` `expect(email).toHaveAttribute('readonly')` · `:78` `expect(email).not.toBeDisabled()` · `:87` `toHaveAttribute('aria-describedby', dica.id)` | somente leitura, com aviso | ✅ — a asserção separa `readOnly` de `disabled`, que são dois defeitos diferentes |
| **AUTH-14** AC3 (salvar persiste e confirma) | `src/features/auth/pages/Perfil.test.tsx:99` `expect(atualizar).toHaveBeenCalledWith({…})` · `:98` `toHaveTextContent(/informações foram salvas/i)` | **persistir** em `profiles` + confirmação | ❌ a asserção prova que a tela **pede** a persistência, não que ela ocorre. Nenhum teste, em nenhuma camada, exercita `atualizarPerfil` — §5 L1, M1/M2/M3 sobrevivem |
| AUTH-14 AC4 (nome vazio ou > 120) | `src/features/auth/pages/Perfil.test.tsx:136-137` e `:148-149` `expect(atualizar).not.toHaveBeenCalled()` · `src/features/auth/schemas.test.ts:68` | erro no campo, sem envio | ✅ |
| AUTH-14 AC5 (reflete no cabeçalho sem recarregar) | `src/features/auth/pages/Perfil.test.tsx:176` `expect(invalidar).toHaveBeenCalledWith({ queryKey: ['perfil'] })` · `src/features/auth/components/MenuDoUsuario.test.tsx:106` `it('lê o perfil pela chave compartilhada com a tela de perfil')` | nome novo no cabeçalho sem recarregar | ✅ (chave compartilhada provada dos dois lados) |
| **AUTH-15** (cabeçalho com nome e ação de sair) | `src/features/auth/components/MenuDoUsuario.test.tsx:59` `expect(await screen.findByText('Joana Silva'))` · `:65` botão Sair presente · `e2e/auth.spec.ts:35` `expect(page.getByRole('link', { name: 'Joana E2E' })).toBeVisible()` | nome + sair no cabeçalho | ✅ |

**Placar**: **13 dos 15 requisitos têm evidência real e suficiente.** Dois não têm:
**AUTH-12** (AC5 com evidência zero; AC3 coberto só para leituras) e **AUTH-14**
(o AC3 de persistência não tem evidência em camada nenhuma). Somam-se a
**AUTH-11 / AUTH-04 AC6**, cuja cobertura existe mas fixa o comportamento **oposto** ao que
o spec escreve.

### 2.2 Edge Cases

A seção que o spec lista explicitamente, item a item.

| Edge case | Evidência | Coberto? |
| --- | --- | --- |
| Envio duplo do login processa uma tentativa | `src/features/auth/pages/Login.test.tsx:168` `expect(botao).toBeDisabled()` · `:172` `expect(entrarMock).toHaveBeenCalledOnce()` · `src/components/ui/Botao.test.tsx` (a prevenção mora no componente) | ✅ |
| Limite de requisições excedido, frase distinta de credencial | `src/features/auth/services/auth-service.test.ts:73` `it('distingue limite de tentativas de credencial inválida')` · `:79` `it('reconhece limite pelo status 429 mesmo sem código conhecido')` | ✅ (serviço; a tela apenas renderiza `resultado.mensagem`) |
| Sair em uma aba reflete na outra na próxima interação | **nenhuma** — `grep -rn "outra aba\|localStorage\|'storage'" src tests e2e` → 0 ocorrências | ❌ sem evidência. O `@supabase/auth-js` sincroniza por `BroadcastChannel` (`node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:274`), então o comportamento provavelmente existe — mas é herdado, não verificado, e ninguém notaria se sumisse |
| Link de redefinição aberto em outro navegador | **nenhuma** — `e2e/auth.spec.ts:110` usa o mesmo contexto de navegador | ❌ sem evidência. Risco baixo: o token vem no próprio link |
| E-mail com espaços ou maiúsculas é normalizado | `src/features/auth/schemas.test.ts:33` `it('apara e converte o e-mail para minúsculas')` · `:116` · `src/features/auth/pages/Login.test.tsx:58` `expect(entrarMock).toHaveBeenCalledWith({…})` · `src/features/auth/pages/EsqueciSenha.test.tsx:63` `expect(pedirMock).toHaveBeenCalledWith('joana@exemplo.com', …)` | ✅ |
| Cadastro ok mas leitura do perfil falha → mantém sessão e exibe o CRM | `src/features/auth/components/MenuDoUsuario.test.tsx:63` cobre a consulta **pendente** (`buscar.mockReturnValue(new Promise(() => {}))`), nunca a **rejeitada** | ❌ sem evidência para o caso que o spec descreve — M10 (§3) sobrevive |

**3 dos 6 edge cases sem evidência.** O terceiro deles é o mais relevante: é o único
edge case que o spec expressa como garantia de continuidade de sessão.

### 2.3 Comandos de busca usados antes de declarar ausência

```
grep -rn "autoRefreshToken|TOKEN_REFRESHED|persistSession" src tests e2e
grep -rn "outra aba|localStorage|'storage'" src tests e2e
grep -rn "profile-service" src tests e2e
grep -rn "MutationCache|mutationCache" src
ls -la src/features/auth/services/
```

O terceiro devolve **apenas importações e mocks** — `src/app/router.test.tsx:11`,
`src/features/auth/components/MenuDoUsuario.test.tsx:13`,
`src/features/auth/pages/Perfil.test.tsx:16` — todas na forma
`vi.mock('.../profile-service', …)`. O quinto confirma que
`src/features/auth/services/` contém `auth-service.ts`, `auth-service.test.ts` e
`profile-service.ts`, **sem `profile-service.test.ts`**. O quarto não devolve nada.

### 2.4 Lacunas de precisão do spec

Casos em que o spec não define resultado suficientemente preciso para julgar a
implementação — não são falhas do autor:

1. **AUTH-01 AC7 / AUTH-04 AC7** dizem "com opção de tentar de novo" sem definir o que
   constitui essa opção. A implementação apenas reabilita o botão. Nada a corrigir, mas
   nada verificável tampouco.
2. **AUTH-12 AC4** diz "erro de permissão **na tela que a originou**" sem que exista, em
   `auth`, uma tela capaz de originar `42501`. O critério só se torna testável em `clients`.
3. **AUTH-12 AC5** ("renovar automaticamente") não define observável algum — nem janela,
   nem evento, nem efeito visível. É parte da razão de a evidência ser zero (§5 L2).
4. A tabela **Requirement Traceability** do `spec.md:183-201` ainda diz `Phase: Design` e
   `Status: Pending` para os 15 requisitos, e `spec.md:201` afirma "15 total, 0 mapeados
   para tarefas". Ficou para trás depois de Tasks e Execute.

---

## 3. Sensor de discriminação

10 mutações, todas em áreas **não sondadas** pelo autor — o `tasks.md` registra 68 sondas
dele, nenhuma em `profile-service.ts`, em `src/lib/supabase.ts`, na codificação da rota
pretendida, no efeito colateral de `aoFalharConsulta` ou no tratamento de erro do
cabeçalho.

Método: substituição de **bloco inteiro** de função (nunca linha isolada — foi o que
produziu a leitura falsa do autor em T5), confirmação por leitura do arquivo após aplicar,
reversão com `git checkout -- <arquivo>` (nunca `git stash`), e medição pelo **código de
saída e pela contagem de falhas**, não por linhas soltas de log.

| # | Arquivo | Mutação | Gates rodados | Morreu? | Quem pegou |
| --- | --- | --- | --- | --- | --- |
| **M1** | `src/features/auth/services/profile-service.ts:41-46` | `atualizarPerfil` deixa de escrever `phone` — payload vira `{ full_name }` | typecheck `0`, unit `0`, rls `0`, e2e `0` | ❌ **sobrevive** | ninguém |
| **M2** | `src/features/auth/services/profile-service.ts:43` | `atualizarPerfil` passa a escrever `email: 'sequestrado@exemplo.com'` — coluna fora do grant (AD-008/AD-014) | typecheck `0`, unit `0`, rls `0`, e2e `0` | ❌ **sobrevive** | ninguém |
| **M3** | `src/features/auth/services/profile-service.ts:22-26` | `buscarPerfil` troca `.single()` por `.maybeSingle()` e engole o erro, devolvendo um perfil vazio fabricado | typecheck `0`, unit `0`, rls `0`, e2e `0` | ❌ **sobrevive** | ninguém |
| **M4** | `src/lib/supabase.ts:16` | `createClient(…, { auth: { persistSession: false } })` — sessão deixa de sobreviver ao recarregamento | unit `0`, **e2e `1`** (1 falhou / 14 passaram) | ✅ morre | `e2e/auth.spec.ts:49` `recarregar uma rota privada autenticado nunca passa pelo login` |
| **M5** | `src/lib/supabase.ts:16` | `createClient(…, { auth: { autoRefreshToken: false } })` — renovação automática desligada | typecheck `0`, unit `0`, rls `0`, e2e `0` | ❌ **sobrevive** | ninguém — é o AUTH-12 AC5 |
| **M6** | `src/features/auth/components/RotaProtegida.tsx:27-30` | remove `encodeURIComponent` da rota pretendida | **unit `1`** (2 falharam / 230 passaram) | ✅ morre | `RotaProtegida.test.tsx:74` `preserva também os parâmetros de consulta, sem reinterpretá-los` e `:84` `preserva o fragmento` |
| **M7** | `src/lib/query-client.ts:48-54` | `aoFalharConsulta` marca a expiração mas **não** chama `supabase.auth.signOut()` | **lint `1`**, **unit `1`** (1 falhou / 231 passaram) | ✅ morre | `query-client.test.ts:110` `encerra a sessão e sinaliza a expiração em um 401` (+ o lint pega o import órfão) |
| **M8** | `src/features/auth/components/RotaPublica.tsx:36` | **sonda de conformidade**: restaura o comportamento que o spec `:89` e a emenda `:47` descrevem — `/reset-password` redireciona quando autenticado **sem** a marca de recuperação | typecheck `0`, **unit `1`** (1 falhou / 231 passaram) | ✅ morre — e é exatamente o problema | `RotaPublica.test.tsx:102` `nunca redireciona a rota de redefinição, qualquer que seja a sessão` |
| **M9** | `src/features/auth/services/auth-service.ts:90-92` | `sair()` vira no-op (`await Promise.resolve()`) | **unit `1`** (1 falhou), **e2e `1`** (5 falharam / 10 passaram) | ✅ morre com folga | `auth-service.test.ts:198` `encerra a sessão` + 5 testes de `e2e/auth.spec.ts` |
| **M10** | `src/features/auth/components/MenuDoUsuario.tsx:22` | consulta do perfil ganha `throwOnError: true` — uma leitura de perfil que falhe passa a derrubar o CRM para a fronteira de erro | typecheck `0`, unit `0`, e2e `0` | ❌ **sobrevive** | ninguém — é o edge case de perfil ilegível |

**Placar: 5 mortas, 5 sobreviventes.** Tudo revertido; `git status --porcelain` vazio ao final.

Sobre **M8**: ela "morre", mas o sinal é invertido. Um teste falhar quando eu restauro o
comportamento **que o spec descreve** significa que a suíte não é neutra a respeito da
divergência — ela a fixa. É a evidência mais limpa de §5 L3.

Sobre **M2**: o grant é `grant update (full_name, phone) on public.profiles to authenticated`
(`supabase/migrations/20260915174330_profiles.sql:36`). Em produção a mutação faria **todo**
salvamento de perfil devolver `42501`, e o consultor veria "Não foi possível salvar agora"
para sempre. Cinco gates, 276 testes, e nenhum percebe. É a recorrência literal da
**L-001** do `LESSONS.md` — quando o grant cobre o caso, o teste comportamental desaparece.

---

## 4. Emendas ao spec — julgamento

O autor emendou o spec em dois pontos durante o Design. Julgo cada uma.

### 4.1 AUTH-12 AC3 — `42501` versus 401/403 (`spec.md:46`) → **emenda legítima**

Veredito: **legítima, e é uma correção de fato, não um afrouxamento.**

Três razões. Primeiro, a emenda **aperta** o requisito em vez de relaxá-lo: obriga o
sistema a distinguir dois erros que a redação original tratava como um. Segundo, a razão
técnica é verificável e correta — `42501` é o SQLSTATE que o PostgREST devolve para "esta
linha não é sua", com sessão válida; tratá-lo como expiração derrubaria o consultor por um
erro legítimo, já coberto por teste na `foundation`. Terceiro, e decisivo: a emenda foi
**propagada** para o corpo do spec. O `spec.md:144-145` já traz AC3 e AC4 como critérios
separados e explícitos. A emenda não vive só na tabela de premissas; ela mudou o texto
normativo. É o padrão que a **L-008** pede.

Custo: a implementação paga com duas funções quase idênticas (`ehErroDeAutorizacao` e
`ehSessaoExpirada`), e o autor documentou o porquê em `src/lib/query-client.ts:33-34`.
Aceito.

### 4.2 Marca de recuperação (`spec.md:47`) → **legítima como escrita, mas a implementação a ultrapassou e o spec não acompanhou**

Veredito: **a emenda é legítima; o que foi construído não é o que ela diz.**

A emenda, como redigida, é necessária e bem raciocinada: o link de recuperação
**autentica** o usuário, então sem distinguir "autenticado por link" de "autenticado
normalmente" a regra do AUTH-11 expulsaria o consultor da própria tela de redefinir senha.
Não há caminho mais barato. Legítima.

Mas o texto da emenda delimita a exceção com precisão: *"enquanto a marca vale,
`/reset-password` é acessível e a regra de redirecionamento não se aplica"*. **Enquanto a
marca vale.** A implementação em `src/features/auth/components/RotaPublica.tsx:36` não
consulta a marca:

```ts
if (estado === 'autenticado' && local.pathname !== ROTA_DE_REDEFINICAO) {
```

A exceção é **incondicional**. Uma sessão comum, sem marca alguma, também não é
redirecionada de `/reset-password` — contrariando tanto o `spec.md:89` (AUTH-04 AC6, que
lista `/reset-password` entre as quatro rotas) quanto a própria emenda do `spec.md:47`.

A trajetória está registrada e é honesta: o `tasks.md` T10 marca `[x] Autenticado
normalmente, sem a marca, /reset-password também redireciona` — o comportamento
**conforme o spec**; e T18 relata a descoberta da corrida `INITIAL_SESSION` antes de
`PASSWORD_RECOVERY`, a releitura do AUTH-08 AC7, a simplificação da guarda e a correção do
teste unitário que codificava a leitura anterior. O raciocínio de T18 é bom, a corrida é
real, e a solução é defensável.

**O que não aconteceu foi emendar o spec.** O checkbox de T10 ficou marcado afirmando
exatamente o oposto do que o código faz. O `spec.md:89` continua listando quatro rotas. A
emenda do `spec.md:47` continua dizendo "enquanto a marca vale". A suíte fixa a terceira
versão. Três documentos, três comportamentos.

Isto **não** é mover a trave — não houve ganho de conveniência, e a mudança tornou o
sistema mais correto sob o AUTH-08 AC7. É a **L-008 reincidindo**: *"Ao remover algo que o
spec exige, emende o spec na mesma tarefa"*. A `foundation` registrou essa lição por causa
do índice removido em T24; aqui ela reaparece em `auth` com outro objeto. Pela regra de
promoção do `LESSONS.md` (`promote_threshold=2` features distintas), esta segunda
ocorrência qualifica **L-008 para Confirmed**.

---

## 5. Lacunas ranqueadas

Ranqueadas por risco para uma feature de **autenticação**, com o julgamento de bloqueio
explícito.

### L1 — `profile-service.ts` não tem teste nenhum; AUTH-14 AC3 está declarado cumprido sem evidência de persistência · **BLOQUEANTE**

`src/features/auth/services/profile-service.ts` é um serviço de feature com 54 linhas e
**nenhum arquivo de teste**. `ls -la src/features/auth/services/` mostra `auth-service.ts`,
`auth-service.test.ts` e `profile-service.ts`. Todos os três consumidores o **mockam**
(`router.test.tsx:11`, `MenuDoUsuario.test.tsx:13`, `Perfil.test.tsx:16`), e o E2E nunca
edita um perfil.

Consequências medidas: **M1, M2 e M3 sobrevivem aos cinco gates.** M2 é a mais severa —
escrever uma coluna fora do grant quebraria **todo** salvamento de perfil em produção, sem
que nenhum dos 276 testes notasse.

Isso viola a **Test Coverage Matrix declarada pelo próprio projeto** (`tasks.md:23`):

> `Serviços de feature | unit | Caminho de sucesso mais cada erro traduzido […] | src/features/**/services/*.test.ts`

E torna insustentável o checkbox de T15 `[x] Salvar nome ou telefone persiste e exibe
confirmação`. A asserção que existe — `Perfil.test.tsx:99`
`expect(atualizar).toHaveBeenCalledWith({…})` — prova que a tela **pede** a persistência.
Nada prova que ela ocorre. Para `phone` em particular não há evidência em camada alguma:
nem unitária, nem RLS, nem E2E (o teste da `foundation` em
`tests/rls/notes-profiles-error-logs.test.ts:136-143` atualiza `full_name` diretamente,
sem passar por `atualizarPerfil`, e não toca em `phone`).

Por que bloqueante numa feature de autenticação, mesmo sendo AUTH-14 um P2: não é o peso
do requisito, é o **tipo da afirmação**. Um critério marcado como cumprido cujo mecanismo
não é exercido em nenhum lugar é precisamente o que esta etapa existe para barrar. E o
custo de fechar é baixo — um `profile-service.test.ts` com mock do cliente, mais um caso
contra a pilha real em `tests/rls/` que salve nome e telefone e releia.

### L2 — AUTH-12 AC5 (renovação automática da sessão) com evidência zero · **não bloqueante, fechar antes de produção**

`grep -rn "autoRefreshToken|TOKEN_REFRESHED|persistSession" src tests e2e` devolve, em
código de produção, **nada**. `src/lib/supabase.ts:16` chama `createClient` sem opções de
`auth`; a renovação existe por padrão da biblioteca. **M5 sobrevive** aos cinco gates.

`AuthProvider.test.tsx:88` emite `TOKEN_REFRESHED`, mas o que ele assere é a **preservação
da marca de recuperação** (`:89` `expect(lido()).toBe('autenticado|u1|true')`), não que a
sessão se renova.

Não bloqueante porque o comportamento correto é o padrão da biblioteca e funciona. Mas é um
AC do spec com evidência zero, e um `persistSession`/`autoRefreshToken` explicitamente
desligado por engano passaria por toda a suíte — M4 mostra que o E2E pega o primeiro,
M5 mostra que nada pega o segundo. Nota: §2.4.3 registra que o spec não define observável
para este AC, o que é parte do problema.

### L3 — `/reset-password` não é redirecionado para sessão autenticada; spec não foi emendado · **não bloqueante, mas precisa de decisão documentada**

Detalhado em §4.2. Resumo: `RotaPublica.tsx:36` isenta `/reset-password` do
redirecionamento **incondicionalmente**; o `spec.md:89` exige o redirecionamento e a
emenda do `spec.md:47` o isenta apenas "enquanto a marca vale"; o checkbox `tasks.md` T10
afirma o comportamento conforme o spec; e `RotaPublica.test.tsx:102` fixa o terceiro
comportamento (**M8** prova).

Efeito prático: um consultor autenticado que digite `/reset-password` vê "Abra o link que
enviamos por e-mail" em vez de ir para `/clients`. Incômodo pequeno, sem risco de dados.

Não bloqueante como comportamento; **é** bloqueante como registro. A saída correta é uma
frase: emendar o `spec.md:89` e o `spec.md:47` para dizer que `/reset-password` nunca é
redirecionada e que a tela decide o que exibir, e desmarcar o checkbox de T10. **L-008
reincide — qualifica para Confirmed.**

### L4 — AUTH-12 AC3 cobre leituras, não escritas · **não bloqueante, mas é a lacuna mais provável de virar defeito real**

`src/lib/query-client.ts:68-79` liga `aoFalharConsulta` apenas ao `QueryCache`.
`grep -rn "MutationCache|mutationCache" src` não devolve nada, e `mutations` só define
`retry: false`. O AC3 diz "**uma requisição** ao Supabase falhar com status HTTP 401 ou
403" — uma escrita é uma requisição.

Agrava-se: a única escrita da feature, `atualizarPerfil`
(`src/features/auth/services/profile-service.ts:48-51`), **captura o erro ela mesma** e
devolve `{ ok: false, mensagem: 'Não foi possível salvar agora…' }`. O 401 é engolido duas
vezes. O consultor com sessão expirada que tenta salvar o perfil vê uma mensagem de falha
temporária genérica e permanece numa tela que não funciona mais, sem a mensagem "Sua
sessão expirou" e sem ser levado ao login.

Não bloqueante hoje porque `auth` tem uma única escrita e ela é P2. Vira relevante em
`clients`, que é quase só escrita.

### L5 — edge case "perfil ilegível após o cadastro" sem evidência · **não bloqueante**

O `spec.md:177` exige: *"IF o cadastro der certo mas a leitura do perfil falhar THEN o
sistema SHALL manter a sessão e SHALL exibir o CRM em vez de derrubar o consultor para o
login"*. `MenuDoUsuario.test.tsx:63` cobre a consulta **pendente**
(`buscar.mockReturnValue(new Promise(() => {}))`), nunca a **rejeitada**. **M10 sobrevive**:
`throwOnError: true` na consulta do perfil derrubaria o CRM para a fronteira de erro e
passa por unit, typecheck e E2E sem um arranhão.

O comportamento atual está correto (`MenuDoUsuario.tsx:26` renderiza `null` no lugar do
nome). Falta o teste que o sustente. Um caso com `buscar.mockRejectedValue(...)` asserindo
que o botão Sair continua presente fecha a lacuna.

### L6 — edge case "sair em uma aba reflete na outra" sem evidência · **não bloqueante**

Zero ocorrências na busca. O comportamento provavelmente existe por `BroadcastChannel` do
`@supabase/auth-js`, mas é herdado e não verificado. Um segundo contexto de navegador no
Playwright fecharia isso.

### L7 — AUTH-12 AC1/AC2 provados por partes, nunca em cadeia · **não bloqueante**

As quatro peças — classificar o 401, marcar, limpar o cache, preservar a rota — têm cada
uma seu teste. A composição, não. É a mesma classe de lacuna que o E2E fechou em T18 para
duas corridas reais que 232 testes unitários não viam. Um E2E que invalide a sessão e
dispare uma leitura fecharia AC1 e AC2 de uma vez.

### L8 — tabela de rastreabilidade do `spec.md` desatualizada · **não bloqueante, cosmético**

`spec.md:183-201` ainda marca os 15 requisitos como `Phase: Design` / `Status: Pending`, e
`spec.md:201` afirma "0 mapeados para tarefas".

---

## 6. Observações a favor da implementação

Registro o que encontrei de forte, para o relatório não ser lido como uma lista de defeitos.

- **A discrição das mensagens é a parte mais bem verificada da feature.** `EsqueciSenha.test.tsx:75`
  assere que a frase errada **não** aparece (`not.toMatch(/enviamos para você|conta encontrada|não existe/i)`),
  e `e2e/auth.spec.ts:148` compara as duas respostas reais (`expect(comConta).toBe(semConta)`).
  Asserção negativa mais comparação em navegador real: é o padrão certo.
- **O teste do piscar não olha estado final.** `e2e/auth.spec.ts:57-64` observa
  `framenavigated` e assere que nenhuma navegação foi para `/login`. Um requisito
  "nem por um instante" não se verifica de outro jeito. M4 confirma que discrimina.
- **`RedefinirSenha.test.tsx:164` `expect(comLink).not.toBe(semLink)`** assere que dois
  casos produzem mensagens **diferentes**, e não que cada um produz a sua. É a forma que
  detecta o colapso das duas mensagens em uma.
- **`Perfil.test.tsx:77-78`** separa `readOnly` de `disabled` em duas asserções. São dois
  defeitos distintos e a suíte não os confunde.
- **`router.test.tsx:54` e `:72`** verificam cada rota positiva e negativamente, sobre a
  árvore real exportada. Detecta rota aninhada sob ambas as guardas, que compila e roda.
- **`destinoSeguro`** é um acréscimo do autor, não pedido pelo spec, fechando um
  redirecionamento aberto real. Coberto em três camadas (`destino.test.ts:18-32`,
  `Login.test.tsx:86`, `e2e/auth.spec.ts:90`).
- **A elevação de camada de teste em T3**, com demonstração de que 86 testes unitários
  ficavam cegos à forma da API, é exatamente o raciocínio que o Verifier deveria precisar
  fazer — e foi feito na origem.

---

## 7. Devolutiva

| | |
| --- | --- |
| **Veredito** | **FAIL** |
| Gates | 5 de 5 passam (códigos de saída capturados diretamente) |
| Requisitos com evidência real | **13 de 15** (faltam AUTH-12 e AUTH-14; AUTH-11 coberto, mas fixando comportamento contrário ao spec) |
| Edge cases com evidência | 3 de 6 |
| Mutações | 10 aplicadas · **5 sobreviveram** (M1, M2, M3, M5, M10) |
| Emendas ao spec | 1 legítima e propagada (42501); 1 legítima na redação mas ultrapassada pela implementação sem emenda correspondente (marca de recuperação) |
| Lição a promover | **L-008** reincide em segunda feature — qualifica para *Confirmed*. **L-001** reincide em M2 |
| Árvore ao final | `git status --porcelain` vazio |

**Caminho mais curto para PASS**: fechar **L1** (um `profile-service.test.ts` mais um caso
contra a pilha real que salve nome e telefone e releia — mata M1, M2 e M3), fechar **L2**
(fixar a configuração de sessão do cliente por asserção — mata M5), e emendar o spec em
**L3** (duas frases em `spec.md:47` e `spec.md:89`, mais o checkbox de T10). L4 a L8
podem ir para débito registrado, como a `foundation` fez com os seus sete.
