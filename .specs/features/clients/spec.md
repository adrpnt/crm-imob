# Clients Specification

## Problem Statement

A carteira do consultor hoje vive em planilhas, no WhatsApp e na memória. Ele precisa de um lugar onde cada pessoa interessada tenha um registro com status, origem, região e perfil de renda, e onde encontrar alguém leve segundos — por nome parcial, por telefone, ou filtrando "todos os leads da Zona Sul vindos do Instagram". A listagem é a tela principal do produto: é por ela que o consultor começa o dia, e é dela que todas as outras ações partem.

## Goals

- [ ] Consultor cadastra, consulta, edita e exclui clientes, vendo apenas os seus.
- [ ] Encontrar um cliente por nome, e-mail ou telefone parcial leva menos de um segundo de digitação, sem clicar em buscar.
- [ ] Filtros de status, origem e região combinam entre si e sobrevivem a um recarregamento da página.
- [ ] A listagem é usável em um celular, na rua, entre visitas.
- [ ] Nenhuma tela fica em branco: carregamento, vazio, sem resultado e erro têm tratamento próprio.

## Out of Scope

Explicitamente excluído. Documentado para evitar expansão de escopo.

| Feature | Reason |
| ------- | ------ |
| Gerenciamento de notas | Pertence à feature `notes`, embora a lista apareça dentro de `/clients/:id`. |
| Filtro por período de criação | PLAN §7 o classifica explicitamente como etapa posterior. |
| Importação e exportação por CSV | PLAN §15 — evolução futura. |
| Seleção múltipla e ações em lote | Não solicitada no PLAN; multiplica os casos de erro da exclusão. |
| Imóveis, oportunidades, tarefas e funil | PLAN §15 — evolução futura. |
| Histórico de alterações de um cliente | Não solicitado; exigiria tabela de auditoria e política própria. |
| Recuperar cliente excluído | A exclusão é física e definitiva por decisão registrada em `foundation`. |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui — nada fica silenciosamente indefinido.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Campos obrigatórios do cliente | Apenas `name`; e-mail, telefone, origem, região, renda e tipo de renda são opcionais; `status` tem padrão `lead` | Um lead costuma chegar como um nome e um telefone. Exigir mais faz o consultor abandonar o cadastro ou inventar dado | n |
| Ordenação padrão da listagem | `created_at` decrescente — mais recentes primeiro | Quem acabou de entrar na carteira é quem está quente. PLAN §7 pede ordenação por nome ou data sem definir o padrão | n |
| Comportamento da busca | Aplica após 300ms sem digitação, sem botão, casando parte do nome, do e-mail ou do telefone, ignorando caixa e acentos | PLAN §7 pede busca por três campos. O atraso evita uma consulta por tecla; ignorar acento é obrigatório em português | n |
| Busca por telefone | O termo digitado tem os não dígitos removidos antes de casar contra `phone` | `phone` é gravado só com dígitos (decisão de `foundation`); sem isso, buscar "(11) 98765" nunca acha nada | n |
| Como filtros e busca convivem | Combinados por E lógico, todos refletidos na URL junto com página e ordenação | PLAN §7 pede filtros na URL. E lógico é o que corresponde à leitura natural de "leads da Zona Sul" | y |
| Página inicial ao mudar filtro ou busca | Volta para a primeira página | Manter a página 3 ao filtrar costuma render uma lista vazia sem explicação aparente | n |
| Origem das opções do filtro de região | Regiões distintas já cadastradas pelo próprio consultor, ordenadas alfabeticamente | Decorre de AD-009: não há lista fixa nem tabela de domínio | y |
| Mudança de status | Feita pelo formulário de edição, sem atalho na listagem | Mantém o MVP com um único caminho de escrita; atalho inline exigiria tratamento próprio de erro e desfazer | y |
| Confirmação ao sair com alterações não salvas | Incluída — bloqueia navegação interna com alterações pendentes. **Não** cobre recarregar nem fechar a aba: medido na fase Design, `useBlocker` do React Router não intercepta esses gestos | PLAN §7 pede "se viável"; com React Hook Form o estado de sujeira já existe, então o custo é baixo | y |
| Moeda e formatação de renda | Exibida como BRL com separador de milhar e duas casas; entrada aceita dígitos com ou sem máscara | Decorre do tipo `numeric(12,2)` definido em `foundation` | y |
| Comportamento sem conexão | Erro de rede exibe estado de erro com ação de tentar de novo; não há fila offline | Suporte offline é um produto à parte e não consta do PLAN | n |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Cadastrar um cliente ⭐ MVP

