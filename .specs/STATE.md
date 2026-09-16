# STATE

## Decisions

### AD-001
- **Decision**: O frontend fala direto com o Supabase, sem backend próprio; a autorização vive inteiramente nas políticas de Row Level Security.
- **Reason**: Elimina uma camada inteira de infraestrutura para um produto de usuário único, e a chave publicável do Supabase pode ir ao bundle com segurança desde que a RLS seja a fronteira real.
- **Trade-off**: Toda regra de autorização passa a ser SQL. Um erro de política é uma brecha de dados, não um bug de tela — por isso a RLS ganha teste automatizado (AD-002) em vez de verificação manual.
- **Scope**: Todas as features.
- **Date**: 2026-09-15
- **Status**: active

### AD-002
- **Decision**: O schema (tabelas, constraints, índices, triggers e políticas) vive em `supabase/migrations/*.sql` versionado no repositório e é aplicado pelo Supabase CLI — nunca escrito à mão no dashboard.
- **Reason**: É a única forma de rodar `supabase db reset` local e provar, em teste automatizado, que o usuário A não enxerga os dados do usuário B. Também garante paridade entre desenvolvimento e produção.
- **Trade-off**: Exige Docker e o CLI na máquina de desenvolvimento. Aplicar um ajuste rápido deixa de ser um clique no painel.
- **Scope**: Todas as features que tocam o banco.
- **Date**: 2026-09-15
- **Status**: active

### AD-003
- **Decision**: Toda política de RLS envolve a chamada de autenticação em subconsulta — `(select auth.uid())` — declara `to authenticated` explicitamente e tem índice na coluna verificada.
- **Reason**: Sem a subconsulta, o planner reavalia a função uma vez por linha; com ela, avalia uma vez só (initPlan). A documentação de troubleshooting do Supabase mede a diferença em ordens de grandeza. `to authenticated` evita que a política seja sequer avaliada para o papel anônimo.
- **Trade-off**: A política fica menos óbvia de ler para quem não conhece o motivo — que é exatamente o que este registro resolve.
- **Scope**: `clients`, `notes`, `profiles`, `error_logs`.
- **Date**: 2026-09-15
- **Status**: active

### AD-004
- **Decision**: A RLS de `notes` valida o dono através de `exists (select 1 from public.clients ...)`, sem coluna `owner_id` desnormalizada em `notes`.
- **Reason**: Mantém `notes` com uma única fonte de verdade sobre propriedade — a nota pertence a quem é dono do cliente, e ponto. Não há trigger de sincronização nem risco de a coluna divergir.
- **Trade-off**: Menor do que eu supus ao registrar esta decisão. Media-se em T11, com 1000 clientes e 10000 notas: o planner não avalia a subconsulta por linha, ele a eleva a um SubPlan com hash avaliado uma vez, atendido por varredura de bitmap sobre `clients` filtrando `owner_id`. O custo real é uma varredura de índice por consulta, não por linha. O texto original desta linha afirmava avaliação por linha e estava errado.
- **Scope**: `notes`.
- **Date**: 2026-09-15
- **Status**: active

### AD-005
- **Decision**: A linha em `profiles` é criada por um trigger `on auth.users insert` executando `public.handle_new_user()` com `security definer set search_path = ''`, lendo `raw_user_meta_data->>'full_name'`. O frontend nunca insere em `profiles`.
- **Reason**: É o padrão documentado pelo Supabase e o único que funciona independentemente da confirmação de e-mail — se ela for ligada no futuro, não existe sessão logo após o cadastro e um insert vindo do cliente seria barrado pela RLS. Também torna impossível um usuário existir sem perfil.
- **Trade-off**: Uma falha dentro do trigger bloqueia o cadastro inteiro, e o erro aparece como uma mensagem genérica de banco. Exige que o trigger seja deliberadamente simples e coberto por teste.
- **Scope**: `foundation`, `auth`.
- **Date**: 2026-09-15
- **Status**: active

