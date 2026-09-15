begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email, instance_id)
values ('11111111-1111-1111-1111-111111111111', 'dono@exemplo.com',
        '00000000-0000-0000-0000-000000000000');

insert into public.clients (owner_id, name, email, phone)
values
  ('11111111-1111-1111-1111-111111111111', 'João da Conceição', 'Joao.Silva@Exemplo.com', '(11) 98765-4321'),
  ('11111111-1111-1111-1111-111111111111', 'Ana Souza', null, null);

-- ---------- a coluna gerada ----------
select is(
  (select search_text from public.clients where name = 'João da Conceição'),
  'joao da conceicao joao.silva@exemplo.com 11987654321',
  'search_text concatena nome, e-mail e telefone em minúsculas e sem acento'
);

select is(
  (select search_text from public.clients where name = 'Ana Souza'),
  'ana souza  ',
  'campos nulos viram vazio em vez de anular a coluna inteira'
);

-- ---------- o que a busca da listagem precisa fazer ----------
select results_eq(
  $$ select name from public.clients where search_text like '%joao%' order by name $$,
  array['João da Conceição'],
  'buscar sem acento encontra o nome acentuado'
);

select results_eq(
  $$ select name from public.clients where search_text like '%conceicao%' $$,
  array['João da Conceição'],
  'a busca casa por parte do nome, não só pelo começo'
);

select results_eq(
  $$ select name from public.clients where search_text like '%98765%' $$,
  array['João da Conceição'],
  'buscar por trecho do telefone encontra o cliente'
);

select results_eq(
  $$ select name from public.clients where search_text like '%silva@exemplo%' $$,
  array['João da Conceição'],
  'buscar por trecho do e-mail encontra o cliente'
);

-- ---------- a coluna é derivada, não escrita ----------
select throws_ok(
  $$ update public.clients set search_text = 'forjado' $$,
  '428C9',
  null,
  'search_text não pode ser escrita: é sempre derivada dos campos de origem'
);

-- ---------- os índices ----------
select ok(
  exists (select 1 from pg_indexes
           where schemaname = 'public' and tablename = 'clients'
             and indexname = 'clients_owner_created_idx'),
  'índice clients_owner_created_idx existe — serve à listagem padrão ordenada por data'
);

select ok(
  exists (select 1 from pg_indexes
           where schemaname = 'public' and tablename = 'clients'
             and indexname = 'clients_owner_name_idx'),
  'índice clients_owner_name_idx existe — serve à ordenação alternativa por nome'
);

select ok(
  exists (select 1 from pg_indexes
           where schemaname = 'public' and tablename = 'clients'
             and indexname = 'clients_owner_status_idx'),
  'índice clients_owner_status_idx existe — serve à filtro de status'
);

select ok(
  exists (select 1 from pg_indexes
           where schemaname = 'public' and tablename = 'clients'
             and indexname = 'clients_owner_source_idx'),
  'índice clients_owner_source_idx existe — serve à filtro de origem'
);

select ok(
  exists (select 1 from pg_indexes
           where schemaname = 'public' and tablename = 'clients'
             and indexname = 'clients_owner_region_idx'),
  'índice clients_owner_region_idx existe — serve à filtro de região, insensível a caixa'
);

select ok(
  exists (select 1 from pg_indexes
           where schemaname = 'public' and tablename = 'clients'
             and indexname = 'clients_search_trgm_idx'),
  'índice clients_search_trgm_idx existe — serve à busca parcial por trigrama'
);

-- Numa tabela com duas linhas o planner escolhe varredura sequencial, e está
-- certo. Desligar seqscan isola o que esta asserção quer provar: que a classe
-- de operadores do índice casa com a forma `like '%termo%'`. Sem essa
-- checagem, um gin_trgm_ops ausente ou trocado passaria despercebido até a
-- listagem ficar lenta em produção.
create function pg_temp.plano(q text) returns text language plpgsql as $$
declare linha text; acc text := '';
begin
  for linha in execute 'explain (costs off) ' || q loop
    acc := acc || linha || E'\n';
  end loop;
  return acc;
end $$;

set local enable_seqscan = off;

-- Verificar apenas que o nome do índice aparece no plano é insuficiente: com
-- seqscan desligado, o planner varre um btree inteiro e o nome aparece do
-- mesmo jeito. As duas asserções de catálogo abaixo fixam o mecanismo — método
-- de acesso e classe de operadores — e a de plano exige o nó de bitmap, que é
-- o que um GIN produz ao atender de fato o predicado.
select is(
  (select am.amname::text from pg_class c
     join pg_am am on am.oid = c.relam
    where c.relname = 'clients_search_trgm_idx'),
  'gin',
  'clients_search_trgm_idx usa o método de acesso GIN'
);

select is(
  (select opc.opcname::text from pg_index i
     join pg_class c on c.oid = i.indexrelid
     join pg_opclass opc on opc.oid = i.indclass[0]
    where c.relname = 'clients_search_trgm_idx'),
  'gin_trgm_ops',
  'clients_search_trgm_idx usa a classe de operadores gin_trgm_ops'
);

select ok(
  position('Bitmap Index Scan on clients_search_trgm_idx' in
    pg_temp.plano($$ select 1 from public.clients where search_text like '%joao%' $$)) > 0,
  'o planner atende a busca parcial por varredura de bitmap sobre o índice de trigrama'
);

select * from finish();
rollback;
