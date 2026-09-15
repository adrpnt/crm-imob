# Notes Specification

## Problem Statement

Os dados cadastrais de um cliente dizem quem ele é, mas não o que foi conversado. O consultor precisa registrar cada contato — o que o cliente procura, o que foi combinado, qual o próximo passo — e reler esse histórico antes de ligar de novo. Sem isso, a informação fica no WhatsApp ou na memória e se perde exatamente quando importa. As notas são o embrião do histórico de interações que o PLAN §15 prevê como evolução.

## Goals

- [ ] Consultor registra, lê, corrige e apaga notas de um cliente sem sair da ficha dele.
- [ ] Nota registrada aparece imediatamente na lista, sem recarregar a página.
- [ ] Nenhuma nota é visível ou alterável por outro usuário, garantido pela política de `foundation`.
- [ ] O histórico é legível em ordem cronológica, com a informação mais recente primeiro.

## Out of Scope

Explicitamente excluído. Documentado para evitar expansão de escopo.

| Feature | Reason |
| ------- | ------ |
| Anexar arquivos ou fotos às notas | Exigiria Supabase Storage e políticas de bucket; PLAN §2 o trata como possibilidade futura. |
| Formatação rica no texto da nota | PLAN §4 define `description` como texto simples; um editor rico traz sanitização e um risco de injeção que texto puro não tem. |
| Lembretes, prazos e tarefas a partir de uma nota | PLAN §15 — evolução futura. |
| Tipos ou categorias de nota | PLAN §4 define apenas título e descrição. |
| Busca de texto dentro das notas | Nenhum requisito do PLAN a menciona; a busca da §7 é sobre clientes. |
| Notas soltas, sem cliente vinculado | `notes.client_id` é obrigatório por decisão de modelagem em `foundation`. |
| Paginação das notas | O volume por cliente é naturalmente pequeno; se crescer, vira uma decisão posterior baseada em dado real. |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui — nada fica silenciosamente indefinido.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Onde as notas são gerenciadas | Dentro de `/clients/:id`, abaixo dos dados cadastrais; não existe rota `/clients/:id/notes` | Decisão confirmada na fase de discussão: o gesto real do corretor é abrir o cliente e ler o histórico antes de ligar | y |
| Ordenação das notas | `created_at` decrescente — a mais recente no topo | Quem abre a ficha quer saber o que aconteceu por último | n |
| Obrigatoriedade dos campos | `title` obrigatório entre 1 e 120 caracteres; `description` opcional até 5000 | PLAN §4 já define `title not null` e `description` anulável | y |
| Forma de criar e editar | Formulário embutido na própria ficha, aberto e fechado no lugar; sem modal e sem outra página | Criar uma nota é uma ação frequente e curta; abrir um modal a cada contato registrado cansa | n |
| Exibição de datas | Data e hora absolutas de criação; a de atualização só aparece quando diferir da criação | Mostrar "atualizada há 2 min" em toda nota nunca editada polui sem informar | n |
| Confirmação de exclusão | Mesmo padrão de diálogo usado na exclusão de cliente, citando o título da nota | Consistência de padrão destrutivo dentro do produto | n |
| Atualização da lista após escrita | Invalidação do cache do TanStack Query para as notas daquele cliente, sem recarregar a página | PLAN §8 pede invalidação após cadastro, edição e exclusão | y |
| Limite de notas por cliente | Sem limite imposto | Nenhum requisito o justifica, e o limite de tamanho por nota já contém o crescimento | n |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Registrar uma nota ⭐ MVP

**User Story**: Como consultor, quero anotar o que foi conversado logo depois de desligar o telefone, para não depender da memória no próximo contato.

**Why P1**: É a razão de a feature existir; sem criar, não há o que listar nem editar.

**Acceptance Criteria**:

