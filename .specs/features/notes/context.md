# Notes Context

**Gathered:** 2026-09-15
**Spec:** `.specs/features/notes/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Criação, leitura, edição e exclusão das notas de um cliente, exibidas dentro de `/clients/:id`. Não há rota própria de notas.

---

## Implementation Decisions

### Localização e forma

- As notas vivem na ficha do cliente, abaixo dos dados cadastrais.
- Criar e editar acontecem em formulário embutido, aberto e fechado no lugar. Sem modal e sem outra página: registrar um contato é ação frequente e curta.
- Excluir usa o mesmo padrão de diálogo destrutivo da exclusão de cliente, citando o título da nota.

### Apresentação

- Ordem decrescente por data de criação — o mais recente no topo.
- Data e hora absolutas de criação sempre visíveis; a de atualização só quando diferir da criação.
- Descrição renderizada como texto puro, preservando quebras de linha e sem interpretar marcação.
- Descrição longa é exibida recolhida, com opção de expandir.

### Dados

- `title` obrigatório, de 1 a 120 caracteres, aparado antes de validar.
- `description` opcional, até 5000 caracteres; só espaços vira nulo.
- Sem limite de quantidade de notas por cliente.

### Segurança

- Toda consulta parte do identificador do cliente e se apoia na política de RLS como fronteira real; o frontend não filtra por dono (AD-004).
- A exclusão de um cliente apaga as notas pela cascata definida no banco.

### Cache

- Escrita invalida o cache do TanStack Query apenas das notas daquele cliente, sem recarregar a página.

### Agent's Discretion

- Tratamento visual de cada nota na lista e limiar exato para recolher uma descrição longa.
- Se a atualização otimista é aplicada ou se a lista só reflete após a confirmação do servidor.

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma área foi declinada. Ordenação, formulário embutido em vez de modal, exibição condicional da data de atualização e ausência de limite por cliente estão na tabela de premissas do spec com default e justificativa.

---

## Specific References

- `PLAN.md` §7 define os requisitos de gerenciamento de notas e a exibição das datas de criação e atualização.
- `PLAN.md` §8 define os hooks esperados (`useNotes`, `useNote`, `useCreateNote`, `useUpdateNote`, `useDeleteNote`), seguidos sem alteração.

---

## Deferred Ideas

- Anexos e fotos nas notas.
- Formatação rica no texto.
- Lembretes e tarefas a partir de uma nota.
- Busca textual dentro das notas.
