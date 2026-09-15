begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- As extensões precisam viver em `extensions`, e não em `public`. É o schema
-- que o Supabase reserva para elas, e é o que torna previsível a qualificação
-- `extensions.gin_trgm_ops` usada pelos índices de busca.
select is(
  (select n.nspname::text
     from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm'),
  'extensions',
  'pg_trgm está instalada no schema extensions'
);

select is(
  (select n.nspname::text
     from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'unaccent'),
  'extensions',
  'unaccent está instalada no schema extensions'
);

-- O comportamento que a busca da feature clients depende.
select is(
  public.immutable_unaccent('São João Ç Ünïcôde'),
  'Sao Joao C Unicode',
  'immutable_unaccent remove acentos e cedilha preservando o resto'
);

-- Se o envelope deixar de ser IMMUTABLE, a coluna gerada search_text e seu
-- índice GIN param de ser criáveis. Esta asserção é o alarme disso.
select is(
  (select provolatile::text from pg_proc
    where proname = 'immutable_unaccent' and pronamespace = 'public'::regnamespace),
  'i',
  'immutable_unaccent está marcada como IMMUTABLE'
);

-- Prova de uso real: não basta a marcação, o planner precisa aceitar a
-- expressão dentro de um índice de trigrama.
select lives_ok(
  $$
    create table _t7_probe (nome text);
    create index _t7_probe_idx on _t7_probe
      using gin ((public.immutable_unaccent(lower(nome))) extensions.gin_trgm_ops);
  $$,
  'immutable_unaccent é utilizável em índice GIN de trigrama'
);

-- set_updated_at precisa sobrescrever, não apenas preencher: o cliente pode
-- enviar qualquer valor nessa coluna pela API (FND-06).
create table _t7_touch (id int primary key, updated_at timestamptz not null default now());
create trigger _t7_touch_updated_at before update on _t7_touch
  for each row execute function public.set_updated_at();
insert into _t7_touch (id, updated_at) values (1, '2001-01-01'::timestamptz);
update _t7_touch set updated_at = '2001-01-01'::timestamptz where id = 1;

select ok(
  (select updated_at from _t7_touch where id = 1) > '2020-01-01'::timestamptz,
  'set_updated_at descarta o updated_at enviado pelo cliente e grava o instante corrente'
);

select * from finish();
rollback;