1. WHEN o consultor envia uma nota com título válido a partir de `/clients/:id` THEN o sistema SHALL criá-la vinculada àquele cliente, SHALL exibi-la no topo da lista e SHALL exibir confirmação.
2. IF o título estiver vazio ou exceder 120 caracteres THEN o sistema SHALL exibir o erro no campo e SHALL não enviar a requisição.
3. IF a descrição exceder 5000 caracteres THEN o sistema SHALL exibir o erro no campo e SHALL não enviar a requisição.
4. WHEN a descrição estiver vazia THEN o sistema SHALL aceitar a nota apenas com o título.
5. WHILE a criação estiver em andamento, o sistema SHALL desabilitar o botão de salvar e SHALL impedir um segundo envio.
6. WHEN a criação conclui THEN o sistema SHALL limpar o formulário e SHALL mantê-lo pronto para a próxima nota.
7. IF a criação falhar THEN o sistema SHALL exibir a mensagem de erro e SHALL preservar o texto digitado.
8. IF o cliente tiver sido excluído em outra aba THEN o sistema SHALL exibir mensagem de cliente não encontrado em vez de uma falha genérica de banco.

**Independent Test**: Abrir um cliente, registrar uma nota com título e descrição e vê-la no topo da lista sem recarregar.

---

### P1: Ler o histórico do cliente ⭐ MVP

**User Story**: Como consultor, quero reler tudo que já registrei sobre uma pessoa antes de falar com ela de novo, para retomar a conversa de onde parou.

**Why P1**: É o valor de uso da feature — o momento em que a nota registrada há duas semanas paga o esforço.

**Acceptance Criteria**:

1. WHEN o consultor acessa `/clients/:id` THEN o sistema SHALL listar todas as notas daquele cliente, da mais recente para a mais antiga.
2. The system SHALL exibir, em cada nota, o título, a descrição e a data e hora de criação.
3. WHEN a data de atualização de uma nota diferir da de criação THEN o sistema SHALL exibir também a data de atualização.
4. WHILE as notas estiverem carregando, o sistema SHALL exibir esqueleto de conteúdo em vez de área em branco.
5. IF o cliente não tiver nenhuma nota THEN o sistema SHALL exibir um estado inicial convidando a registrar a primeira.
6. IF a consulta das notas falhar THEN o sistema SHALL exibir estado de erro com ação de tentar de novo, sem impedir a leitura dos dados cadastrais do cliente.
7. WHEN uma descrição contiver quebras de linha THEN o sistema SHALL preservá-las na exibição.
8. The system SHALL renderizar o conteúdo da nota como texto puro, sem interpretar marcação nem HTML.

**Independent Test**: Criar três notas em momentos distintos e conferir que aparecem em ordem decrescente com as datas corretas.

---

### P1: Corrigir e apagar uma nota ⭐ MVP

**User Story**: Como consultor, quero corrigir o que anotei errado e remover o que não serve, para que o histórico permaneça confiável.

**Why P1**: PLAN §1 e §7 listam edição e exclusão de notas como parte do MVP.

**Acceptance Criteria**:

1. WHEN o consultor aciona editar uma nota THEN o sistema SHALL abrir o formulário no lugar da nota, pré-preenchido com o título e a descrição atuais.
2. WHEN o consultor salva alterações válidas THEN o sistema SHALL persistir, SHALL atualizar a nota na lista e SHALL exibir confirmação.
3. WHEN o consultor cancela a edição THEN o sistema SHALL restaurar a exibição original sem alterar nada.
4. IF o título ou a descrição violarem as regras de validação da criação THEN o sistema SHALL exibir o erro no campo e SHALL não enviar a requisição.
5. WHEN o consultor aciona excluir uma nota THEN o sistema SHALL abrir diálogo de confirmação citando o título e avisando que a ação é irreversível.
6. WHEN o consultor confirma a exclusão THEN o sistema SHALL remover a nota da lista e SHALL exibir confirmação.
7. WHEN o consultor cancela o diálogo THEN o sistema SHALL fechá-lo sem alterar nada.
8. IF a edição ou a exclusão falhar THEN o sistema SHALL manter a nota visível e SHALL exibir a mensagem de erro.
9. WHILE uma edição ou exclusão estiver em andamento, o sistema SHALL indicar progresso e SHALL impedir uma segunda submissão.

