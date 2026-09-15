begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

insert into auth.users (id, email, instance_id)
values
  ('11111111-1111-1111-1111-111111111111', 'dono@exemplo.com',     '00000000-0000-0000-0000-000000000000'),
  ('22222222-2222-2222-2222-222222222222', 'estranho@exemplo.com', '00000000-0000-0000-0000-000000000000');

insert into public.clients (id, owner_id, name, status)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Cliente do Dono', 'lead'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Cliente do Estranho', 'lead');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- ---------- sanidade ----------
select is((select auth.uid()::text), '11111111-1111-1111-1111-111111111111',
  'a sessão de teste é reconhecida por auth.uid()');

select ok((select relrowsecurity from pg_class where oid = 'public.clients'::regclass),
  'RLS está habilitada em clients');

-- ---------- matriz: dono ----------
select results_eq($$ select name from public.clients $$, array['Cliente do Dono'],
  'o dono enxerga exclusivamente os próprios clientes');

select results_eq(
  $$ insert into public.clients (owner_id, name)
     values ('11111111-1111-1111-1111-111111111111', 'Novo Lead') returning name $$,
  array['Novo Lead'], 'o dono insere cliente com o próprio owner_id');

select results_eq(
  $$ update public.clients set status = 'contacted'
      where id = 'aaaaaaaa-0000-0000-0000-000000000001' returning status $$,
  array['contacted'], 'o dono atualiza o próprio cliente');

select results_eq(
  $$ delete from public.clients where name = 'Novo Lead' returning name $$,
  array['Novo Lead'], 'o dono exclui o próprio cliente');

-- ---------- matriz: estranho ----------
select is_empty($$ select name from public.clients
    where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  'o cliente de outro usuário é invisível');

select is_empty($$ update public.clients set name = 'Invadido'
    where id = 'bbbbbbbb-0000-0000-0000-000000000001' returning name $$,
  'não há update sobre cliente de outro usuário');

select is_empty($$ delete from public.clients
    where id = 'bbbbbbbb-0000-0000-0000-000000000001' returning name $$,
  'não há delete sobre cliente de outro usuário');

select throws_ok(
  $$ insert into public.clients (owner_id, name)
     values ('22222222-2222-2222-2222-222222222222', 'Plantado') $$,
  '42501', null, 'inserir cliente com owner_id alheio é recusado pela política');

-- ---------- colunas imutáveis pela aplicação (AD-014) ----------
-- A camada de grant é verificada no catálogo, e não pelo comportamento.
-- Motivo: um update de owner_id também é barrado pela cláusula with check da
-- política, então uma asserção comportamental passaria mesmo com a coluna
-- indevidamente incluída no grant — provando o resultado, não o mecanismo.
-- O controle positivo logo abaixo impede que esta asserção passe por engano
-- caso o nome do papel ou da tabela esteja errado.
select ok(
  not has_column_privilege('authenticated', 'public.clients', 'owner_id', 'UPDATE'),
  'authenticated não tem privilégio de UPDATE na coluna owner_id');

select ok(
  has_column_privilege('authenticated', 'public.clients', 'name', 'UPDATE'),
  'controle positivo: authenticated tem privilégio de UPDATE na coluna name');

select throws_ok(
  $$ update public.clients set owner_id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null, 'alterar owner_id para outro usuário é recusado');

select throws_ok(
  $$ update public.clients set created_at = now() $$,
  '42501', null, 'alterar created_at é recusado por falta de privilégio na coluna');

select throws_ok(
  $$ update public.clients set updated_at = '2001-01-01'::timestamptz $$,
  '42501', null, 'alterar updated_at é recusado por falta de privilégio na coluna');

-- ---------- as nove constraints de domínio ----------
select throws_ok($$ insert into public.clients (owner_id, name)
    values ('11111111-1111-1111-1111-111111111111', 'X') $$,
  '23514', null, 'nome com menos de 2 caracteres é recusado');

select throws_ok($$ insert into public.clients (owner_id, name, status)
    values ('11111111-1111-1111-1111-111111111111', 'Fulano', 'arquivado') $$,
  '23514', null, 'status fora do domínio é recusado');

select throws_ok($$ insert into public.clients (owner_id, name, source)
    values ('11111111-1111-1111-1111-111111111111', 'Fulano', 'tiktok') $$,
  '23514', null, 'origem fora do domínio é recusada');

select throws_ok($$ insert into public.clients (owner_id, name, income_type)
    values ('11111111-1111-1111-1111-111111111111', 'Fulano', 'autonomo') $$,
  '23514', null, 'tipo de renda fora do domínio é recusado');

select throws_ok($$ insert into public.clients (owner_id, name, income)
    values ('11111111-1111-1111-1111-111111111111', 'Fulano', -1) $$,
  '23514', null, 'renda negativa é recusada');

select throws_ok($$ insert into public.clients (owner_id, name, email)
    values ('11111111-1111-1111-1111-111111111111', 'Fulano', 'nao-e-email') $$,
  '23514', null, 'e-mail malformado é recusado');

select throws_ok($$ insert into public.clients (owner_id, name, region)
    values ('11111111-1111-1111-1111-111111111111', 'Fulano', repeat('a', 81)) $$,
  '23514', null, 'região com mais de 80 caracteres é recusada');

-- ---------- normalização (edge cases do spec) ----------
select results_eq(
  $$ insert into public.clients (owner_id, name, region)
     values ('11111111-1111-1111-1111-111111111111', 'Espacos', '     ') returning region $$,
  array[null::text], 'região com apenas espaços é gravada como nulo');

select results_eq(
  $$ insert into public.clients (owner_id, name, phone)
     values ('11111111-1111-1111-1111-111111111111', 'Telefone', '(11) 98765-4321') returning phone $$,
  array['11987654321'], 'telefone com máscara é reduzido a dígitos');

select results_eq(
  $$ insert into public.clients (owner_id, name, region)
     values ('11111111-1111-1111-1111-111111111111', 'Regiao', '  Zona    Sul  ') returning region $$,
  array['Zona Sul'], 'região é aparada e tem espaços internos colapsados');

select results_eq(
  $$ insert into public.clients (owner_id, name)
     values ('11111111-1111-1111-1111-111111111111', '   Maria   dos   Santos   ') returning name $$,
  array['Maria dos Santos'], 'nome é aparado e tem espaços internos colapsados');

select results_eq(
  $$ insert into public.clients (owner_id, name, email)
     values ('11111111-1111-1111-1111-111111111111', 'Email', '  JOAO@Exemplo.COM  ') returning email $$,
  array['joao@exemplo.com'], 'e-mail é aparado e convertido para minúsculas');

-- ---------- anônimo ----------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok($$ select * from public.clients $$,
  '42501', null, 'anon não tem privilégio algum sobre clients');

select * from finish();
rollback;