**User Story**: Como consultor, quero registrar um novo interessado em segundos, com o mínimo de campos obrigatórios, para não perder o lead enquanto procuro o que preencher.

**Why P1**: Sem cadastro não há carteira, e todo o resto da feature opera sobre ela.

**Acceptance Criteria**:

1. WHEN o consultor envia o formulário de `/clients/new` com nome preenchido THEN o sistema SHALL criar o cliente com seu próprio `owner_id`, SHALL exibir confirmação e SHALL navegar para a página do cliente criado.
2. IF o nome estiver vazio ou tiver menos de 2 caracteres THEN o sistema SHALL exibir o erro no campo e SHALL não enviar a requisição.
3. IF o e-mail for preenchido com formato inválido THEN o sistema SHALL exibir o erro no campo; WHEN o e-mail estiver vazio, o sistema SHALL aceitar o cadastro.
4. IF a renda for negativa ou exceder 99.999.999,99 THEN o sistema SHALL exibir o erro no campo de renda.
5. The system SHALL oferecer `status` como seleção entre lead, contatado, qualificado, cliente e inativo, com lead pré-selecionado.
6. The system SHALL oferecer `source` como seleção entre indicação, Instagram, site, WhatsApp, portal e outro.
7. The system SHALL oferecer `income_type` como seleção entre formal, informal e mista, permitindo deixar em branco.
8. The system SHALL oferecer `region` como campo de texto com sugestões das regiões que o consultor já usou.
9. WHILE o envio estiver em andamento, o sistema SHALL desabilitar o botão de salvar e SHALL impedir um segundo envio.
10. IF o Supabase rejeitar a operação THEN o sistema SHALL exibir a causa em linguagem compreensível e SHALL preservar todos os dados digitados.
11. WHEN o consultor tenta sair do formulário com alterações não salvas THEN o sistema SHALL pedir confirmação antes de descartar.

**Independent Test**: Cadastrar um cliente informando só o nome, chegar na página dele e vê-lo no topo da listagem.

---

### P1: Listar, buscar e filtrar a carteira ⭐ MVP

**User Story**: Como consultor, quero encontrar qualquer pessoa da minha carteira em segundos, combinando busca e filtros, para agir sem interromper o que estou fazendo.

**Why P1**: É a tela principal do produto (PLAN §7) e o ponto de partida de todo o resto.

**Acceptance Criteria**:

1. WHEN o consultor acessa `/clients` THEN o sistema SHALL listar exclusivamente seus clientes, ordenados por data de criação decrescente, em páginas de 20.
2. WHEN o consultor digita no campo de busca THEN o sistema SHALL, após 300ms sem nova digitação, filtrar por correspondência parcial de nome, e-mail ou telefone, ignorando caixa e acentos.
3. WHEN o termo buscado contiver caracteres de máscara de telefone THEN o sistema SHALL removê-los antes de comparar contra o telefone armazenado.
4. WHEN o consultor aplica os filtros de status, origem ou região THEN o sistema SHALL combiná-los com a busca por E lógico.
5. The system SHALL preencher as opções do filtro de região com as regiões distintas já cadastradas pelo próprio consultor, em ordem alfabética.
6. WHEN qualquer filtro, busca, ordenação ou página muda THEN o sistema SHALL refletir o estado na query string da URL.
7. WHEN uma URL com filtros é aberta diretamente ou recarregada THEN o sistema SHALL restaurar exatamente aquele estado de listagem.
8. WHEN a busca ou um filtro muda THEN o sistema SHALL voltar para a primeira página.
9. The system SHALL permitir ordenar por nome ou por data de criação, em ordem crescente ou decrescente.
10. WHILE a viewport for menor que 768px, o sistema SHALL apresentar os clientes como cartões em vez de tabela, mantendo busca, filtros e ações acessíveis.
11. The system SHALL exibir o total de clientes que satisfazem os filtros correntes.
12. WHILE os dados estiverem carregando, o sistema SHALL exibir esqueletos de conteúdo em vez de área em branco.
13. IF o consultor ainda não tiver nenhum cliente THEN o sistema SHALL exibir um estado inicial convidando ao primeiro cadastro.
14. IF os filtros correntes não retornarem nenhum cliente THEN o sistema SHALL exibir uma mensagem de busca sem resultado com a ação de limpar os filtros, distinta do estado inicial.
15. IF a consulta falhar THEN o sistema SHALL exibir estado de erro com ação de tentar de novo, sem perder os filtros aplicados.

