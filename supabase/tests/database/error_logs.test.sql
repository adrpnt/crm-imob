begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email, instance_id)
values
  ('11111111-1111-1111-1111-111111111111', 'dono@exemplo.com',     '00000000-0000-0000-0000-000000000000'),
  ('22222222-2222-2222-2222-222222222222', 'estranho@exemplo.com', '00000000-0000-0000-0000-000000000000');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- ---------- sanidade ----------
select is((select auth.uid()::text), '11111111-1111-1111-1111-111111111111',
  'a sessão de teste é reconhecida por auth.uid()');

select ok((select relrowsecurity from pg_class where oid = 'public.error_logs'::regclass),
  'RLS está habilitada em error_logs');

-- ---------- a promessa central do AD-011, verificada no catálogo ----------
-- Por catálogo porque é isto que a decisão promete: a leitura é barrada por
-- ausência de privilégio, não por política. Uma asserção comportamental não
-- distinguiria as duas coisas.
select ok(has_table_privilege('authenticated', 'public.error_logs', 'INSERT'),
  'authenticated pode inserir em error_logs');

select ok(not has_table_privilege('authenticated', 'public.error_logs', 'SELECT'),
  'authenticated NÃO pode ler error_logs: a tabela é de escrita de mão única');

select ok(not has_table_privilege('authenticated', 'public.error_logs', 'UPDATE'),
  'authenticated não pode alterar um registro de erro');

select ok(not has_table_privilege('authenticated', 'public.error_logs', 'DELETE'),
  'authenticated não pode apagar um registro de erro');

select ok(not has_table_privilege('anon', 'public.error_logs', 'INSERT'),
  'anon não pode inserir: a chave publicável está no bundle e a tabela ficaria aberta');

select ok(not has_table_privilege('anon', 'public.error_logs', 'SELECT'),
  'anon não pode ler error_logs');

-- ---------- comportamento ----------
-- Sem `returning`: retornar colunas exigiria privilégio de leitura, que a
-- tabela deliberadamente não concede.
select lives_ok(
  $$ insert into public.error_logs (owner_id, message, route)
     values ('11111111-1111-1111-1111-111111111111', 'TypeError: x is not a function', '/clients/1') $$,
  'o dono registra um erro com o próprio identificador');

select throws_ok(
  $$ insert into public.error_logs (owner_id, message)
     values ('22222222-2222-2222-2222-222222222222', 'Erro plantado') $$,
  '42501', null, 'registrar erro com owner_id alheio é recusado pela política');

select throws_ok(
  $$ select * from public.error_logs $$,
  '42501', null, 'ler error_logs é recusado mesmo para o próprio dono');

select throws_ok(
  $$ insert into public.error_logs (owner_id, message)
     values ('11111111-1111-1111-1111-111111111111', repeat('e', 2001)) $$,
  '23514', null, 'mensagem com mais de 2000 caracteres é recusada');

-- ---------- a linha existe de fato ----------
-- Voltar ao papel do dono da tabela é o único caminho de leitura, e é
-- exatamente assim que a inspeção acontece em produção.
set local role postgres;

select results_eq(
  $$ select message from public.error_logs
      where owner_id = '11111111-1111-1111-1111-111111111111' $$,
  array['TypeError: x is not a function'],
  'o registro gravado pelo dono está lá, legível por conexão de serviço');

select ok(
  exists (select 1 from pg_indexes
           where schemaname = 'public' and tablename = 'error_logs'
             and indexname = 'error_logs_owner_created_idx'),
  'índice error_logs_owner_created_idx existe — serve à inspeção por usuário e período');

select * from finish();
rollback;
