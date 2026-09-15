-- Tabela de perfis: complementa auth.users com os dados que o CRM exibe.
--
-- A linha nasce pelo trigger handle_new_user (migration posterior) e morre
-- pela cascata de auth.users. A aplicação nunca insere nem exclui aqui, e isso
-- é imposto por ausência de grant, não por política (AD-014).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_full_name_length check (char_length(full_name) between 1 and 120),
  constraint profiles_email_length check (char_length(email) <= 254),
  constraint profiles_phone_digits check (phone is null or phone ~ '^[0-9]{8,20}$')
);

comment on table public.profiles is
  'Perfil do consultor. Criado por trigger no cadastro; e-mail é imutável pela aplicação (AD-008).';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Camada 1 — o que o papel pode tocar.
-- O Supabase concede privilégios amplos por padrão a anon e authenticated em
-- tabelas novas do schema public. O revoke desfaz isso e o grant devolve só o
-- necessário. Deixar email e id fora do update é o que torna o AD-008
-- estrutural: não existe update que os alcance, esteja a política certa ou não.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- Camada 2 — quais linhas.
-- auth.uid() em subconsulta para ser avaliada uma vez, não por linha (AD-003).
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
