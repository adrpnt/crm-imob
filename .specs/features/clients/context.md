# Clients Context

**Gathered:** 2026-09-15
**Spec:** `.specs/features/clients/spec.md`
**Status:** Ready for design

---

## Feature Boundary

CRUD completo de clientes, listagem com busca, filtros combináveis, ordenação e paginação, tela de ficha do cliente e exclusão com confirmação. As notas exibidas dentro da ficha pertencem à feature `notes`.

---

## Implementation Decisions

### Navegação

- `/clients/:id` é a ficha do cliente e concentra dados cadastrais e histórico de notas. A rota `/clients/:id/notes` sugerida no `PLAN.md` §6 não existe.
- Motivo: o gesto real do corretor é abrir o cliente e ler o histórico antes de ligar. Separar em duas telas cobra um clique justamente no momento de maior pressa.
- Voltar da ficha para a listagem preserva os filtros que estavam aplicados.

### Listagem

- Páginas de 20 registros, com o total exibido. Página, filtros, busca e ordenação vivem na query string.
- Ordenação padrão por `created_at` decrescente.
- Mudar busca ou filtro volta para a primeira página.
- Tabela acima de 768px; cartões abaixo disso.

### Busca

- Aplica 300ms após a última tecla, sem botão de buscar.
- Casa parte do nome, do e-mail ou do telefone, ignorando caixa e acentos.
- O termo tem os não dígitos removidos antes de comparar contra `phone`, que é armazenado só com dígitos.
- `%` e `_` digitados pelo usuário são tratados como literais.

### Região

- Texto livre normalizado, sem lista fixa nem tabela de domínio (AD-009).
- O filtro é montado com as regiões distintas que o próprio consultor já cadastrou, em ordem alfabética, e agrupa variações de caixa.
- O campo do formulário oferece essas mesmas regiões como sugestão, sem impedir uma nova.

### Campos e renda

- Só `name` é obrigatório. `status` já vem como `lead`.
- `income` e `income_type` entram no formulário e na ficha: renda em BRL formatada, tipo entre formal, informal e mista.
- Renda vazia com tipo preenchido é aceita — os dois campos são independentes.

### Exclusão

- Diálogo de confirmação nomeando o cliente, avisando que é irreversível e que as notas serão apagadas junto.
- Ação destrutiva visualmente distinta; cancelar é a opção focada por padrão.
- Após excluir, a listagem recalcula total e paginação e recua uma página se a corrente ficar vazia.

### Agent's Discretion

- Colunas exibidas na tabela do desktop e campos mostrados no cartão do mobile.
- Componente concreto usado para o campo de região com sugestões.
- Forma de apresentar os filtros no mobile (painel recolhível ou linha de chips).

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma área foi declinada. Ordenação padrão, obrigatoriedade de campos, comportamento de paginação ao filtrar, mudança de status apenas pelo formulário e ausência de suporte offline estão na tabela de premissas do spec com default e justificativa.

---

## Specific References

- `PLAN.md` §7 pede explicitamente que a URL reflita os filtros, no formato `/clients?search=joao&status=lead&region=sul`. Esse formato é mantido, acrescido de `sort`, `order` e `page`.
- `PLAN.md` §8 define os hooks esperados (`useClients`, `useClient`, `useCreateClient`, `useUpdateClient`, `useDeleteClient`) e a separação de serviços por feature. Ambos são seguidos.

---

## Deferred Ideas

- Filtro por período de criação, que o próprio `PLAN.md` §7 adia.
- Alteração de status direto na listagem.
- Seleção múltipla e ações em lote.
- Importação e exportação por CSV.
