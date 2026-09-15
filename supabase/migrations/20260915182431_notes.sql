-- Notas de um cliente: o histórico de contatos do consultor.
--
-- notes não tem owner_id próprio. A propriedade é derivada do cliente, o que
-- mantém uma única fonte de verdade sobre a quem a nota pertence (AD-004).
-- O custo é uma subconsulta por linha nas políticas, resolvida pelo índice
-- clients (id, owner_id).

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notes_title_length check (char_length(btrim(title)) between 1 and 120),
  constraint notes_description_length check (description is null or char_length(description) <= 5000)
);

comment on table public.notes is
  'Notas de um cliente. Excluir o cliente apaga suas notas por cascata; a propriedade é derivada de clients.owner_id (AD-004).';

create or replace function public.normalize_note()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.title := btrim(regexp_replace(new.title, '\s+', ' ', 'g'));
  new.description := nullif(btrim(coalesce(new.description, '')), '');
  return new;
end;
$$;

comment on function public.normalize_note() is
  'Trigger BEFORE INSERT OR UPDATE: apara o título e converte descrição só de espaços em nulo.';

create trigger notes_normalize
  before insert or update on public.notes
  for each row execute function public.normalize_note();

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- Serve à lista de notas da ficha, ordenada da mais recente para a mais
-- antiga, e à cascata da exclusão do cliente.
create index notes_client_created_idx on public.notes (client_id, created_at desc);

alter table public.notes enable row level security;

-- Camada 1 — o que o papel pode tocar (AD-014).
revoke all on public.notes from anon, authenticated;
grant select, insert, delete on public.notes to authenticated;
grant update (title, description) on public.notes to authenticated;

-- Camada 2 — quais linhas.
-- A verificação de dono é repetida nas quatro políticas em vez de extraída
-- para uma função auxiliar: quatro cláusulas idênticas e legíveis auditam
-- melhor que uma indireção security definer no único ponto onde a segurança
-- vive.
--
-- Medido em T11 com 1000 clientes e 10000 notas: o planner não avalia este
-- `exists` por linha. Ele o eleva a um SubPlan com hash, avaliado uma vez,
-- atendido por varredura de bitmap sobre clients filtrando owner_id.
create policy notes_select_own on public.notes
  for select to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = notes.client_id and c.owner_id = (select auth.uid())
    )
  );

create policy notes_insert_own on public.notes
  for insert to authenticated
  with check (
    exists (
      select 1 from public.clients c
      where c.id = notes.client_id and c.owner_id = (select auth.uid())
    )
  );

create policy notes_update_own on public.notes
  for update to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = notes.client_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = notes.client_id and c.owner_id = (select auth.uid())
    )
  );

create policy notes_delete_own on public.notes
  for delete to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = notes.client_id and c.owner_id = (select auth.uid())
    )
  );
