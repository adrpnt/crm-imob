-- Observabilidade interna: o error boundary do React grava aqui (AD-011).
--
-- Escrita de mão única. authenticated insere e não lê; a inspeção é feita pelo
-- dashboard ou por uma conexão de serviço. Sem grant de select, nem uma
-- política mal escrita expõe stack trace de outro usuário.
--
-- anon não recebe grant algum: erros ocorridos em rota pública ficam no
-- console do navegador. Abrir insert anônimo tornaria a tabela gravável por
-- qualquer um, já que a chave publicável está no bundle.

create table public.error_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  message text not null,
  stack text,
  route text,
  user_agent text,
  created_at timestamptz not null default now(),

  constraint error_logs_message_length check (char_length(message) between 1 and 2000),
  constraint error_logs_stack_length check (stack is null or char_length(stack) <= 10000),
  constraint error_logs_route_length check (route is null or char_length(route) <= 500),
  constraint error_logs_user_agent_length check (user_agent is null or char_length(user_agent) <= 500)
);

comment on table public.error_logs is
  'Falhas capturadas pelo error boundary. Insert-only para authenticated; leitura só por conexão de serviço (AD-011).';

-- Serve à inspeção manual por usuário e período.
create index error_logs_owner_created_idx on public.error_logs (owner_id, created_at desc);

alter table public.error_logs enable row level security;

-- Camada 1 — apenas insert, e só para authenticated.
revoke all on public.error_logs from anon, authenticated;
grant insert on public.error_logs to authenticated;

-- Camada 2 — só com o próprio identificador.
create policy error_logs_insert_own on public.error_logs
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
