# CRM Imobiliário

CRM web para um consultor imobiliário: cadastro de clientes, notas por cliente,
busca e filtros. Frontend em React que fala direto com o Supabase, sem backend
próprio — a autorização vive inteiramente nas políticas de Row Level Security do
Postgres.

**Estado atual:** a fundação está pronta (banco, segurança, esqueleto do app).
Autenticação, telas de clientes e notas ainda não foram implementadas.

## Pré-requisitos

|        |                                                   |
| ------ | ------------------------------------------------- |
| Node   | 22 ou superior                                    |
| Docker | em execução — o Supabase local roda em containers |

O CLI do Supabase é dependência do projeto. Não instale nada global.

## Primeira execução

```bash
npm ci
npx supabase start          # baixa as imagens na primeira vez; leva alguns minutos
cp .env.example .env.local
```

O `supabase start` imprime as credenciais locais ao terminar. Copie `API URL` e
`anon key` para o `.env.local`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key impressa pelo supabase start>
```

Essas chaves não são segredo: o CLI as deriva de um segredo fixo e documentado,
e são idênticas em toda máquina. A `service_role key` é outra história — ela
nunca deve entrar em uma variável `VITE_*`, porque tudo com esse prefixo vai
para o bundle do navegador.

```bash
npm run dev                 # http://localhost:5173
```

Se uma variável de ambiente faltar, a aplicação falha na inicialização dizendo
qual — de propósito, para não quebrar depois com um erro de rede sem contexto.

## Scripts

| Script                 | O que faz                                        |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Servidor de desenvolvimento                      |
| `npm run build`        | Verificação de tipos e build de produção         |
| `npm run preview`      | Serve o build localmente                         |
| `npm run lint`         | ESLint, falhando em qualquer aviso               |
| `npm run format`       | Verifica formatação                              |
| `npm run format:write` | Aplica formatação                                |
| `npm run typecheck`    | Só a verificação de tipos                        |
| `npm run test:unit`    | Testes unitários e de componente (Vitest, jsdom) |
| `npm run test:db`      | Testes de schema e políticas (pgTAP)             |
| `npm run test:rls`     | Isolamento entre usuários pelo cliente Supabase  |
| `npm run test:e2e`     | Fluxo em navegador real (Playwright)             |
| `npm run db:reset`     | Reconstrói o banco local a partir das migrations |
| `npm run db:types`     | Regenera `src/types/database.types.ts` do schema |

`test:db` e `test:rls` exigem o Supabase local no ar. Se não estiver, a suíte
falha dizendo isso em vez de estourar com erro de rede.

## Banco de dados

O schema vive em `supabase/migrations/`, versionado no repositório. O dashboard
do Supabase **não** é a fonte da verdade.

### Criar uma migration

```bash
npx supabase migration new nome_descritivo
```

Isso cria um arquivo com prefixo de timestamp **em UTC**. Se você criar o
arquivo à mão, use `date -u +%Y%m%d%H%M%S` — usar a hora local pode colocar a
migration antes de outra já existente, e o `db:reset` quebra.

Depois de escrever o SQL:

```bash
npm run db:reset            # aplica tudo do zero
npm run db:types            # regenera os tipos
npm run test:db             # confirma que nada quebrou
```

### Migrations aplicadas nunca são editadas

Alterar um arquivo já aplicado faz o histórico local divergir do remoto e
quebra a reprodutibilidade. Para mudar algo, escreva uma migration nova que
altere o que precisa — inclusive para remover um índice ou uma coluna.

### As duas camadas de autorização

Toda tabela tem duas defesas independentes:

1. **`grant` por coluna** define o que o papel `authenticated` pode tocar.
   Colunas que a aplicação nunca deve alterar — `owner_id`, `created_at`,
   `updated_at`, `profiles.email` — simplesmente ficam fora do grant.
2. **Política de RLS** define quais linhas.

Ao adicionar uma coluna editável, lembre de incluí-la no grant de `update`.
Esquecer produz um erro de permissão confuso em tempo de execução.

## Testes

Quatro suítes, cada uma cobrindo o que as outras não alcançam:

| Suíte           | Onde                       | O que só ela pega                                                         |
| --------------- | -------------------------- | ------------------------------------------------------------------------- |
| pgTAP           | `supabase/tests/database/` | A matriz de políticas dentro do banco, incluindo negação ao papel anônimo |
| RLS por cliente | `tests/rls/`               | Grants, exposição de schema e o comportamento real do PostgREST           |
| Unitários       | `src/**/*.test.{ts,tsx}`   | Lógica de módulos e componentes                                           |
| E2E             | `e2e/`                     | Layout, navegação e erros de console em navegador real                    |

Ao mexer em política ou grant, rode `test:db` **e** `test:rls`. Uma passa sem a
outra em casos reais: há mudanças que só o catálogo denuncia, e outras que só
aparecem atravessando a API.

## Diagnosticar um erro relatado

Falhas capturadas pela aplicação vão para `public.error_logs`. A tabela é de
escrita de mão única: o usuário grava e não lê. Para inspecionar, use o Studio
local (`http://127.0.0.1:54323`) ou uma conexão de serviço:

```sql
select created_at, route, message, stack
  from public.error_logs
 where owner_id = '<id do usuário>'
 order by created_at desc
 limit 20;
```

Erros ocorridos em rotas públicas, sem sessão, não são persistidos — ficam só no
console do navegador. Persistir exigiria abrir a tabela para escrita anônima, e
a chave publicável está no bundle.

## Estrutura

```
src/
  app/          App, rotas e provedores
  components/   ui, layout e feedback
  features/     auth, clients, notes (ainda vazios)
  lib/          env, cliente Supabase, query client, registro de erros
  styles/       tokens de design em @theme
  types/        tipos gerados do banco (não editar à mão)
supabase/
  migrations/   fonte da verdade do schema
  tests/        suíte pgTAP
tests/rls/      isolamento pelo cliente Supabase
e2e/            Playwright
.specs/         especificações, decisões e plano de tarefas
```

## Onde está o resto da documentação

- `.specs/STATE.md` — as decisões de projeto e por que foram tomadas
- `.specs/features/*/spec.md` — requisitos com critérios de aceite
- `.specs/features/foundation/design.md` — modelo de dados, riscos e trade-offs
- `PLAN.md` — o plano original que originou tudo

Configurações do Supabase que **não** vivem em migrations — confirmação de
e-mail desativada, URLs de redirecionamento — serão documentadas pela feature
`deploy`.
