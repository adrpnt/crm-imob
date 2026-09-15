-- Coluna de busca e índices de clients.
--
-- Separada da migration da tabela de propósito: aquela define o que o dado é
-- e quem o alcança; esta só afeta desempenho. Um rollback daqui não derruba a
-- segurança.

-- A busca da listagem precisa ignorar caixa e acento (spec de clients). Uma
-- expressão ilike sobre unaccent(...) em tempo de consulta não usa índice
-- nenhum. A coluna gerada paga o custo na escrita, que é rara, em vez de na
-- leitura, que é constante. Cobre também o telefone, que é gravado só com
-- dígitos e por isso não casaria com o termo digitado com máscara.
alter table public.clients
  add column search_text text
  generated always as (
    public.immutable_unaccent(
      lower(coalesce(name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone, ''))
    )
  ) stored;

comment on column public.clients.search_text is
  'Derivada de name, email e phone, sem acento e em minúsculas. Alvo da busca parcial da listagem.';

-- Todo índice de filtro tem owner_id à esquerda: a RLS injeta
-- owner_id = auth.uid() em toda consulta, então um índice isolado em status
-- nunca seria a melhor escolha do planner.
create index clients_owner_created_idx on public.clients (owner_id, created_at desc);
create index clients_owner_name_idx on public.clients (owner_id, name);
create index clients_owner_status_idx on public.clients (owner_id, status);
create index clients_owner_source_idx on public.clients (owner_id, source);
create index clients_owner_region_idx on public.clients (owner_id, lower(region));

-- Exceção deliberada à regra acima: serve ao `exists` das políticas de notes,
-- que casa por id e só precisa ler owner_id (AD-004).
create index clients_id_owner_idx on public.clients (id, owner_id);

-- gin_trgm_ops é qualificado porque pg_trgm vive em `extensions`, e não no
-- search_path padrão de quem aplica a migration.
create index clients_search_trgm_idx on public.clients
  using gin (search_text extensions.gin_trgm_ops);