**Independent Test**: Com 25 clientes cadastrados, filtrar por região e status, copiar a URL, abrir em outra aba e ver a mesma lista.

---

### P1: Ver e editar um cliente ⭐ MVP

**User Story**: Como consultor, quero abrir a ficha de um cliente para conferir os dados e corrigi-los, para que a informação continue confiável ao longo do relacionamento.

**Why P1**: O PLAN §1 promete visualização e edição, e a ficha é onde as notas vivem.

**Acceptance Criteria**:

1. WHEN o consultor acessa `/clients/:id` de um cliente seu THEN o sistema SHALL exibir todos os campos cadastrados, com renda formatada em BRL e datas de criação e atualização.
2. IF o identificador não existir ou pertencer a outro usuário THEN o sistema SHALL exibir um estado de não encontrado com retorno à listagem, sem revelar que o registro existe.
3. WHEN o consultor acessa `/clients/:id/edit` THEN o sistema SHALL apresentar o mesmo formulário do cadastro, pré-preenchido com os valores atuais.
4. WHEN o consultor salva alterações válidas THEN o sistema SHALL persistir, SHALL exibir confirmação, SHALL refletir os novos valores na ficha e na listagem, e SHALL navegar de volta para a ficha.
5. IF um campo violar as mesmas regras de validação do cadastro THEN o sistema SHALL exibir o erro no campo correspondente e SHALL não enviar a requisição.
6. WHILE o cliente estiver sendo carregado, o sistema SHALL exibir esqueleto de conteúdo.
7. WHEN o consultor tenta sair da edição com alterações não salvas THEN o sistema SHALL pedir confirmação antes de descartar.
8. The system SHALL oferecer, a partir da ficha, as ações de editar, excluir e voltar para a listagem preservando os filtros de origem.

**Independent Test**: Abrir um cliente, editar o status, salvar e ver o novo status na ficha e na listagem.

---

### P1: Excluir um cliente ⭐ MVP

**User Story**: Como consultor, quero remover definitivamente um registro que não faz mais sentido, entendendo claramente o que será apagado junto.

**Why P1**: PLAN §7 detalha o fluxo de confirmação e o efeito em cascata sobre as notas.

**Acceptance Criteria**:

1. WHEN o consultor aciona excluir THEN o sistema SHALL abrir um diálogo de confirmação nomeando o cliente e avisando que a ação é irreversível e que as notas serão removidas junto.
2. The system SHALL apresentar a ação destrutiva visualmente distinta da ação de cancelar, e SHALL deixar o cancelamento como opção focada por padrão.
3. WHEN o consultor confirma THEN o sistema SHALL excluir o cliente e todas as suas notas, SHALL exibir confirmação e SHALL retornar à listagem com os filtros anteriores preservados.
4. WHEN a exclusão conclui THEN o sistema SHALL remover o registro da listagem e SHALL recalcular o total e a paginação.
5. IF a página corrente ficar vazia após a exclusão e existir página anterior THEN o sistema SHALL navegar para a página anterior.
6. IF a exclusão falhar THEN o sistema SHALL manter o registro visível e SHALL exibir a mensagem de erro.
7. WHEN o consultor cancela o diálogo THEN o sistema SHALL fechá-lo sem nenhuma alteração.
8. WHILE a exclusão estiver em andamento, o sistema SHALL indicar progresso e SHALL impedir uma segunda confirmação.

**Independent Test**: Excluir um cliente que tenha notas, confirmar o sumiço da listagem e verificar no banco que as notas foram removidas.

---

### P2: Acessibilidade e uso por teclado

**User Story**: Como consultor que trabalha rápido, quero operar a listagem e os formulários pelo teclado e com bom contraste, para não depender do mouse nem forçar a vista no celular ao sol.

**Why P2**: PLAN §11 pede foco visível, rótulos reais e contraste, mas nada disso bloqueia o fluxo principal.

**Acceptance Criteria**:

1. The system SHALL associar um rótulo visível a cada campo de formulário, sem depender de texto de exemplo como rótulo.
2. The system SHALL manter indicador de foco visível em todo elemento interativo alcançável por teclado.
3. WHEN um diálogo de confirmação abre THEN o sistema SHALL mover o foco para dentro dele, SHALL confinar a navegação por teclado ao diálogo e SHALL devolver o foco ao elemento de origem ao fechar.
4. WHEN a tecla Escape é pressionada com um diálogo aberto THEN o sistema SHALL fechá-lo sem executar a ação.
5. WHEN a validação falha em um envio THEN o sistema SHALL mover o foco para o primeiro campo inválido e SHALL associar a mensagem de erro ao campo para leitores de tela.
6. The system SHALL manter contraste mínimo de 4.5:1 entre texto e fundo em todos os estados.
7. WHEN uma operação conclui em segundo plano THEN o sistema SHALL anunciar o resultado em região assistiva, e não apenas visualmente.

