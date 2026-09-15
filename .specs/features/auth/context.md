# Auth Context

**Gathered:** 2026-09-15
**Spec:** `.specs/features/auth/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Cadastro, login, logout, recuperação de senha, proteção de rotas, tratamento de sessão expirada e a tela de perfil. Consome o schema e o trigger entregues por `foundation`.

---

## Implementation Decisions

### Modelo de conta

- Cadastro público aberto, sem confirmação de e-mail (AD-007). O consultor entra no CRM no mesmo fluxo em que cria a conta.
- O risco de contas não solicitadas é aceito conscientemente para o MVP.

### Discrição das mensagens

- Credencial inválida devolve uma única mensagem genérica, sem distinguir e-mail inexistente de senha errada.
- Pedido de recuperação devolve a mesma confirmação neutra com ou sem conta existente.
- Falha de rede tem mensagem própria, distinta de credencial inválida — o consultor precisa saber se vale tentar de novo.

### Proteção de rotas

- A guarda de rota tem três estados: carregando, autenticado e não autenticado. Durante o carregamento não renderiza nem o conteúdo nem o login, atendendo ao pedido explícito do PLAN §6 de evitar redirecionamento prematuro.
- A rota pretendida é preservada e restaurada após o login.
- Usuário autenticado que acessa uma rota pública de autenticação é levado para `/clients`.

### Sessão expirada

- Ao detectar perda de sessão: limpar o cache do TanStack Query, mostrar "Sua sessão expirou" e redirecionar para `/login` preservando a rota corrente.
- Uma resposta de não autorizado vinda do Supabase é tratada como sessão expirada, não como erro genérico.

### Perfil

- `/profile` exibe nome, e-mail e telefone; permite editar nome e telefone.
- O e-mail é somente leitura e nunca é alterado pela aplicação (AD-008) — é o que dispensa qualquer sincronização com `auth.users`.

### Agent's Discretion

- Layout exato das telas de autenticação, redação final das mensagens e organização dos schemas Zod.
- Mecanismo interno de preservação da rota pretendida (parâmetro de consulta ou estado de navegação).

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma área foi declinada. Tamanho mínimo de senha, validade do link de redefinição, local de persistência da sessão e comportamento ao acessar rota pública já autenticado estão na tabela de premissas do spec com default e justificativa.

---

## Specific References

- `PLAN.md` §6 é seguido integralmente, incluindo a inclusão de recuperação de senha no MVP.
- A tela de perfil não existia no `PLAN.md` §7 embora `/profile` fosse rota privada em §6; foi especificada no escopo mínimo que torna a rota útil.

---

## Deferred Ideas

- Login social e magic link.
- Troca de e-mail com reconfirmação.
- Autenticação de dois fatores.
- Exclusão da própria conta.