### AD-006
- **Decision**: `clients.status`, `clients.source` e `clients.income_type` são `text` com `check constraint`, não tipos `enum` nativos do Postgres.
- **Reason**: O conjunto de origens de lead de um corretor muda. Trocar um check é um `alter table ... drop constraint` seguido de um `add constraint`; remover um valor de um enum nativo do Postgres é impossível sem recriar o tipo e todas as colunas que dependem dele.
- **Trade-off**: Perde-se a garantia de tipo no nível do schema e o autocomplete do domínio nas ferramentas de banco. Os tipos gerados em `database.types.ts` compensam isso no TypeScript.
- **Scope**: `clients`.
- **Date**: 2026-09-15
- **Status**: active

### AD-007
- **Decision**: Cadastro público aberto, com confirmação de e-mail desativada no Supabase Auth. O usuário entra no CRM imediatamente após criar a conta.
- **Reason**: Mantém o fluxo do PLAN §6 e permite que o teste E2E da §13 (criar conta → logar → usar) rode sem intervenção manual numa caixa de e-mail.
- **Trade-off**: Qualquer pessoa com a URL cria uma conta no projeto Supabase, e nenhum endereço de e-mail é verificado. Aceito conscientemente para o MVP; ligar a confirmação depois é uma mudança de configuração mais uma tela de aviso — e o AD-005 já deixa o caminho preparado.
- **Scope**: `auth`, `deploy`.
- **Date**: 2026-09-15
- **Status**: active

### AD-008
- **Decision**: A aplicação nunca altera o e-mail do usuário. `profiles.email` é preenchido pelo trigger no cadastro e exibido como somente leitura.
- **Reason**: Fecha a pergunta deixada em aberto no PLAN §5 (como manter `profiles.email` sincronizado com o Auth) pela via mais barata: se o valor nunca muda por dentro da aplicação, não existe divergência a reconciliar.
- **Trade-off**: O usuário não consegue trocar o próprio e-mail pelo produto. Quando isso virar requisito, será preciso o fluxo de reconfirmação do Supabase mais um trigger `on auth.users update` para propagar o valor.
- **Scope**: `auth`, `foundation`.
- **Date**: 2026-09-15
- **Status**: active

### AD-009
- **Decision**: `clients.region` é texto livre normalizado no banco (aparado e com espaços internos colapsados por trigger) e indexado por `(owner_id, lower(region))` para que o agrupamento do filtro ignore a caixa. Não existe tabela nem lista fechada de regiões.
- **Reason**: As regiões de um corretor são hiperlocais e mudam com a carteira ("Barra", "Zona Sul", "Centro"). Uma lista fixa exigiria migration a cada bairro novo; uma tabela de domínio exigiria uma tela de CRUD dentro do MVP. O filtro é montado a partir das regiões distintas que o próprio usuário já cadastrou, o que dá um select estável sem nenhum cadastro prévio.
- **Trade-off**: Dois nomes diferentes para a mesma região ("Zona Sul" e "Zona sul II") continuam possíveis. A normalização resolve apenas caixa e espaçamento.
- **Scope**: `clients`.
- **Date**: 2026-09-15
- **Status**: active

### AD-010
- **Decision**: Tailwind CSS v4, instalado via `@tailwindcss/vite`, com os tokens de design declarados em CSS pela diretiva `@theme`. Não existe `tailwind.config.js`.
- **Reason**: É como a versão estável atual do Tailwind se configura; a v4 é CSS-first e os tokens viram variáveis CSS nativas, acessíveis fora das classes utilitárias.
- **Trade-off**: A maior parte dos exemplos e tutoriais de Tailwind ainda pressupõe o arquivo de configuração da v3. Registrado aqui para que a ausência do arquivo não pareça um esquecimento.
- **Scope**: `foundation`.
- **Date**: 2026-09-15
- **Status**: active

### AD-011
- **Decision**: A observabilidade de erros é interna: um error boundary do React grava em `public.error_logs` no próprio Supabase. Não há serviço externo. Erros ocorridos em rotas públicas não são persistidos.
- **Reason**: Evita uma dependência externa e mantém os dados sob o mesmo controle do resto do produto. Persistir de rota pública exigiria abrir `error_logs` para insert pelo papel `anon` — e a chave anônima está no bundle, o que tornaria a tabela gravável por qualquer um.
- **Trade-off**: Falhas nas telas de login, cadastro e redefinição de senha — justamente as mais difíceis de reproduzir — ficam apenas no console do navegador. Não há alerta, agregação nem deduplicação: a inspeção é manual.
- **Scope**: `foundation`, `auth`, `deploy`.
- **Date**: 2026-09-15
- **Status**: active