**Independent Test**: Percorrer cadastro, listagem e exclusão inteiramente pelo teclado, sem perder o foco em nenhum ponto.

---

## Edge Cases

- WHEN dois clientes tiverem exatamente o mesmo nome THEN o sistema SHALL permitir ambos, distinguindo-os na listagem por e-mail ou telefone.
- IF o consultor abrir a edição de um cliente excluído em outra aba THEN o sistema SHALL exibir o estado de não encontrado ao salvar, em vez de falhar silenciosamente.
- WHEN o termo de busca contiver apenas espaços THEN o sistema SHALL tratá-lo como busca vazia.
- WHEN o termo de busca contiver `%` ou `_` THEN o sistema SHALL tratá-los como caracteres literais, e não como curingas.
- WHEN o termo de busca contiver `*` THEN o sistema SHALL tratá-lo como curinga equivalente a `%`, e não como caractere literal. Medido na fase Design: o PostgREST traduz `*` para `%` antes do SQL, de modo que `\*` significa "porcentagem literal" e um asterisco literal é inexpressável por `ilike`. Documentado como limite conhecido em vez de afirmado ao contrário.
- WHEN um nome muito longo for exibido na listagem THEN o sistema SHALL truncá-lo visualmente sem quebrar o layout, mantendo o valor completo acessível.
- IF a página solicitada na URL exceder o total de páginas THEN o sistema SHALL exibir a última página existente.
- WHEN a região for digitada com caixa diferente de uma já existente THEN o sistema SHALL agrupá-las como a mesma opção no filtro.
- IF a renda for deixada em branco com tipo de renda preenchido THEN o sistema SHALL aceitar, pois ambos são opcionais e independentes.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CLNT-01 | P1: Cadastrar — schema Zod e formulário reutilizável | Design | Pending |
| CLNT-02 | P1: Cadastrar — criação com `owner_id` do usuário autenticado | Design | Pending |
| CLNT-03 | P1: Cadastrar — seleções de status, origem e tipo de renda | Design | Pending |
| CLNT-04 | P1: Cadastrar — campo de região com sugestões do próprio consultor | Design | Pending |
| CLNT-05 | P1: Cadastrar — prevenção de envio duplicado e erro do Supabase | Design | Pending |
| CLNT-06 | P1: Cadastrar — confirmação ao sair com alterações não salvas | Design | Pending |
| CLNT-07 | P1: Listar — consulta paginada ordenada com total | Design | Pending |
| CLNT-08 | P1: Listar — busca com atraso por nome, e-mail e telefone | Design | Pending |
| CLNT-09 | P1: Listar — filtros de status, origem e região combinados | Design | Pending |
| CLNT-10 | P1: Listar — sincronização bidirecional do estado com a URL | Design | Pending |
| CLNT-11 | P1: Listar — ordenação por nome ou data | Design | Pending |
| CLNT-12 | P1: Listar — tabela no desktop e cartões no mobile | Design | Pending |
| CLNT-13 | P1: Listar — estados de carregamento, vazio, sem resultado e erro | Design | Pending |
| CLNT-14 | P1: Ver — ficha do cliente e estado de não encontrado | Design | Pending |
| CLNT-15 | P1: Editar — formulário pré-preenchido e persistência | Design | Pending |
| CLNT-16 | P1: Excluir — diálogo de confirmação nomeando o cliente | Design | Pending |
| CLNT-17 | P1: Excluir — remoção em cascata e ajuste da paginação | Design | Pending |
| CLNT-18 | P2: Acessibilidade — rótulos, foco e anúncio assistivo | Design | Pending |

**Coverage:** 18 total, 0 mapeados para tarefas, 18 aguardando a fase Tasks.

---

## Success Criteria

- [ ] Cadastrar um cliente com o mínimo de dados leva menos de 30 segundos no celular.
- [ ] Qualquer combinação de busca e filtros é compartilhável por URL e restaurada ao recarregar.
- [ ] Nenhuma das cinco condições de tela — carregando, vazio, sem resultado, erro e sucesso — exibe área em branco.
- [ ] A listagem responde em menos de um segundo com 500 clientes cadastrados.
- [ ] Todo o fluxo de cadastro, edição e exclusão é operável apenas pelo teclado.