**Independent Test**: Editar o título de uma nota e ver a mudança na lista; excluir outra e confirmar que sumiu, permanecendo as demais.

---

### P2: Isolamento das notas verificado ponta a ponta

**User Story**: Como consultor, quero a garantia de que as anotações sobre meus clientes — muitas vezes informação sensível de terceiros — são inacessíveis a qualquer outro usuário.

**Why P2**: A política já é criada e testada em `foundation`; aqui o valor é confirmá-la através da interface real, não do acesso direto ao banco.

**Acceptance Criteria**:

1. IF o consultor acessar `/clients/:id` de um cliente de outro usuário THEN o sistema SHALL exibir estado de não encontrado e SHALL não listar nenhuma nota.
2. The system SHALL derivar toda consulta de notas do identificador do cliente, apoiando-se na política de RLS como fronteira de autorização, sem filtrar por dono apenas no frontend.
3. WHEN um cliente é excluído THEN o sistema SHALL ter suas notas removidas pela regra de cascata definida no banco.

**Independent Test**: Com dois usuários no Supabase local, abrir pela interface do usuário A a URL de um cliente do usuário B e conferir que nenhuma nota é exibida.

---

## Edge Cases

- WHEN duas notas forem criadas no mesmo segundo THEN o sistema SHALL exibir ambas em ordem estável e determinística.
- IF a nota for excluída em outra aba enquanto está sendo editada THEN o sistema SHALL informar que ela não existe mais ao salvar, em vez de recriá-la.
- WHEN a descrição contiver apenas espaços THEN o sistema SHALL persistir nulo, e não uma string de espaços.
- WHEN a descrição for muito longa THEN o sistema SHALL exibi-la recolhida com opção de expandir, sem quebrar o layout.
- WHEN o título contiver espaços nas pontas THEN o sistema SHALL removê-los antes de validar o tamanho mínimo.
- IF a descrição contiver algo semelhante a marcação HTML THEN o sistema SHALL exibi-lo literalmente como texto.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| NOTE-01 | P1: Registrar — schema Zod e formulário embutido na ficha | Design | Pending |
| NOTE-02 | P1: Registrar — criação vinculada ao cliente e invalidação do cache | Design | Pending |
| NOTE-03 | P1: Registrar — prevenção de envio duplicado e tratamento de erro | Design | Pending |
| NOTE-04 | P1: Ler — listagem ordenada por data decrescente | Design | Pending |
| NOTE-05 | P1: Ler — exibição de datas de criação e atualização | Design | Pending |
| NOTE-06 | P1: Ler — estados de carregamento, vazio e erro | Design | Pending |
| NOTE-07 | P1: Ler — renderização como texto puro preservando quebras de linha | Design | Pending |
| NOTE-08 | P1: Corrigir — edição no lugar com cancelamento | Design | Pending |
| NOTE-09 | P1: Apagar — diálogo de confirmação citando o título | Design | Pending |
| NOTE-10 | P2: Isolamento verificado pela interface e cascata na exclusão | Design | Pending |

**Coverage:** 10 total, 0 mapeados para tarefas, 10 aguardando a fase Tasks.

---

## Success Criteria

- [ ] Registrar uma nota após uma ligação leva menos de 20 segundos, sem sair da ficha do cliente.
- [ ] O histórico completo de um cliente é legível sem nenhum clique além de abrir a ficha.
- [ ] Nenhuma operação de nota recarrega a página.
- [ ] O teste pela interface confirma que as notas de um usuário são invisíveis para outro.
