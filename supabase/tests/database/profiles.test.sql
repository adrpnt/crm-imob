begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- Dois usuários reais. As linhas de profiles NÃO são inseridas aqui: quem as
-- cria é o trigger on_auth_user_created, e o nome vem dos metadados do
-- cadastro. Este setup é o caminho real do produto.
insert into auth.users (id, email, instance_id, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'dono@exemplo.com',
   '00000000-0000-0000-0000-000000000000', '{"full_name":"Dono da Conta"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'estranho@exemplo.com',
   '00000000-0000-0000-0000-000000000000', '{"full_name":"Outro Usuário"}'::jsonb);

-- Sanidade: sem esta asserção, todo o resto poderia passar por engano se a
-- claim não fosse lida e auth.uid() devolvesse NULL.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select auth.uid()::text),
  '11111111-1111-1111-1111-111111111111',
  'a sessão de teste é reconhecida por auth.uid()'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS está habilitada em profiles'
);

-- ---- dono ----
select results_eq(
  $$ select full_name from public.profiles $$,
  array['Dono da Conta'],
  'o dono enxerga exclusivamente o próprio perfil'
);

select results_eq(
  $$ update public.profiles set full_name = 'Nome Corrigido' returning full_name $$,
  array['Nome Corrigido'],
  'o dono atualiza o próprio nome'
);

select results_eq(
  $$ update public.profiles set phone = '11987654321' returning phone $$,
  array['11987654321'],
  'o dono atualiza o próprio telefone'
);

-- O grant por coluna é o que barra isto. Se email entrasse na lista do grant,
-- esta asserção cairia e o AD-008 deixaria de ser estrutural.
select throws_ok(
  $$ update public.profiles set email = 'novo@exemplo.com' $$,
  '42501',
  null,
  'alterar o próprio e-mail é recusado por falta de privilégio na coluna'
);

select throws_ok(
  $$ insert into public.profiles (id, full_name, email)
     values (gen_random_uuid(), 'Intruso', 'intruso@exemplo.com') $$,
  '42501',
  null,
  'authenticated não tem privilégio de insert em profiles'
);

select throws_ok(
  $$ delete from public.profiles $$,
  '42501',
  null,
  'authenticated não tem privilégio de delete em profiles'
);

-- ---- estranho ----
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select results_eq(
  $$ select full_name from public.profiles $$,
  array['Outro Usuário'],
  'outro usuário não enxerga o perfil alheio'
);

select is_empty(
  $$ update public.profiles
        set full_name = 'Invadido'
      where id = '11111111-1111-1111-1111-111111111111'
     returning full_name $$,
  'outro usuário não altera o perfil alheio'
);

-- ---- anônimo ----
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$ select * from public.profiles $$,
  '42501',
  null,
  'anon não tem privilégio algum sobre profiles'
);

select * from finish();
rollback;
