# Deploy Specification

## Problem Statement

Um CRM que roda só na máquina do desenvolvedor não serve a ninguém. O consultor precisa acessá-lo do celular, na rua, entre visitas. A publicação tem armadilhas próprias que não aparecem em desenvolvimento: as URLs de redirecionamento do Supabase Auth apontam para `localhost` por padrão — o que faz o link de recuperação de senha chegar quebrado no e-mail do usuário —, as variáveis de ambiente precisam existir no ambiente de build da Vercel, e as políticas de RLS foram provadas contra o banco local, não contra o projeto real. Esta feature transforma o checklist do PLAN §14 Fase 5 em critérios verificáveis.

## Goals

- [ ] CRM acessível por uma URL pública estável, servido pela Vercel.
- [ ] Schema e políticas do projeto Supabase de produção idênticos às migrations versionadas.
- [ ] Recuperação de senha funcionando com o domínio real, não com `localhost`.
- [ ] Isolamento entre usuários confirmado no ambiente publicado, não apenas no local.
- [ ] Nenhum segredo além das chaves publicáveis do Supabase presente no bundle.

## Out of Scope

Explicitamente excluído. Documentado para evitar expansão de escopo.

| Feature | Reason |
| ------- | ------ |
| Domínio próprio personalizado | O domínio gratuito da Vercel atende o MVP; um domínio próprio é uma compra e uma configuração de DNS independentes do código. |
| Pipeline de CI executando a suíte antes do deploy | Valioso, mas é uma feature de engenharia à parte; o MVP verifica localmente antes de publicar. |
| Ambiente de homologação separado | Um segundo projeto Supabase dobra o custo de manutenção do schema para um produto de usuário único. |
| Serviço externo de monitoramento | AD-011 definiu observabilidade interna via `error_logs`. |
| Backup automatizado e plano de recuperação | O plano gratuito do Supabase já retém backups diários; uma política própria exige decisão de retenção ainda não tomada. |
| Otimização de desempenho do bundle além do padrão do Vite | Nenhum requisito de desempenho do PLAN a exige. |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui — nada fica silenciosamente indefinido.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Plataforma de hospedagem | Vercel, com build do Vite e saída estática | PLAN §14 Fase 5 a especifica nominalmente | y |
| Projetos Supabase | Um único projeto, de produção; desenvolvimento roda no Supabase local do CLI | Evita custo e divergência de schema entre dois projetos remotos para um produto de usuário único | n |
| Como o schema chega à produção | `supabase db push` a partir das migrations versionadas, nunca edição manual no dashboard | Decorre de AD-002; um ajuste manual faz produção divergir do repositório sem deixar rastro | y |
| Roteamento de SPA na Vercel | Reescrita de todas as rotas para `index.html` | Sem isso, abrir `/clients/123` direto ou recarregar a página devolve 404 da Vercel, e não a aplicação | n |
| Gatilho de publicação | Push na branch principal publica em produção; branches de feature geram preview | Comportamento padrão da Vercel; nenhum requisito justifica alterá-lo | n |
| URLs de redirecionamento do Auth | Site URL aponta para o domínio de produção; a lista de redirects permitidos inclui o domínio de produção e `http://localhost:5173` | Sem o domínio real, o link de recuperação chega apontando para localhost; sem localhost, o desenvolvimento local para de funcionar | n |
| Conteúdo dos e-mails do Auth | Modelos padrão do Supabase, em inglês, sem personalização | Personalizar modelos é trabalho de conteúdo fora do escopo técnico do MVP; fica registrado como dívida visível ao usuário | n |
| Verificação pós-deploy | Roteiro manual executado contra a URL de produção, com duas contas reais | A suíte E2E aponta para o ambiente local; rodá-la contra produção criaria dados descartáveis no banco real | n |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Aplicação publicada e acessível ⭐ MVP

**User Story**: Como consultor, quero abrir o CRM pelo navegador do celular a partir de uma URL, para usá-lo onde trabalho de verdade.

**Why P1**: É a definição de pronto do MVP; sem publicação, nada do que foi construído chega ao usuário.

