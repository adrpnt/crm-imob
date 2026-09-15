begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- ---------- a função e o trigger ----------
select is(
  (select p.prosecdef::text from pg_proc p
    where p.proname = 'handle_new_user' and p.pronamespace = 'public'::regnamespace),
  'true',
  'handle_new_user é security definer — sem isso não escreveria em profiles, que não concede insert'
);

select is(
  (select array_to_string(p.proconfig, ',') from pg_proc p
    where p.proname = 'handle_new_user' and p.pronamespace = 'public'::regnamespace),
  'search_path=""',
  'handle_new_user fixa search_path vazio, impedindo sequestro de caminho'
);

select ok(
  exists (select 1 from pg_trigger
           where tgname = 'on_auth_user_created'
             and tgrelid = 'auth.users'::regclass
             and not tgisinternal),
  'o trigger on_auth_user_created existe em auth.users'
);

-- ---------- caminho 1: metadados completos ----------
insert into auth.users (id, email, instance_id, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', 'joana.silva@exemplo.com',
        '00000000-0000-0000-0000-000000000000',
        '{"full_name":"Joana Silva","phone":"(11) 98765-4321"}'::jsonb);

select results_eq(
  $$ select full_name from public.profiles
      where id = '11111111-1111-1111-1111-111111111111' $$,
  array['Joana Silva'],
  'o nome do cadastro chega ao perfil vindo dos metadados');

select results_eq(
  $$ select email from public.profiles
      where id = '11111111-1111-1111-1111-111111111111' $$,
  array['joana.silva@exemplo.com'],
  'o e-mail do perfil é copiado de auth.users (AD-008)');

select results_eq(
  $$ select phone from public.profiles
      where id = '11111111-1111-1111-1111-111111111111' $$,
  array['11987654321'],
  'o telefone dos metadados é gravado só com dígitos');

-- ---------- caminho 2: sem full_name ----------
-- profiles.full_name é not null. Sem o coalesce, este cadastro falharia — e
-- uma exceção aqui aborta a criação do usuário inteira.
insert into auth.users (id, email, instance_id)
values ('22222222-2222-2222-2222-222222222222', 'sem.nome@exemplo.com',
        '00000000-0000-0000-0000-000000000000');

select results_eq(
  $$ select full_name from public.profiles
      where id = '22222222-2222-2222-2222-222222222222' $$,
  array['sem.nome'],
  'sem full_name nos metadados, o nome cai para a parte do e-mail antes do @');

-- ---------- caminho 3: full_name presente mas vazio ----------
insert into auth.users (id, email, instance_id, raw_user_meta_data)
values ('33333333-3333-3333-3333-333333333333', 'vazio@exemplo.com',
        '00000000-0000-0000-0000-000000000000',
        '{"full_name":"   "}'::jsonb);

select results_eq(
  $$ select full_name from public.profiles
      where id = '33333333-3333-3333-3333-333333333333' $$,
  array['vazio'],
  'full_name só com espaços também cai para a parte do e-mail');

-- ---------- invariante: nenhum usuário sem perfil ----------
select is_empty(
  $$ select u.id from auth.users u
      left join public.profiles p on p.id = u.id
     where p.id is null $$,
  'nenhum usuário existe sem perfil correspondente');

-- ---------- a cascata na outra direção ----------
delete from auth.users where id = '33333333-3333-3333-3333-333333333333';

select is_empty(
  $$ select id from public.profiles
      where id = '33333333-3333-3333-3333-333333333333' $$,
  'excluir o usuário apaga o perfil por cascata');

-- ---------- o trigger não abre caminho de escrita para a aplicação ----------
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'INSERT'),
  'o trigger cria o perfil sem conceder insert a authenticated');

select * from finish();
rollback;
