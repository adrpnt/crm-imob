# Deploy Context

**Gathered:** 2026-09-15
**Spec:** `.specs/features/deploy/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Publicação do frontend na Vercel, aplicação das migrations no projeto Supabase de produção, configuração do Auth para o domínio real, verificação do isolamento em ambiente publicado e documentação de operação.

---

## Implementation Decisions

### Ambientes

- Um único projeto Supabase remoto, de produção. O desenvolvimento usa o Supabase local do CLI.
- Consequência assumida e documentada: deploys de preview da Vercel apontam para o banco de produção.

### Schema em produção

- Chega exclusivamente por `supabase db push` a partir das migrations versionadas (AD-002).
- Após aplicar, uma verificação de divergência precisa sair vazia. Qualquer tabela exposta sem RLS torna o sistema não publicável.

### Autenticação no domínio real

- Site URL apontando para o domínio de produção; lista de redirecionamentos permitidos contendo o domínio de produção e o endereço local de desenvolvimento.
- Essa é a configuração que faz o link de recuperação de senha chegar correto no e-mail — o erro clássico deste passo é o link apontar para `localhost`.
- Modelos de e-mail do Auth ficam nos padrões do Supabase, em inglês. Registrado como dívida visível ao usuário.

### Roteamento

- Todas as rotas são reescritas para `index.html` na Vercel. Sem isso, recarregar `/clients/123` devolve 404 do provedor em vez da aplicação.

### Verificação

- Roteiro manual com duas contas reais contra a URL publicada, cobrindo o fluxo inteiro do `PLAN.md` §13 e o cruzamento entre as contas.
- A suíte E2E automatizada continua apontando para o ambiente local; não é executada contra produção, para não sujar o banco real.
- As contas de verificação são removidas ao final.

### Agent's Discretion

- Estrutura do `vercel.json` e organização das seções do README.
- Formato do registro do roteiro de verificação.

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma área foi declinada. Projeto único, gatilho de publicação, roteamento de SPA e modelos de e-mail padrão estão na tabela de premissas do spec com default e justificativa.

---

## Specific References

- `PLAN.md` §14 Fase 5 lista o checklist de deploy; cada item virou critério de aceite verificável nesta feature.

---

## Deferred Ideas

- Domínio próprio personalizado.
- Pipeline de CI rodando a suíte antes do deploy.
- Ambiente de homologação separado.
- Política própria de backup e recuperação.
