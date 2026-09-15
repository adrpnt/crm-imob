begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email, instance_id)
values
  ('11111111-1111-1111-1111-111111111111', 'dono@exemplo.com',     '00000000-0000-0000-0000-000000000000'),
  ('22222222-2222-2222-2222-222222222222', 'estranho@exemplo.com', '00000000-0000-0000-0000-000000000000');

insert into public.clients (id, owner_id, name)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Cliente do Dono'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Cliente do Estranho');

insert into public.notes (id, client_id, title, description)
values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ligação inicial', 'Procura 2 quartos'),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Nota alheia', null);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- ---------- sanidade ----------
select is((select auth.uid()::text), '11111111-1111-1111-1111-111111111111',
  'a sessão de teste é reconhecida por auth.uid()');

select ok((select relrowsecurity from pg_class where oid = 'public.notes'::regclass),
  'RLS está habilitada em notes');

-- ---------- camada de grant, verificada no catálogo (AD-014) ----------
-- Por catálogo, e não por comportamento: uma asserção comportamental sobre
-- created_at poderia passar por outro motivo, como já aconteceu com owner_id
-- em clients.
select ok(not has_column_privilege('authenticated', 'public.notes', 'created_at', 'UPDATE'),
  'authenticated não tem privilégio de UPDATE na coluna created_at');

select ok(not has_column_privilege('authenticated', 'public.notes', 'updated_at', 'UPDATE'),
  'authenticated não tem privilégio de UPDATE na coluna updated_at');

select ok(not has_column_privilege('authenticated', 'public.notes', 'client_id', 'UPDATE'),
  'authenticated não tem privilégio de UPDATE na coluna client_id: uma nota não muda de dono');

select ok(has_column_privilege('authenticated', 'public.notes', 'title', 'UPDATE'),
  'controle positivo: authenticated tem privilégio de UPDATE na coluna title');

-- ---------- matriz: dono ----------
select results_eq($$ select title from public.notes $$, array['Ligação inicial'],
  'o dono enxerga exclusivamente notas de clientes seus');

select results_eq(
  $$ insert into public.notes (client_id, title)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Visita marcada') returning title $$,
  array['Visita marcada'], 'o dono cria nota para cliente seu');

select results_eq(
  $$ update public.notes set title = 'Ligação revisada'
      where id = 'cccccccc-0000-0000-0000-000000000001' returning title $$,
  array['Ligação revisada'], 'o dono edita nota de cliente seu');

select results_eq(
  $$ delete from public.notes where title = 'Visita marcada' returning title $$,
  array['Visita marcada'], 'o dono exclui nota de cliente seu');

-- ---------- matriz: estranho ----------
select is_empty($$ select title from public.notes
    where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  'nota de cliente de outro usuário é invisível');

select is_empty($$ update public.notes set title = 'Invadida'
    where id = 'dddddddd-0000-0000-0000-000000000001' returning title $$,
  'não há update sobre nota de cliente alheio');

select is_empty($$ delete from public.notes
    where id = 'dddddddd-0000-0000-0000-000000000001' returning title $$,
  'não há delete sobre nota de cliente alheio');

select throws_ok(
  $$ insert into public.notes (client_id, title)
     values ('bbbbbbbb-0000-0000-0000-000000000001', 'Plantada') $$,
  '42501', null, 'criar nota apontando para cliente alheio é recusado pela política');

-- ---------- constraints ----------
select throws_ok(
  $$ insert into public.notes (client_id, title)
     values ('aaaaaaaa-0000-0000-0000-000000000001', '   ') $$,
  '23514', null, 'título só com espaços é recusado');

select throws_ok(
  $$ insert into public.notes (client_id, title)
     values ('aaaaaaaa-0000-0000-0000-000000000001', repeat('t', 121)) $$,
  '23514', null, 'título com mais de 120 caracteres é recusado');

select throws_ok(
  $$ insert into public.notes (client_id, title, description)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Longa', repeat('d', 5001)) $$,
  '23514', null, 'descrição com mais de 5000 caracteres é recusada');

-- ---------- normalização ----------
select results_eq(
  $$ insert into public.notes (client_id, title, description)
     values ('aaaaaaaa-0000-0000-0000-000000000001', '  Título   com   espaços  ', '    ')
     returning title || '|' || coalesce(description, 'NULO') $$,
  array['Título com espaços|NULO'],
  'título é aparado e descrição só com espaços vira nulo');

-- ---------- índice ----------
select ok(
  exists (select 1 from pg_indexes
           where schemaname = 'public' and tablename = 'notes'
             and indexname = 'notes_client_created_idx'),
  'índice notes_client_created_idx existe — serve à lista da ficha e à cascata');

-- ---------- cascata ----------
select lives_ok(
  $$ delete from public.clients where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'o dono exclui o próprio cliente');

select is_empty(
  $$ select title from public.notes
      where client_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'excluir o cliente apaga suas notas por cascata');

-- ---------- anônimo ----------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok($$ select * from public.notes $$,
  '42501', null, 'anon não tem privilégio algum sobre notes');

select * from finish();
rollback;
