# Auth Specification

## Problem Statement

Sem identidade, a RLS construída em `foundation` não tem a quem responder: `auth.uid()` retorna nulo e todas as tabelas ficam inacessíveis. O consultor precisa criar conta, entrar, sair e recuperar a senha sozinho — o PLAN §6 é explícito em incluir recuperação de senha no MVP justamente para que o produto não dependa de intervenção manual do administrador a cada esquecimento. As rotas de CRM precisam ainda ser inalcançáveis sem sessão, sem piscar a tela de login enquanto a sessão está sendo restaurada do armazenamento local.

## Goals

- [ ] Consultor cria conta e entra no CRM no mesmo fluxo, sem confirmar e-mail (AD-007).
- [ ] Consultor recupera o acesso sozinho, por e-mail, sem tocar no dashboard do Supabase.
- [ ] Nenhuma rota privada renderiza conteúdo antes de a sessão ser resolvida, e nenhuma vaza para quem não está autenticado.
- [ ] Perda de sessão durante o uso leva de volta ao ponto exato onde o consultor estava, após novo login.
- [ ] Consultor vê e edita seu nome e telefone; e-mail é somente leitura (AD-008).

## Out of Scope

Explicitamente excluído. Documentado para evitar expansão de escopo.

| Feature | Reason |
| ------- | ------ |
| Login social (Google, Apple) e magic link | PLAN §14 Fase 2 especifica autenticação por e-mail e senha. Cada provedor adicional traz configuração de redirect e um caminho de erro próprio. |
| Confirmação de e-mail no cadastro | AD-007 desligou para o MVP; a infraestrutura (AD-005) já suporta ligá-la depois. |
| Troca de e-mail pelo produto | AD-008 — exigiria fluxo de reconfirmação e propagação para `profiles`. |
| Autenticação de dois fatores | Nenhum requisito do PLAN a menciona. |
| Papéis, permissões e convite de membros | PLAN §15 — evolução futura. |
| Exclusão da própria conta | Não solicitada no PLAN; envolve decisão de retenção de dados de terceiros ainda não tomada. |
| Criação das tabelas, políticas e do trigger de perfil | Entregues por `foundation`. |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui — nada fica silenciosamente indefinido.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Tamanho mínimo de senha, não especificado no PLAN §6 | 8 caracteres, sem exigência de composição | É o mínimo que o Supabase Auth aplica por padrão. Regras de composição empurram o usuário para senhas previsíveis e para o papel adesivo no monitor, sem ganho real de entropia | n |
| Mensagem de erro em credenciais inválidas | Uma única mensagem genérica — "E-mail ou senha inválidos" — para e-mail inexistente e senha errada | Distinguir os dois casos transforma a tela de login em um oráculo que confirma quais e-mails têm conta | n |
| Comportamento ao pedir recuperação para e-mail sem conta | Mesma tela de confirmação do caso com conta; nenhum e-mail é enviado | Mesma razão: a tela não deve revelar quem tem conta | n |
| Validade do link de redefinição | Padrão do Supabase (1 hora), sem customização | Nenhum requisito do PLAN justifica alterar; encurtar gera reclamação e alongar amplia a janela de risco | n |
| Destino após o login | `/clients`, salvo quando existir rota de retorno preservada | PLAN §6 diz "redirecionar para a listagem de clientes" | y |
| Onde a sessão é persistida | `localStorage`, via comportamento padrão do supabase-js | O produto é uma SPA sem renderização no servidor; é o padrão da biblioteca e o que sustenta o requisito de "preservar a sessão automaticamente" do PLAN §6 | n |
| Comportamento ao acessar `/login` já autenticado | Redirecionar para `/clients` | Evita que o consultor com sessão ativa reveja a tela de login ao usar um atalho antigo | n |
| Tela de perfil, ausente no PLAN §7 embora `/profile` seja rota privada no PLAN §6 | Exibe nome, e-mail e telefone; permite editar nome e telefone; e-mail somente leitura | Fecha a inconsistência entre §6 e §7 pelo escopo mínimo que torna a rota útil, respeitando AD-008 | y |

