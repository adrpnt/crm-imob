# Foundation Context

**Gathered:** 2026-09-15
**Spec:** `.specs/features/foundation/spec.md`
**Status:** Ready for design

---

## Feature Boundary

O esqueleto executável da aplicação e a camada de dados completa: projeto Vite com React, TypeScript, Tailwind v4 e cliente Supabase; schema versionado com tabelas, constraints, índices, triggers e políticas de RLS; tipos gerados; layout base e captura de erros. Nenhuma tela de produto.

---

## Implementation Decisions

### Origem e versionamento do schema

- O schema vive em `supabase/migrations/*.sql` no repositório, aplicado pelo Supabase CLI. O dashboard nunca é a fonte da verdade (AD-002).
- Docker e o Supabase CLI passam a ser pré-requisitos de desenvolvimento, documentados no README.
- Migrations são sempre aditivas; um arquivo já aplicado nunca é editado.

### Forma das políticas de RLS

- Toda política usa `(select auth.uid())`, declara `to authenticated` e tem índice na coluna verificada (AD-003).
- `notes` valida o dono por `exists (select 1 from public.clients ...)`, sem `owner_id` desnormalizado (AD-004). Compensado por índices em `notes(client_id)` e `clients(id, owner_id)`.
- `profiles` aceita apenas select e update do próprio dono; insert e delete ficam a cargo do trigger e da cascata de `auth.users`.
- `error_logs` é insert-only para `authenticated` e totalmente inacessível para `anon` (AD-011).

### Criação do perfil

- Trigger `on auth.users insert` chamando `public.handle_new_user()`, `security definer` com `set search_path = ''` (AD-005). O frontend nunca insere em `profiles`.
- `full_name` vem de `raw_user_meta_data`; sem ele, cai para a parte do e-mail anterior ao `@` em vez de falhar o cadastro.

### Domínios e normalização de dados

- `status`, `source` e `income_type` são `text` com check constraint, não enums nativos (AD-006).
- `income_type` aceita `formal`, `informal` e `mixed`.
- `income` é `numeric(12,2)` em BRL.
- `phone` é persistido apenas com dígitos; `region` é aparado e tem espaços internos colapsados por trigger (AD-009).
- `updated_at` é sempre escrito por trigger, ignorando o que o cliente enviar.

### Design e tema

- Tailwind v4 via `@tailwindcss/vite`, tokens declarados por `@theme` em CSS. Não existe `tailwind.config.js` (AD-010).

### Observabilidade

- Error boundary do React grava em `public.error_logs` quando há sessão; em rota pública, apenas console (AD-011).
- Uma falha ao gravar o log nunca pode gerar uma segunda exceção.

### Agent's Discretion

- Escolha das bibliotecas de teste de apoio, organização interna dos arquivos de migration e nomes exatos de funções e triggers.
- Paleta concreta de cores e escala tipográfica dos tokens, desde que respeitem o contraste mínimo de 4.5:1.

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma área foi declinada. Os pontos não discutidos explicitamente — limites de tamanho de campo, formato de armazenamento de telefone, exclusão física, estratégia de migração e fixação de versões — estão registrados na tabela de premissas do spec com default e justificativa.

---

## Specific References

- `PLAN.md` §3 define a estrutura de diretórios adotada sem alteração.
- `PLAN.md` §4 define o modelo de dados; as divergências (tipo de `income`, índices compostos, normalização) estão justificadas no spec e em `STATE.md`.
- O padrão de trigger de perfil segue o exemplo da documentação oficial do Supabase em "Managing User Data".

---

## Deferred Ideas

- Índice GIN de busca textual completa sobre múltiplas colunas, caso a busca por trigrama se mostre insuficiente.
- Tabela de auditoria de alterações de cliente.
- Segundo projeto Supabase para homologação.
