begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- Forma das políticas de RLS, verificada no catálogo.
--
-- Esta suíte não testa comportamento: testa a FORMA que o AD-003 exige. Duas
-- regressões plausíveis não mudam nada de observável hoje e por isso não são
-- pegas por nenhum outro teste:
--
--   1. perder `to authenticated`, que faz a política ser avaliada também para
--      o papel anônimo — hoje inofensivo porque `anon` não tem grant, mas é a
--      segunda camada de defesa desaparecendo em silêncio;
--   2. trocar `(select auth.uid())` por `auth.uid()`, que faz a função ser
--      reavaliada por linha em vez de uma vez por consulta.
--
-- As asserções varrem o catálogo em vez de enumerar as políticas, para que
-- tabela nova entre na verificação sem ninguém lembrar de acrescentá-la.

-- ---------- controle positivo ----------
-- Sem isto, todas as asserções abaixo passariam vacuamente caso o filtro não
-- casasse com política alguma.
-- 11 = clients 4, notes 4, profiles 2, error_logs 1.
select is(
  (select count(*)::int from pg_policies where schemaname = 'public'),
  11,
  'o schema public tem as 11 políticas do design: clients 4, notes 4, profiles 2, error_logs 1'
);

select is(
  (select count(distinct tablename)::int from pg_policies where schemaname = 'public'),
  4,
  'as quatro tabelas do produto têm política'
);

-- ---------- papel explícito ----------
select is_empty(
  $$ select tablename || '.' || policyname
       from pg_policies
      where schemaname = 'public'
        and roles <> '{authenticated}'::name[] $$,
  'toda política declara `to authenticated`, e nenhuma cai em {public}'
);

-- ---------- avaliação por subconsulta ----------
-- `(select auth.uid())` é normalizado pelo catálogo como `SELECT auth.uid()`.
-- A chamada crua aparece como `auth.uid()` sem o SELECT à frente.
select is_empty(
  $$ select tablename || '.' || policyname || ' [using]'
       from pg_policies
      where schemaname = 'public'
        and qual like '%auth.uid()%'
        and qual not like '%SELECT auth.uid()%' $$,
  'nenhuma cláusula USING chama auth.uid() fora de subconsulta'
);

select is_empty(
  $$ select tablename || '.' || policyname || ' [with check]'
       from pg_policies
      where schemaname = 'public'
        and with_check like '%auth.uid()%'
        and with_check not like '%SELECT auth.uid()%' $$,
  'nenhuma cláusula WITH CHECK chama auth.uid() fora de subconsulta'
);

-- ---------- RLS ligada onde há política ----------
select is_empty(
  $$ select c.relname::text
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and exists (select 1 from pg_policies p
                     where p.schemaname = 'public' and p.tablename = c.relname::text)
        and not c.relrowsecurity $$,
  'nenhuma tabela tem política sem ter RLS habilitada'
);

select * from finish();
rollback;