### AD-012
- **Decision**: A verificação de isolamento é feita em duas camadas: pgTAP (`supabase/tests/database/`, via `supabase test db`) cobre a matriz completa de políticas, e Vitest com supabase-js cobre o caminho real do cliente.
- **Reason**: As duas camadas enxergam coisas diferentes. pgTAP escreve a matriz de tabela × operação × papel com `set local role` e rollback automático — inclusive a negação para `anon`, desajeitada de expressar por um cliente autenticado. Vitest atravessa o PostgREST e portanto detecta erro de `grant` ou de exposição de schema, que pgTAP não vê.
- **Trade-off**: Duas ferramentas de teste para manter e dois lugares onde procurar quando uma regra de acesso muda. Aceito porque a autorização é a única fronteira de segurança do produto (AD-001).
- **Scope**: Todas as features que adicionam tabela ou política.
- **Date**: 2026-09-15
- **Status**: active

### AD-013
- **Decision**: React Router em data mode, com `createBrowserRouter`, sem usar `loader` nem `action`. Os dados permanecem inteiramente com o TanStack Query. Versão instalada: 8.4.0 (a decisão foi registrada quando a v7 era a estável; a substância não muda com a major).
- **Reason**: O data mode dá layouts aninhados e `ErrorBoundary` por rota. Usar loaders além disso criaria um segundo cache convivendo com o TanStack Query, com invalidação em dois lugares — contrariando o PLAN §8, que centraliza cache e invalidação em um mecanismo só.
- **Trade-off**: Abre-se mão do carregamento antes da transição de rota que os loaders permitem; os estados de carregamento continuam sendo responsabilidade de cada tela.
- **Nota da v8** (verificada em T18): o pacote `react-router-dom` deixou de existir. `RouterProvider` deve vir de `react-router/dom`; todo o resto, de `react-router`. Ambos os caminhos exportam o símbolo, então importar do lugar errado compila e roda — o registro existe para que isso não passe despercebido.
- **Scope**: Todas as features que adicionam rota.
- **Date**: 2026-09-15
- **Status**: active

### AD-014
- **Decision**: A autorização é sustentada por dois mecanismos independentes em toda tabela: `grant` no nível de coluna define o que o papel pode tocar, política de RLS define quais linhas. Colunas imutáveis pela aplicação — `owner_id`, `created_at`, `updated_at`, `profiles.email` — ficam simplesmente fora do grant de `update`.
- **Reason**: Com o frontend falando direto com o banco (AD-001), uma política mal escrita é uma brecha de dados. Deixar uma coluna fora do grant torna a garantia estrutural: nenhum update a alcança, esteja a política certa ou errada.
- **Trade-off**: Todo campo novo exige lembrar de incluí-lo no grant de `update`, sob pena de uma falha silenciosa e confusa de permissão. O custo é mitigado pela suíte de AD-012.
- **Scope**: `profiles`, `clients`, `notes`, `error_logs` e toda tabela futura.
- **Date**: 2026-09-15
- **Status**: active

## Handoff

- **Feature**: `.specs/features/foundation` (fase Specify concluída para as 5 features)
- **Phase / Task**: `foundation` concluída e verificada — veredito PASS na terceira rodada
- **Completed**: Specify das 5 features (aprovado); `foundation` inteira — 29 tarefas, 32 commits, 3 rodadas de verificação independente
- **In-progress** (file:line): nenhum
- **Next step**: Iniciar a feature `auth` pela fase Design. O spec já está aprovado. Dois itens do `config.toml` ficaram pendentes de T6 e pertencem a ela: `site_url` aponta para a porta 3000 em vez da 5173, e `minimum_password_length` está em 6 enquanto a premissa do spec fixa 8.
- **Blockers**: nenhum
- **Uncommitted files**: nenhum
- **Débito registrado**: sete itens em `.specs/features/foundation/validation.md` §6, classificados como não bloqueantes. Os quatro recomendados foram fechados em T29.
- **Lições destiladas**: oito, em `.specs/LESSONS.md`. Carregar as confirmadas ao iniciar Specify e Design de `auth`.
- **Branch**: main
