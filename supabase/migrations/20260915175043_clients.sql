-- Carteira de clientes do consultor. Núcleo do produto.
--
-- A normalização vive no banco, não no formulário: o frontend melhora a
-- experiência, mas o banco é a autoridade final (PLAN §9). Dado inserido por
-- qualquer caminho obedece à mesma regra.

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  status text not null default 'lead',
  source text,
  region text,
  income numeric(12, 2),
  income_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clients_name_length check (char_length(name) between 2 and 120),
  constraint clients_email_length check (email is null or char_length(email) <= 254),
  constraint clients_email_format check (
    email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint clients_phone_digits check (phone is null or phone ~ '^[0-9]{8,20}$'),
  constraint clients_region_length check (region is null or char_length(region) between 1 and 80),
  constraint clients_status_allowed check (
    status in ('lead', 'contacted', 'qualified', 'client', 'inactive')
  ),
  constraint clients_source_allowed check (
    source is null or source in ('indication', 'instagram', 'website', 'whatsapp', 'portal', 'other')
  ),
  constraint clients_income_type_allowed check (
    income_type is null or income_type in ('formal', 'informal', 'mixed')
  ),
  constraint clients_income_range check (income is null or (income >= 0 and income <= 99999999.99))
);

comment on table public.clients is
  'Clientes de um consultor. owner_id é a fronteira de isolamento; domínios controlados por check, não por enum (AD-006).';

-- Normaliza antes das constraints serem avaliadas: triggers BEFORE rodam
-- primeiro, então o telefone chega ao check já reduzido a dígitos (FND-06).
create or replace function public.normalize_client()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  new.email := nullif(lower(btrim(coalesce(new.email, ''))), '');
  new.phone := nullif(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), '');
  new.region := nullif(btrim(regexp_replace(coalesce(new.region, ''), '\s+', ' ', 'g')), '');
  return new;
end;
$$;

comment on function public.normalize_client() is
  'Trigger BEFORE INSERT OR UPDATE: apara nome e região, baixa e-mail, reduz telefone a dígitos, converte vazio em nulo.';

create trigger clients_normalize
  before insert or update on public.clients
  for each row execute function public.normalize_client();

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

alter table public.clients enable row level security;

-- Camada 1 — o que o papel pode tocar (AD-014).
-- owner_id, created_at e updated_at ficam fora do grant de update: nenhum
-- update os alcança, esteja a política certa ou não.
revoke all on public.clients from anon, authenticated;
grant select, insert, delete on public.clients to authenticated;
grant update (name, email, phone, status, source, region, income, income_type)
  on public.clients to authenticated;

-- Camada 2 — quais linhas (AD-003).
create policy clients_select_own on public.clients
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy clients_insert_own on public.clients
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy clients_update_own on public.clients
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy clients_delete_own on public.clients
  for delete to authenticated
  using (owner_id = (select auth.uid()));