| Distinguir sessão expirada de permissão negada, indistintos na redação original do AUTH-12 AC3 | 401 e 403 encerram a sessão; `42501` é erro de permissão e a mantém | `42501` é o que a RLS devolve para "esta linha não é sua", com sessão perfeitamente válida. Inserir um cliente com `owner_id` alheio produz esse código e é comportamento esperado, já coberto por teste na `foundation`. Tratá-lo como expiração derrubaria o consultor para o login por um erro legítimo | y |
| O link de recuperação de senha autentica o usuário, colidindo com o AUTH-11 | `/reset-password` nunca é redirecionada pela guarda; a tela distingue os três casos pela marca `emRecuperacao` e pelo erro que o Supabase devolve no fragmento da URL | Redação original dizia "enquanto a marca vale", e a implementação mostrou que isso não funciona: medido em T18, o supabase-js emite `INITIAL_SESSION` com a sessão do link ANTES de `PASSWORD_RECOVERY`, e nesse intervalo a guarda veria "autenticado sem marca" e expulsaria o consultor da tela um instante após ele clicar no link. O AUTH-08 AC7 já pedia orientar quem chega "sem sessão de recuperação", o que inclui sessão comum | y |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Criar conta e entrar direto ⭐ MVP

**User Story**: Como consultor, quero criar minha conta e já começar a usar o CRM, para não depender de ninguém para ter acesso.

**Why P1**: Sem cadastro não existe primeiro usuário, e o fluxo E2E do PLAN §13 começa exatamente aqui.

**Acceptance Criteria**:

1. WHEN o consultor envia nome completo, e-mail, senha e confirmação válidos em `/signup` THEN o sistema SHALL criar o usuário no Supabase Auth com o nome nos metadados e SHALL redirecionar para `/clients` com sessão ativa.
2. IF a confirmação de senha diferir da senha THEN o sistema SHALL exibir o erro no campo de confirmação e SHALL não chamar o Supabase.
3. IF a senha tiver menos de 8 caracteres THEN o sistema SHALL exibir o erro no campo de senha e SHALL não chamar o Supabase.
4. IF o e-mail não tiver formato válido ou o nome completo estiver vazio THEN o sistema SHALL exibir o erro no campo correspondente e SHALL não chamar o Supabase.
5. IF o e-mail já possuir conta THEN o sistema SHALL exibir uma mensagem orientando a entrar ou recuperar a senha, e SHALL manter os dados já digitados no formulário.
6. WHILE o cadastro estiver sendo processado, o sistema SHALL desabilitar o botão de envio e SHALL exibir indicação de carregamento, impedindo envio duplicado.
7. IF a chamada ao Supabase falhar por rede ou indisponibilidade THEN o sistema SHALL exibir mensagem de falha temporária com opção de tentar de novo, preservando o formulário.
8. WHEN a conta é criada THEN o sistema SHALL garantir que o perfil correspondente exista antes de renderizar o CRM.

**Independent Test**: Preencher `/signup` com dados novos e chegar em `/clients` autenticado; repetir com o mesmo e-mail e ver a mensagem de conta existente.

---

### P1: Entrar e sair ⭐ MVP

**User Story**: Como consultor, quero entrar com e-mail e senha e continuar logado entre visitas, para não reautenticar a cada vez que abro o CRM.

**Why P1**: É o caminho de retorno de todo uso após o primeiro.

**Acceptance Criteria**:

1. WHEN o consultor envia credenciais válidas em `/login` THEN o sistema SHALL estabelecer a sessão e SHALL redirecionar para `/clients`.
2. IF as credenciais forem inválidas THEN o sistema SHALL exibir "E-mail ou senha inválidos", sem distinguir e-mail inexistente de senha incorreta.
3. WHEN o consultor reabre a aplicação com sessão válida armazenada THEN o sistema SHALL restaurar a sessão sem pedir credenciais.
4. WHEN o consultor aciona sair THEN o sistema SHALL encerrar a sessão, SHALL descartar todo o cache de dados em memória e SHALL redirecionar para `/login`.
5. WHILE a autenticação estiver em andamento, o sistema SHALL desabilitar o botão de envio e SHALL exibir indicação de carregamento.
6. WHEN um usuário autenticado acessa `/login`, `/signup` ou `/forgot-password` THEN o sistema SHALL redirecioná-lo para `/clients`, ou para a rota pretendida quando houver uma em `?redirect=`.
7. The system SHALL never redirecionar `/reset-password`, qualquer que seja o estado da sessão; é a tela que decide entre o formulário e a orientação de pedir um novo link.
7. IF a chamada de autenticação falhar por rede THEN o sistema SHALL exibir mensagem de falha temporária, distinta da mensagem de credencial inválida.

**Independent Test**: Entrar, recarregar a página e continuar em `/clients`; sair e confirmar que voltar pelo histórico do navegador não devolve o conteúdo.

