-- Criação automática do perfil no cadastro (AD-005).
--
-- O frontend não insere em profiles: a tabela não concede insert a ninguém.
-- Quem escreve é esta função, com security definer, executando com os
-- privilégios de quem a criou. search_path vazio impede sequestro de caminho:
-- toda referência precisa ser qualificada.
--
-- A função é deliberadamente trivial. Uma exceção aqui aborta a transação de
-- cadastro inteira, e o usuário vê uma falha genérica de banco — por isso ela
-- não faz nada além de um insert, e o coalesce cobre metadados ausentes em vez
-- de deixar o not null estourar.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g'), '')
  );
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Trigger AFTER INSERT em auth.users: cria a linha correspondente em profiles (AD-005).';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
