# Foundation Specification

## Problem Statement

Não existe código nem banco: o repositório contém apenas o `PLAN.md`. Autenticação, clientes e notas dependem todos de um mesmo alicerce — um app que roda, um schema com as políticas de acesso corretas e tipos derivados desse schema. Como o frontend fala direto com o Supabase, sem backend próprio (AD-001), as políticas de Row Level Security escritas aqui são a única fronteira de autorização do produto inteiro: um erro nelas vaza a carteira de clientes de um usuário para outro.

## Goals

- [ ] `npm run dev` sobe a aplicação com uma rota renderizando, com Tailwind e o cliente Supabase configurados.
- [ ] `supabase db reset` reconstrói o schema completo do zero a partir de migrations versionadas, sem nenhum passo manual.
- [ ] Um teste automatizado prova, contra o Supabase local, que o usuário A não lê, altera nem apaga dado do usuário B em nenhuma das tabelas.
- [ ] `src/types/database.types.ts` é gerado a partir do schema e compila sem erro.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build` passam em um projeto sem funcionalidade de produto.

## Out of Scope

Explicitamente excluído. Documentado para evitar expansão de escopo.

| Feature | Reason |
| ------- | ------ |
| Telas de login, cadastro e recuperação de senha | Pertencem à feature `auth`; aqui entra apenas a configuração do Supabase Auth e o schema que a sustenta. |
| CRUD de clientes e notas | Pertencem a `clients` e `notes`; aqui entram somente as tabelas, constraints, índices e políticas. |
| Publicação na Vercel | Pertence à feature `deploy`. |
| Storage de arquivos, Realtime, Edge Functions | PLAN §2 os cita como possibilidades futuras; nenhuma funcionalidade do MVP os usa. |
| Tabelas de imóveis, tarefas, funil e agenda | PLAN §15 — evolução futura. |
| Biblioteca de componentes visuais completa | Só os tokens de tema e o layout base entram aqui; os componentes nascem na feature que primeiro os exige. |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui — nada fica silenciosamente indefinido.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Tipo Postgres de `income`, descrito como `number` no PLAN §4 | `numeric(12,2)`, valores em BRL, sem símbolo de moeda armazenado | `number` não existe no Postgres. `numeric` evita o erro de arredondamento binário do ponto flutuante em valor monetário; 12 dígitos cobrem até 9.999.999.999,99 | y |
| Idioma dos artefatos | Specs, comentários e mensagens de UI em português; identificadores de código, colunas e valores de domínio em inglês | Segue o que o próprio PLAN §4 já faz (`owner_id`, `status = 'lead'`) e mantém o código legível para ferramentas e bibliotecas | n |
| Limites de tamanho de campo, não definidos no PLAN §9 | `name` 2–120, `email` ≤ 254, `phone` ≤ 20 dígitos, `region` ≤ 80, `notes.title` 1–120, `notes.description` ≤ 5000, `income` 0–99.999.999,99 | Sem limite no banco, um único registro pode carregar megabytes. 254 é o máximo de um endereço de e-mail pela RFC 5321; os demais são folgados para o domínio e baratos de afrouxar depois | n |
| Formato de armazenamento de telefone | Apenas dígitos, sem máscara; a formatação acontece na exibição | O PLAN §7 pede busca por telefone. Guardar `(11) 98765-4321` faz a busca por `11987654321` falhar. Normalizar na escrita torna a busca previsível | n |
| Exclusão de cliente | Exclusão física com `on delete cascade` para as notas | PLAN §7 diz que a ação "não poderá ser desfeita"; exclusão lógica contradiz essa promessa e obrigaria todo filtro a carregar um predicado extra | n |
| Estratégia de migração quando o schema evoluir | Migrations aditivas; nenhuma edição de arquivo de migration já aplicado | Editar uma migration aplicada faz o histórico local divergir do remoto e quebra `db reset` | n |
| Versões das dependências | Últimas estáveis no momento da instalação, fixadas exatamente (sem `^`) no `package.json` mais lockfile commitado | PLAN §2 pede isso. Fixar exato impede que uma minor de terceiro altere o comportamento entre a máquina local e a Vercel | n |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Esqueleto da aplicação executável ⭐ MVP

**User Story**: Como desenvolvedor, quero um projeto que sobe, compila e passa no lint desde o primeiro commit, para que cada feature seguinte tenha um ponto de partida verificável.

**Why P1**: Nenhuma outra tarefa pode ser verificada antes disto existir.

**Acceptance Criteria**:

1. WHEN `npm run dev` é executado THEN o sistema SHALL servir a aplicação em um endereço local com uma rota raiz renderizando sem erro no console.
2. The system SHALL aplicar os estilos do Tailwind CSS v4 através do plugin `@tailwindcss/vite`, com os tokens de cor, espaçamento e tipografia declarados por `@theme` em `src/styles/globals.css`.
3. WHEN `npm run build` é executado THEN o sistema SHALL gerar o bundle de produção com código de saída zero.
4. WHEN `npm run lint` ou `npm run typecheck` é executado THEN o sistema SHALL terminar com código de saída zero e nenhum aviso.
5. The system SHALL organizar o código em `src/app`, `src/components`, `src/features`, `src/lib`, `src/styles` e `src/types`, conforme PLAN §3.
6. IF uma variável de ambiente obrigatória (`VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY`) estiver ausente ou vazia na inicialização THEN o sistema SHALL lançar um erro nomeando a variável faltante, em vez de falhar depois com erro de rede.
7. The system SHALL versionar um `.env.example` contendo as duas chaves sem valores, e SHALL manter `.env.local` fora do controle de versão.

**Independent Test**: Clonar o repositório, copiar `.env.example` para `.env.local`, preencher, rodar `npm run dev` e ver a página. Apagar uma das variáveis e ver o erro nomeando-a.

---

### P1: Schema versionado e reproduzível ⭐ MVP

**User Story**: Como desenvolvedor, quero o schema inteiro descrito em migrations no repositório, para que o banco local, o de testes e o de produção sejam idênticos e o histórico seja auditável.

**Why P1**: É a pré-condição do teste automatizado de RLS e da paridade entre ambientes (AD-002).

**Acceptance Criteria**:

1. WHEN `supabase db reset` é executado THEN o sistema SHALL reconstruir `profiles`, `clients`, `notes` e `error_logs` com todas as constraints, índices, triggers e políticas, sem nenhuma intervenção manual.
2. The system SHALL definir `profiles.id` como chave primária referenciando `auth.users(id)` com `on delete cascade`.
3. The system SHALL definir `notes.client_id` como chave estrangeira para `clients(id)` com `on delete cascade`.
4. The system SHALL restringir `clients.status` aos valores `lead`, `contacted`, `qualified`, `client` e `inactive` por check constraint, com `lead` como padrão.
5. The system SHALL restringir `clients.source` aos valores `indication`, `instagram`, `website`, `whatsapp`, `portal` e `other` por check constraint.
6. The system SHALL restringir `clients.income_type` aos valores `formal`, `informal` e `mixed` por check constraint, aceitando nulo.
7. WHEN uma linha de `profiles`, `clients` ou `notes` é atualizada THEN o sistema SHALL gravar o instante corrente em `updated_at` por trigger, ignorando qualquer valor que o cliente tenha enviado para essa coluna.
8. WHEN um cliente é inserido ou atualizado THEN o sistema SHALL normalizar `region` removendo espaços nas pontas e colapsando espaços internos, e SHALL gravar `phone` contendo apenas dígitos.
9. IF um insert violar um limite de tamanho declarado na tabela de premissas THEN o sistema SHALL rejeitar a operação com erro de constraint.
10. The system SHALL criar os índices `clients(owner_id, created_at desc)`, `clients(owner_id, status)`, `clients(owner_id, source)`, `clients(owner_id, lower(region))`, `clients(id, owner_id)` e `notes(client_id, created_at desc)`.
11. The system SHALL criar a extensão `pg_trgm` e um índice GIN cobrindo `clients.name` e `clients.email` para a busca textual.

**Independent Test**: Rodar `supabase db reset` num banco limpo, depois `\d+ clients` no psql e conferir colunas, constraints e índices contra este spec.

---

### P1: Isolamento de dados por usuário, provado por teste ⭐ MVP

**User Story**: Como consultor, quero a certeza de que nenhum outro usuário do sistema alcança meus clientes e minhas notas, para que eu possa registrar dados reais de pessoas na ferramenta.

**Why P1**: É a garantia mais crítica do produto e, sem backend próprio (AD-001), só a RLS a sustenta.

**Acceptance Criteria**:

1. The system SHALL manter Row Level Security habilitada em `profiles`, `clients`, `notes` e `error_logs`.
2. The system SHALL escrever toda política usando `(select auth.uid())` e declarando `to authenticated`, conforme AD-003.
3. WHEN um usuário autenticado consulta `clients` THEN o sistema SHALL retornar exclusivamente as linhas cujo `owner_id` é igual ao seu identificador.
4. IF um usuário autenticado tentar inserir em `clients` um `owner_id` diferente do seu THEN o sistema SHALL rejeitar a operação por violação de política.
5. IF um usuário autenticado tentar atualizar ou excluir um cliente de outro usuário THEN o sistema SHALL afetar zero linhas.
6. WHEN um usuário autenticado consulta `notes` THEN o sistema SHALL retornar somente notas cujo cliente relacionado tem `owner_id` igual ao seu.
7. IF um usuário autenticado tentar inserir uma nota apontando para um cliente de outro usuário THEN o sistema SHALL rejeitar a operação por violação de política.
8. The system SHALL permitir que um usuário leia e atualize apenas o próprio registro em `profiles`, e SHALL impedir insert e delete em `profiles` pelo papel `authenticated`.
9. IF um cliente tentar alterar `profiles.id`, `clients.owner_id` ou `clients.created_at` em um update THEN o sistema SHALL preservar o valor original.
10. The system SHALL permitir ao papel `authenticated` apenas inserir em `error_logs` com `owner_id` igual ao próprio identificador, e SHALL negar qualquer acesso da tabela ao papel `anon`.
11. WHILE nenhuma sessão autenticada existir, o sistema SHALL negar toda leitura e escrita em `profiles`, `clients`, `notes` e `error_logs`.

**Independent Test**: A suíte cria dois usuários no Supabase local, cada um com um cliente e uma nota, e afirma que cada operação cruzada retorna erro ou conjunto vazio.

---

### P1: Perfil criado automaticamente no cadastro ⭐ MVP

**User Story**: Como consultor, quero que meu perfil exista assim que eu crio a conta, para que o CRM saiba meu nome sem me pedir de novo.

**Why P1**: `auth` depende disto; sem o perfil, o cabeçalho e a tela de perfil não têm o que exibir.

**Acceptance Criteria**:

1. WHEN uma linha é inserida em `auth.users` THEN o sistema SHALL inserir a linha correspondente em `public.profiles` com `id`, `email` e `full_name` lido de `raw_user_meta_data->>'full_name'`.
2. The system SHALL declarar a função do trigger como `security definer` com `set search_path = ''`, conforme o padrão documentado pelo Supabase.
3. IF `raw_user_meta_data` não contiver `full_name` THEN o sistema SHALL gravar a parte do e-mail anterior ao `@` como `full_name`, em vez de falhar o cadastro.
4. The system SHALL preencher `profiles.email` somente por este trigger e SHALL não expor nenhum caminho de atualização desse campo pela aplicação, conforme AD-008.

**Independent Test**: Criar um usuário via `supabase.auth.signUp` com `full_name` nos metadados e verificar que a linha em `profiles` existe com os três campos corretos; repetir sem `full_name` e conferir o fallback.

---

### P2: Tipos do banco gerados e ferramental de qualidade

**User Story**: Como desenvolvedor, quero os tipos TypeScript derivados do schema, para que uma coluna renomeada quebre a compilação em vez de quebrar em produção.

**Why P2**: Melhora muito a segurança das features seguintes, mas nenhuma delas fica bloqueada sem isto.

**Acceptance Criteria**:

1. WHEN o script de geração de tipos é executado THEN o sistema SHALL escrever `src/types/database.types.ts` a partir do schema local, e o arquivo gerado SHALL ser commitado.
2. The system SHALL tipar o cliente Supabase com esse tipo gerado, de modo que uma coluna inexistente em uma consulta vire erro de compilação.
3. WHEN `npm run test` é executado THEN o sistema SHALL rodar a suíte Vitest e terminar com código de saída zero.
4. The system SHALL expor scripts `dev`, `build`, `lint`, `format`, `typecheck`, `test`, `test:e2e`, `db:reset` e `db:types` no `package.json`.

**Independent Test**: Alterar um nome de coluna numa migration, regerar os tipos e confirmar que `npm run typecheck` acusa o uso antigo.

---

### P2: Layout base e captura de erros

**User Story**: Como consultor, quero que uma falha inesperada mostre uma tela de erro compreensível em vez de uma página em branco, e que ela fique registrada para diagnóstico.

**Why P2**: O valor aparece quando existem telas reais; a estrutura precisa nascer aqui para não ser retrofitada.

**Acceptance Criteria**:

1. The system SHALL fornecer um layout base com cabeçalho e área de conteúdo, legível de 320px até desktop, sem rolagem horizontal.
2. WHEN um erro não tratado escapa da árvore React THEN o sistema SHALL exibir uma tela de erro com uma ação de recarregar, em vez de desmontar a aplicação.
3. WHILE houver sessão autenticada, WHEN o error boundary capturar um erro, o sistema SHALL inserir uma linha em `error_logs` com `owner_id`, mensagem, stack e rota.
4. IF o erro ocorrer sem sessão autenticada THEN o sistema SHALL registrar apenas no console e SHALL não tentar escrever em `error_logs`, conforme AD-011.
5. IF a própria gravação em `error_logs` falhar THEN o sistema SHALL seguir exibindo a tela de erro sem lançar uma segunda exceção.

**Independent Test**: Renderizar um componente que lança dentro do boundary autenticado e conferir a tela de erro mais a linha gravada; repetir sem sessão e conferir que nada é escrito.

---

## Edge Cases

- IF o Supabase local não estiver em execução quando os testes de RLS rodarem THEN o sistema SHALL falhar com uma mensagem indicando que `supabase start` é necessário, e não com um erro de conexão cru.
- IF duas migrations receberem o mesmo prefixo de timestamp THEN o sistema SHALL falhar o `db reset` em vez de aplicar em ordem indefinida.
- WHEN `region` for informado apenas com espaços THEN o sistema SHALL gravar nulo, e não uma string vazia.
- WHEN `phone` for informado com máscara THEN o sistema SHALL persistir apenas os dígitos.
- IF `income` for negativo THEN o sistema SHALL rejeitar a operação por check constraint.
- IF o trigger de criação de perfil falhar THEN o sistema SHALL abortar a transação de cadastro inteira, deixando nem usuário nem perfil parcialmente criados.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FND-01 | P1: Esqueleto da aplicação executável | Design | Pending |
| FND-02 | P1: Esqueleto — configuração Tailwind v4 e tokens | Design | Pending |
| FND-03 | P1: Esqueleto — validação de variáveis de ambiente | Design | Pending |
| FND-04 | P1: Schema versionado — tabelas e relacionamentos | Design | Pending |
| FND-05 | P1: Schema versionado — check constraints de domínio | Design | Pending |
| FND-06 | P1: Schema versionado — triggers de `updated_at` e normalização | Design | Pending |
| FND-07 | P1: Schema versionado — índices e `pg_trgm` | Design | Pending |
| FND-08 | P1: Isolamento — políticas RLS de `clients` | Design | Pending |
| FND-09 | P1: Isolamento — políticas RLS de `notes` | Design | Pending |
| FND-10 | P1: Isolamento — políticas RLS de `profiles` e `error_logs` | Design | Pending |
| FND-11 | P1: Isolamento — suíte de teste cruzado entre dois usuários | Design | Pending |
| FND-12 | P1: Perfil criado automaticamente por trigger | Design | Pending |
| FND-13 | P2: Tipos do banco gerados e tipagem do cliente Supabase | Design | Pending |
| FND-14 | P2: Scripts de qualidade e suíte Vitest configurada | Design | Pending |
| FND-15 | P2: Layout base responsivo | Design | Pending |
| FND-16 | P2: Error boundary com registro em `error_logs` | Design | Pending |

**Coverage:** 16 total, 0 mapeados para tarefas, 16 aguardando a fase Tasks.

---

## Success Criteria

- [ ] Um desenvolvedor sem contexto clona o repositório e chega ao app rodando com banco local em menos de 15 minutos seguindo o README.
- [ ] A suíte de RLS cobre as 4 tabelas nas 4 operações e falha se qualquer política for removida.
- [ ] `supabase db reset` seguido de `npm run db:types` não produz diferença no arquivo de tipos commitado.
- [ ] Nenhum segredo além das chaves publicáveis do Supabase existe em qualquer arquivo `VITE_*`.