---

### P1: Recuperar a senha sozinho ⭐ MVP

**User Story**: Como consultor, quero redefinir minha senha por e-mail, para recuperar o acesso sem depender de ninguém.

**Why P1**: PLAN §6 o inclui explicitamente no MVP para eliminar dependência operacional do administrador.

**Acceptance Criteria**:

1. WHEN o consultor envia um e-mail em `/forgot-password` THEN o sistema SHALL solicitar ao Supabase o envio do link de redefinição apontando para `/reset-password` e SHALL exibir uma confirmação neutra de que, havendo conta, a mensagem foi enviada.
2. IF o e-mail informado não tiver conta THEN o sistema SHALL exibir exatamente a mesma confirmação neutra, sem indicar a ausência da conta.
3. WHEN o consultor abre o link recebido THEN o sistema SHALL reconhecer a sessão de recuperação e SHALL apresentar o formulário de nova senha em `/reset-password`.
4. WHEN o consultor envia nova senha e confirmação válidas THEN o sistema SHALL atualizar a senha e SHALL redirecionar para `/clients` já autenticado.
5. IF o link estiver expirado, já utilizado ou inválido THEN o sistema SHALL exibir uma mensagem explicando o motivo e SHALL oferecer um caminho para solicitar novo link.
6. IF a nova senha não atender ao mínimo de 8 caracteres ou divergir da confirmação THEN o sistema SHALL exibir o erro no campo correspondente e SHALL não chamar o Supabase.
7. WHEN o consultor acessa `/reset-password` diretamente, sem sessão de recuperação THEN o sistema SHALL exibir a orientação para solicitar um link em `/forgot-password`.

**Independent Test**: Solicitar recuperação, abrir o link capturado pelo servidor de e-mail local do Supabase CLI, definir nova senha e entrar com ela.

---

### P1: Rotas privadas realmente protegidas ⭐ MVP

**User Story**: Como consultor, quero que meus dados nunca apareçam para quem não está autenticado, e não quero ver a tela de login piscar quando abro o CRM já logado.

**Why P1**: PLAN §6 pede explicitamente que não haja redirecionamento prematuro enquanto a sessão carrega.

**Acceptance Criteria**:

1. WHILE a sessão estiver sendo restaurada, o sistema SHALL exibir estado de carregamento e SHALL não renderizar nem o conteúdo privado nem a tela de login.
2. WHEN um visitante sem sessão acessa `/clients`, `/clients/new`, `/clients/:id`, `/clients/:id/edit` ou `/profile` THEN o sistema SHALL redirecioná-lo para `/login` preservando a rota pretendida.
3. WHEN esse visitante conclui o login THEN o sistema SHALL levá-lo à rota originalmente pretendida, e não a `/clients`.
4. The system SHALL manter `/login`, `/signup`, `/forgot-password` e `/reset-password` acessíveis sem sessão.
5. WHEN uma rota inexistente é acessada THEN o sistema SHALL exibir uma página de não encontrado com link de volta ao CRM.

**Independent Test**: Em janela anônima, abrir `/clients/123`, ser levado ao login, autenticar e chegar em `/clients/123`.

---

### P1: Sessão expirada durante o uso ⭐ MVP

**User Story**: Como consultor, quero entender o que houve quando sou desconectado no meio do trabalho e voltar ao ponto onde estava, para não perder o fio do que estava fazendo.

**Why P1**: PLAN §10 lista sessão expirada como estado obrigatório de interface.

**Acceptance Criteria**:

1. WHEN o sistema detectar que a sessão foi encerrada ou não pôde ser renovada THEN o sistema SHALL limpar todo o cache de dados, SHALL exibir a mensagem "Sua sessão expirou" e SHALL redirecionar para `/login` preservando a rota corrente.
2. WHEN o consultor autentica após essa expiração THEN o sistema SHALL devolvê-lo à rota preservada.
3. IF uma requisição ao Supabase falhar com status HTTP 401 ou 403 THEN o sistema SHALL tratá-la como sessão expirada.
4. IF uma requisição falhar com o código `42501` do PostgREST THEN o sistema SHALL tratá-la como erro de permissão na tela que a originou, e SHALL não encerrar a sessão.
5. The system SHALL renovar a sessão automaticamente enquanto o token de atualização for válido, sem interromper o consultor.

