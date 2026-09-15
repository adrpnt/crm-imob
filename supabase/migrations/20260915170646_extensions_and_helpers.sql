-- Extensões e funções auxiliares compartilhadas por todas as tabelas.
--
-- Esta migration não cria nenhuma tabela. Ela existe para que profiles,
-- clients e notes possam depender de um mesmo trigger de updated_at e de um
-- envelope de unaccent que seja indexável.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Mantém updated_at sob controle do banco. O valor que o cliente enviar é
-- descartado: sem isso a coluna existe, mas nada garante que ela diga a
-- verdade (FND-06).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: sobrescreve updated_at com now(), ignorando o valor enviado pelo cliente.';

-- unaccent() é STABLE porque o dicionário é resolvido pelo search_path em
-- tempo de execução. Isso impede seu uso em expressão de índice e em coluna
-- gerada. Fixando o dicionário no primeiro argumento, o resultado passa a ser
-- determinístico e o envelope IMMUTABLE é legítimo (FND-07).
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;

comment on function public.immutable_unaccent(text) is
  'Envelope determinístico de unaccent, indexável. Usado pela coluna gerada clients.search_text.';
