begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

-- Trigger de updated_at nas tabelas REAIS, e os limites que ficaram sem
-- asserção na primeira passada.
--
-- A função set_updated_at já era testada, mas numa tabela temporária: a
-- ligação com profiles, clients e notes não era verificada. Remover qualquer
-- um dos três triggers passava despercebido, e updated_at começaria a mentir
-- em silêncio — levando junto a ordenação por "última atualização" das
-- features seguintes.

insert into auth.users (id, email, instance_id, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', 'dono@exemplo.com',
        '00000000-0000-0000-0000-000000000000', '{"full_name":"Dono"}'::jsonb);

insert into public.clients (id, owner_id, name)
values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'Cliente Teste');

insert into public.notes (id, client_id, title)
values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
        'Nota Teste');

-- ---------- o trigger existe em cada tabela ----------
-- tgtype = 19 é ROW | BEFORE | UPDATE. Verificar só o nome deixaria passar um
-- trigger ligado ao evento errado: foi exatamente essa a lacuna que a segunda
-- verificação encontrou nesta suíte.
select is(
  (select tgtype::int from pg_trigger
    where tgrelid = 'public.profiles'::regclass and tgname = 'profiles_set_updated_at'),
  19, 'profiles tem o trigger de updated_at em BEFORE UPDATE por linha');

select is(
  (select tgtype::int from pg_trigger
    where tgrelid = 'public.clients'::regclass and tgname = 'clients_set_updated_at'),
  19, 'clients tem o trigger de updated_at em BEFORE UPDATE por linha');

select is(
  (select tgtype::int from pg_trigger
    where tgrelid = 'public.notes'::regclass and tgname = 'notes_set_updated_at'),
  19, 'notes tem o trigger de updated_at em BEFORE UPDATE por linha');

-- ---------- e faz efeito ----------
-- Efeito do trigger, semeando um valor antigo com ele desligado.
--
-- Duas armadilhas motivam esta forma. Comparar contra uma data fixa passa
-- mesmo com o trigger no evento errado, porque o valor teria sido escrito no
-- insert. E comparar antes/depois dentro da transação não funciona, porque
-- `now()` devolve o instante de início da transação e não avança. Semear com o
-- trigger desligado resolve as duas: se ele não disparar no update, o valor de
-- 2001 sobrevive e a asserção cai.
alter table public.profiles disable trigger profiles_set_updated_at;
alter table public.clients  disable trigger clients_set_updated_at;
alter table public.notes    disable trigger notes_set_updated_at;

update public.profiles set updated_at = '2001-01-01'::timestamptz
 where id = '11111111-1111-1111-1111-111111111111';
update public.clients set updated_at = '2001-01-01'::timestamptz
 where id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.notes set updated_at = '2001-01-01'::timestamptz
 where id = 'cccccccc-0000-0000-0000-000000000001';

alter table public.profiles enable trigger profiles_set_updated_at;
alter table public.clients  enable trigger clients_set_updated_at;
alter table public.notes    enable trigger notes_set_updated_at;

update public.profiles set full_name = 'Dono Corrigido'
 where id = '11111111-1111-1111-1111-111111111111';
select ok(
  (select updated_at from public.profiles where id = '11111111-1111-1111-1111-111111111111')
    > '2020-01-01'::timestamptz,
  'atualizar um perfil descarta o updated_at antigo e grava o instante corrente');

update public.clients set name = 'Cliente Corrigido'
 where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select ok(
  (select updated_at from public.clients where id = 'aaaaaaaa-0000-0000-0000-000000000001')
    > '2020-01-01'::timestamptz,
  'atualizar um cliente descarta o updated_at antigo e grava o instante corrente');

update public.notes set title = 'Nota Corrigida'
 where id = 'cccccccc-0000-0000-0000-000000000001';
select ok(
  (select updated_at from public.notes where id = 'cccccccc-0000-0000-0000-000000000001')
    > '2020-01-01'::timestamptz,
  'atualizar uma nota descarta o updated_at antigo e grava o instante corrente');