**Independent Test**: Com o app aberto, invalidar a sessão pelo dashboard do Supabase, disparar uma ação e observar mensagem, redirecionamento e retorno à rota após novo login.

---

### P2: Perfil do consultor

**User Story**: Como consultor, quero conferir e ajustar meu nome e telefone, para que o CRM me identifique corretamente.

**Why P2**: `/profile` já é rota privada no PLAN §6 e o cabeçalho exibe o nome; a edição em si não bloqueia nenhum fluxo do MVP.

**Acceptance Criteria**:

1. WHEN o consultor acessa `/profile` THEN o sistema SHALL exibir seu nome completo, e-mail e telefone a partir de `profiles`.
2. The system SHALL apresentar o e-mail como somente leitura, com a indicação de que não pode ser alterado por aqui.
3. WHEN o consultor salva alterações válidas de nome ou telefone THEN o sistema SHALL persistir em `profiles`, SHALL exibir confirmação e SHALL refletir o novo nome no cabeçalho sem recarregar a página.
4. IF o nome completo ficar vazio ou exceder 120 caracteres THEN o sistema SHALL exibir o erro no campo e SHALL não enviar a alteração.
5. The system SHALL exibir no cabeçalho o nome do consultor autenticado, com a ação de sair acessível a partir dele.

**Independent Test**: Alterar o nome em `/profile`, salvar e ver o cabeçalho atualizado; recarregar e confirmar a persistência.

---

## Edge Cases

- IF o consultor enviar o formulário de login duas vezes rapidamente THEN o sistema SHALL processar uma única tentativa.
- IF o Supabase responder com limite de requisições excedido THEN o sistema SHALL exibir mensagem pedindo para aguardar antes de tentar de novo, distinta de credencial inválida.
- WHEN o consultor sai em uma aba estando autenticado em outra THEN o sistema SHALL refletir a saída na outra aba na próxima interação.
- IF o link de redefinição for aberto em um navegador diferente daquele que o solicitou THEN o sistema SHALL funcionar normalmente, pois a sessão de recuperação vem do próprio link.
- WHEN o e-mail for digitado com espaços nas pontas ou em maiúsculas THEN o sistema SHALL normalizá-lo antes de autenticar.
- IF o cadastro der certo mas a leitura do perfil falhar THEN o sistema SHALL manter a sessão e SHALL exibir o CRM em vez de derrubar o consultor para o login.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| AUTH-01 | P1: Criar conta — formulário e validação Zod | Design | Pending |
| AUTH-02 | P1: Criar conta — cadastro no Supabase e sessão imediata | Design | Pending |
| AUTH-03 | P1: Criar conta — tratamento de e-mail já existente e falha de rede | Design | Pending |
| AUTH-04 | P1: Entrar e sair — login com mensagem genérica de erro | Design | Pending |
| AUTH-05 | P1: Entrar e sair — restauração de sessão entre visitas | Design | Pending |
| AUTH-06 | P1: Entrar e sair — logout com limpeza de cache | Design | Pending |
| AUTH-07 | P1: Recuperar senha — solicitação com resposta neutra | Design | Pending |
| AUTH-08 | P1: Recuperar senha — definição de nova senha e link inválido | Design | Pending |
| AUTH-09 | P1: Rotas protegidas — guarda com estado de carregamento | Design | Pending |
| AUTH-10 | P1: Rotas protegidas — preservação e retorno à rota pretendida | Design | Pending |
| AUTH-11 | P1: Rotas protegidas — redirecionamento de rotas públicas quando autenticado | Design | Pending |
| AUTH-12 | P1: Sessão expirada — detecção, mensagem e limpeza de cache | Design | Pending |
| AUTH-13 | P2: Perfil — leitura de `profiles` e e-mail somente leitura | Design | Pending |
| AUTH-14 | P2: Perfil — edição de nome e telefone | Design | Pending |
| AUTH-15 | P2: Cabeçalho com nome do consultor e ação de sair | Design | Pending |

**Coverage:** 15 total, 0 mapeados para tarefas, 15 aguardando a fase Tasks.

---

## Success Criteria

- [ ] O fluxo criar conta → usar → sair → entrar → esquecer senha → redefinir → entrar roda de ponta a ponta sem tocar no dashboard do Supabase.
- [ ] Nenhuma tela de autenticação revela se um e-mail possui conta.
- [ ] Recarregar qualquer rota privada estando autenticado nunca exibe a tela de login, nem por um instante.
- [ ] Sessão expirada sempre devolve o consultor à rota em que ele estava.
