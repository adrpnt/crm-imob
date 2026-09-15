-- Remove clients_id_owner_idx.
--
-- Criado sob a justificativa de tornar o `exists` das políticas de notes um
-- index-only scan. A medição de plano feita ao implementar notes, com 1000
-- clientes e 10000 notas, mostrou que o planner não executa assim: ele eleva o
-- `exists` a um SubPlan com hash, avaliado uma vez, atendido por varredura de
-- bitmap sobre clients filtrando owner_id — que já é coluna à esquerda de
-- cinco índices desta tabela.
--
-- Sem justificativa medida, o índice só custa: escrita em todo insert e update
-- de clients, mais espaço. Se alguma consulta futura provar precisar dele,
-- recria-se com a medição anexada.

drop index if exists public.clients_id_owner_idx;