**Acceptance Criteria**:

1. WHEN um push ocorre na branch principal THEN o sistema SHALL executar o build de produção na Vercel e SHALL publicar o resultado em uma URL pública.
2. The system SHALL definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do projeto na Vercel, apontando para o projeto Supabase de produção.
3. IF o build falhar THEN o sistema SHALL manter a versão anterior no ar e SHALL não publicar o artefato quebrado.
4. WHEN uma rota profunda como `/clients/:id` é aberta diretamente ou recarregada THEN o sistema SHALL servir a aplicação, e não uma página de erro do provedor.
5. The system SHALL servir a aplicação sobre HTTPS.
6. The system SHALL manter o bundle publicado livre de qualquer chave de serviço do Supabase, contendo apenas as chaves publicáveis.

**Independent Test**: Abrir a URL de produção em uma janela anônima no celular, colar uma rota profunda e ver a aplicação carregar.

---

### P1: Banco de produção alinhado ao repositório ⭐ MVP

**User Story**: Como desenvolvedor, quero que o banco de produção seja exatamente o que está nas migrations, para que nenhuma diferença silenciosa exista entre o que testei e o que o usuário usa.

**Why P1**: A RLS é a única fronteira de autorização (AD-001); uma política ausente em produção é um vazamento de dados.

**Acceptance Criteria**:

1. WHEN as migrations são aplicadas ao projeto de produção THEN o sistema SHALL reproduzir as mesmas tabelas, constraints, índices, triggers e políticas do ambiente local.
2. WHEN uma verificação de diferença é executada após a aplicação THEN o sistema SHALL reportar nenhuma divergência entre as migrations do repositório e o schema remoto.
3. The system SHALL manter Row Level Security habilitada em `profiles`, `clients`, `notes` e `error_logs` no projeto de produção.
4. IF alguma tabela exposta pela API estiver sem RLS habilitada THEN o sistema SHALL ser considerado não publicável até que isso seja corrigido.
5. The system SHALL manter a confirmação de e-mail desativada no Supabase Auth de produção, conforme AD-007.

**Independent Test**: Rodar a verificação de diferença do CLI contra o projeto de produção e obter saída vazia.

---

### P1: Autenticação funcionando no domínio real ⭐ MVP

**User Story**: Como consultor, quero criar conta, entrar e recuperar minha senha na URL publicada, para que o produto seja utilizável de fato.

**Why P1**: O link de recuperação apontando para `localhost` é a falha clássica deste passo, e só aparece em produção.

**Acceptance Criteria**:

1. The system SHALL configurar a Site URL do Supabase Auth com o domínio de produção.
2. The system SHALL incluir na lista de redirecionamentos permitidos o domínio de produção e o endereço de desenvolvimento local.
3. WHEN um consultor solicita recuperação de senha em produção THEN o sistema SHALL enviar um e-mail cujo link aponta para `/reset-password` no domínio de produção.
4. WHEN esse link é aberto THEN o sistema SHALL permitir definir a nova senha e SHALL autenticar o consultor em seguida.
5. IF um redirecionamento apontar para um domínio fora da lista permitida THEN o sistema SHALL recusá-lo.
6. WHEN um consultor cria conta em produção THEN o sistema SHALL criar a linha correspondente em `profiles` pelo trigger.

**Independent Test**: Criar uma conta real na URL publicada, sair, pedir recuperação, abrir o link recebido por e-mail e entrar com a nova senha.

---

### P1: Verificação de isolamento no ambiente real ⭐ MVP

**User Story**: Como consultor, quero a confirmação de que a separação de dados funciona no ambiente publicado, e não apenas nos testes locais, antes de registrar dados de pessoas reais.

**Why P1**: PLAN §14 Fase 5 pede explicitamente verificar as políticas de RLS em ambiente real.

**Acceptance Criteria**:

1. WHEN duas contas distintas são criadas em produção, cada uma com clientes e notas THEN o sistema SHALL exibir a cada uma exclusivamente os próprios registros.
2. IF uma conta acessar a URL da ficha de um cliente da outra THEN o sistema SHALL exibir estado de não encontrado, sem dados nem notas.
3. WHEN o roteiro completo — cadastro, login, criar cliente, filtrar por região, criar nota, editar cliente e nota, excluir cliente, sair — é executado em produção THEN o sistema SHALL concluir cada passo sem erro.
4. WHEN um cliente é excluído em produção THEN o sistema SHALL remover suas notas junto.
5. The system SHALL ter suas contas de verificação removidas do projeto de produção após a conclusão do roteiro.

**Independent Test**: Executar o roteiro com duas contas na URL publicada e registrar o resultado de cada passo.

---

### P2: Documentação de operação

**User Story**: Como desenvolvedor retomando o projeto meses depois, quero saber como rodar, migrar e publicar sem redescobrir nada, para não ficar com medo de tocar no sistema.

**Why P2**: Não bloqueia a publicação, mas é o que impede o projeto de travar na primeira manutenção.

**Acceptance Criteria**:

1. The system SHALL documentar no README os passos para rodar localmente, incluindo Supabase CLI e variáveis de ambiente.
2. The system SHALL documentar como criar uma nova migration e como aplicá-la em produção.
3. The system SHALL documentar como consultar `error_logs` para diagnosticar uma falha relatada.
4. The system SHALL documentar as configurações do projeto Supabase que não vivem em migrations, incluindo a confirmação de e-mail desativada e as URLs de redirecionamento.

**Independent Test**: Alguém sem contexto segue o README e chega ao app rodando localmente com banco.

---

## Edge Cases

- IF as variáveis de ambiente estiverem ausentes na Vercel THEN o sistema SHALL falhar o build de forma explícita, em vez de publicar um app que quebra em tempo de execução.
- IF uma migration falhar ao ser aplicada em produção THEN o sistema SHALL interromper a aplicação, deixando o banco no estado anterior e o erro visível.
- WHEN um deploy de preview é gerado a partir de uma branch THEN o sistema SHALL apontar para o mesmo projeto Supabase de produção, e essa consequência SHALL estar documentada.
- IF o e-mail de recuperação não chegar THEN o sistema SHALL ter o diagnóstico documentado, cobrindo limite de envio do plano gratuito e pasta de spam.
- WHEN o consultor abre a aplicação publicada em um navegador sem `localStorage` disponível THEN o sistema SHALL exibir uma mensagem explicando que a sessão não pode ser mantida.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| DEP-01 | P1: Publicação — projeto Vercel, build e variáveis de ambiente | Design | Pending |
| DEP-02 | P1: Publicação — reescrita de rotas para SPA | Design | Pending |
| DEP-03 | P1: Publicação — ausência de segredos no bundle | Design | Pending |
| DEP-04 | P1: Banco — aplicação das migrations em produção | Design | Pending |
| DEP-05 | P1: Banco — verificação de divergência de schema e RLS habilitada | Design | Pending |
| DEP-06 | P1: Auth — Site URL e lista de redirecionamentos permitidos | Design | Pending |
| DEP-07 | P1: Auth — recuperação de senha verificada no domínio real | Design | Pending |
| DEP-08 | P1: Isolamento — roteiro de verificação com duas contas em produção | Design | Pending |
| DEP-09 | P2: README com operação local, migrations e publicação | Design | Pending |
| DEP-10 | P2: Documentação das configurações fora das migrations | Design | Pending |

**Coverage:** 10 total, 0 mapeados para tarefas, 10 aguardando a fase Tasks.

---

## Success Criteria

- [ ] O consultor usa o CRM pelo celular a partir da URL publicada, sem instalar nada.
- [ ] A verificação de divergência entre migrations e schema de produção sai vazia.
- [ ] O link de recuperação de senha recebido por e-mail leva ao domínio de produção e funciona.
- [ ] O roteiro de duas contas confirma o isolamento no ambiente real, e as contas de teste são removidas ao final.
- [ ] Um desenvolvedor sem contexto publica uma alteração seguindo apenas o README.
