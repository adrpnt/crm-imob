# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

### L-001 - Quando política de RLS e grant por coluna cobrem o mesmo caso, um teste comportamental passa pelo motivo errado: verifique a camada de grant no catálogo (has_column_privilege, pg_policies), sempre com controle positivo.
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `db/rls` · harmful: 0
- features: foundation, auth
- evidence: M6,M7 rodada 1 (db/rls) (+1 more)
- last seen: 2026-09-17T14:09:19Z

### L-012 - Encadear verificação e commit no mesmo comando elimina o ponto de decisão entre eles: rode o gate, leia a saída, e só então commite numa invocação separada.
- signal: `gate_fail` · recurrence: 2 feature(s) · scope: `processo` · harmful: 0
- features: auth, foundation
- evidence: T28 foundation, T3 auth, T22 auth (processo) (+1 more)
- last seen: 2026-09-17T14:09:25Z

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-002 - Asserção de trigger por nome não detecta o evento errado: assere tgtype (19 = ROW|BEFORE|UPDATE, 5 = ROW|AFTER|INSERT) além do nome.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `db/triggers` · harmful: 0
- features: foundation
- evidence: N1 rodada 2 (db/triggers)
- last seen: 2026-09-16T13:42:19Z

### L-003 - Para provar que um trigger de updated_at faz efeito, semeie o valor antigo com o trigger desligado: now() não avança dentro da transação, e comparar contra data fixa passa mesmo com o trigger no evento errado.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `db/triggers` · harmful: 0
- features: foundation
- evidence: N1 rodada 2 (db/triggers)
- last seen: 2026-09-16T13:42:19Z

### L-004 - Amostrar um valor inválido não detecta um conjunto de domínio alargado nem encurtado: assere pg_get_constraintdef exato.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `db/constraints` · harmful: 0
- features: foundation
- evidence: N7,N8 rodada 2 (db/constraints)
- last seen: 2026-09-16T13:42:19Z

### L-005 - Teste de layout que verifica classe CSS não detecta o pipeline do Tailwind removido: assere estilo computado em navegador real.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `ui/estilo` · harmful: 0
- features: foundation
- evidence: N3 rodada 2 (ui/estilo)
- last seen: 2026-09-16T13:42:19Z

### L-006 - Contagem de testes em documento é checklist, não gate: compare os arquivos de teste no disco com os que o runner descobre, senão estreitar um glob apaga metade da suíte em silêncio.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `ferramental` · harmful: 0
- features: foundation
- evidence: V5 rodada 3 (ferramental)
- last seen: 2026-09-16T13:42:19Z

### L-007 - Em React Router data mode, um error boundary de classe na raiz não captura erro lançado dentro de rota: a fronteira padrão do router pega antes. É preciso registrar ErrorBoundary nas rotas de topo.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui/erros` · harmful: 0
- features: foundation
- evidence: FND-16 / T20 (ui/erros)
- last seen: 2026-09-16T13:42:19Z

### L-008 - Ao remover algo que o spec exige, emende o spec na mesma tarefa: o índice removido por medição ficou três rodadas contradizendo o AC10.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `processo` · harmful: 0
- features: foundation
- evidence: T24 / AD-004 (processo)
- last seen: 2026-09-16T13:42:19Z

### L-009 - Serviço novo sem teste próprio é invisível quando todo consumidor o substitui por mock: ao criar um serviço, crie junto o teste unitário e o de pilha real, como já foi feito para o serviço irmão.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `servicos` · harmful: 0
- features: auth
- evidence: M1,M2,M3 rodada 1 (servicos)
- last seen: 2026-09-16T18:54:42Z

### L-010 - Opção que coincide com o padrão da biblioteca é indetectável: torne-a explícita no código e assere-a, senão desligá-la não quebra nada.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `configuracao` · harmful: 0
- features: auth
- evidence: M5 rodada 1 (configuracao)
- last seen: 2026-09-16T18:54:42Z

### L-011 - Quando o código diverge do spec e um teste protege o código, a contradição some de vista: teste que falha ao restaurar o comportamento do spec é sinal de spec desatualizado, não de regressão.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `processo` · harmful: 0
- features: auth
- evidence: M8 rodada 1 / L3 (processo)
- last seen: 2026-09-16T18:54:42Z

### L-013 - Teste que monta a precondição por propriedade ou por URL assere sobre um estado que a navegação real não produz: cubra a cadeia desde a tela que origina o estado, senão o requisito fica coberto por partes e a mutação sobrevive.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `testes/cadeia` · harmful: 0
- features: clients
- evidence: M5 rodada 2 (CLNT-16 AC3) + L1 da auditoria (CLNT-14 AC8): mutacao sobreviveu a 551 unitarios e 23 E2E (testes/cadeia)
- last seen: 2026-09-19T14:34:32Z

### L-014 - Critério que descreve uma transição sem definir o caso limite (total zero, lista vazia, primeiro elemento) deixa o teste asserir a leitura de quem implementou: feche o limite no spec antes de implementar.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: clients
- evidence: S2 rodada 3 (CLNT-17 AC5): 'navegar para a pagina anterior' nao define o caso de total zero (spec)
- last seen: 2026-09-19T14:34:38Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