-- ---------- default de status ----------
select is(
  (select status from public.clients where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'lead',
  'um cliente inserido sem status nasce como lead');

-- ---------- limites de tamanho sem asserção na primeira passada ----------
select throws_ok(
  $$ insert into public.clients (owner_id, name)
     values ('11111111-1111-1111-1111-111111111111', repeat('n', 121)) $$,
  '23514', null, 'nome com mais de 120 caracteres é recusado');

select throws_ok(
  $$ insert into public.clients (owner_id, name, email)
     values ('11111111-1111-1111-1111-111111111111', 'Fulano',
             repeat('a', 250) || '@exemplo.com') $$,
  '23514', null, 'e-mail com mais de 254 caracteres é recusado');

select throws_ok(
  $$ insert into public.clients (owner_id, name, phone)
     values ('11111111-1111-1111-1111-111111111111', 'Fulano', repeat('9', 21)) $$,
  '23514', null, 'telefone com mais de 20 dígitos é recusado');

select throws_ok(
  $$ insert into public.clients (owner_id, name, phone)
     values ('11111111-1111-1111-1111-111111111111', 'Fulano', '1234567') $$,
  '23514', null, 'telefone com menos de 8 dígitos é recusado');

select throws_ok(
  $$ insert into public.clients (owner_id, name, income)
     values ('11111111-1111-1111-1111-111111111111', 'Fulano', 100000000) $$,
  '23514', null, 'renda acima de 99.999.999,99 é recusada');

select lives_ok(
  $$ insert into public.clients (owner_id, name, income)
     values ('11111111-1111-1111-1111-111111111111', 'Fulano', 99999999.99) $$,
  'renda exatamente no limite é aceita');

select throws_ok(
  $$ insert into public.profiles (id, full_name, email)
     values (gen_random_uuid(), repeat('n', 121), 'x@y.com') $$,
  '23514', null, 'nome de perfil com mais de 120 caracteres é recusado');

select throws_ok(
  $$ insert into public.error_logs (owner_id, message, route)
     values ('11111111-1111-1111-1111-111111111111', 'erro', repeat('r', 501)) $$,
  '23514', null, 'rota com mais de 500 caracteres é recusada');

select throws_ok(
  $$ insert into public.notes (client_id, title, description)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Titulo', repeat('d', 5001)) $$,
  '23514', null, 'descrição de nota com mais de 5000 caracteres é recusada');

-- ---------- normalização também em UPDATE ----------
-- O trigger é BEFORE INSERT OR UPDATE, mas só o caminho de insert tinha
-- asserção. Um trigger declarado apenas para insert passaria despercebido.
select results_eq(
  $$ update public.clients
        set phone = '(21) 91234-5678', region = '  Barra   da   Tijuca  '
      where id = 'aaaaaaaa-0000-0000-0000-000000000001'
     returning phone || '|' || region $$,
  array['21912345678|Barra da Tijuca'],
  'a normalização vale também em update, não só em insert');

select results_eq(
  $$ update public.clients set region = '   '
      where id = 'aaaaaaaa-0000-0000-0000-000000000001'
     returning coalesce(region, 'NULO') $$,
  array['NULO'],
  'em update, região só com espaços também vira nulo');

-- ---------- profiles.id é imutável pela aplicação ----------
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'id', 'UPDATE'),
  'authenticated não tem privilégio de UPDATE em profiles.id');

select ok(
  has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE'),
  'controle positivo: authenticated tem privilégio de UPDATE em profiles.full_name');

-- ---------- conjuntos de domínio, pela definição exata ----------
-- Amostrar um valor inválido não detecta o conjunto sendo alargado nem
-- encurtado. Assertar a definição normalizada pega as duas direções.
select is(
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'clients_status_allowed'),
  $def$CHECK ((status = ANY (ARRAY['lead'::text, 'contacted'::text, 'qualified'::text, 'client'::text, 'inactive'::text])))$def$,
  'o domínio de status é exatamente os cinco valores do spec');

select is(
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'clients_source_allowed'),
  $def$CHECK (((source IS NULL) OR (source = ANY (ARRAY['indication'::text, 'instagram'::text, 'website'::text, 'whatsapp'::text, 'portal'::text, 'other'::text]))))$def$,
  'o domínio de origem é exatamente os seis valores do spec');

select is(
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'clients_income_type_allowed'),
  $def$CHECK (((income_type IS NULL) OR (income_type = ANY (ARRAY['formal'::text, 'informal'::text, 'mixed'::text]))))$def$,
  'o domínio de tipo de renda é exatamente os três valores decididos');

select * from finish();
rollback;
