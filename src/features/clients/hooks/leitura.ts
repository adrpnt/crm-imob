import { keepPreviousData, useQuery } from '@tanstack/react-query'

import type { FiltrosDeClientes } from '../filtros'
import {
  buscarCliente,
  CHAVE_DE_REGIOES,
  chaveDaListagem,
  chaveDoCliente,
  listarClientes,
  listarRegioes,
} from '../services/client-service'

/**
 * Validade das regiões, bem acima dos 30 segundos globais.
 *
 * A lista muda só quando um cliente é criado, editado ou excluído, e as três
 * mutações invalidam `['clients']`, que alcança esta chave (AD-015). O prazo
 * longo é o que evita reler a coluna de todas as linhas do consultor a cada
 * abertura da listagem, sem deixar a opção velha na tela depois de uma escrita.
 */
const VALIDADE_DAS_REGIOES = 5 * 60_000

/**
 * Página corrente da carteira, com o total que satisfaz os filtros.
 *
 * A chave é derivada dos filtros inteiros (AD-015): mudar qualquer um deles
 * produz chave nova e, portanto, consulta nova — não há efeito sincronizando
 * estado com URL.
 *
 * `placeholderData` mantém a página anterior visível durante a troca. Sem ele,
 * cada paginada pisca esqueleto e a lista salta de altura, porque a chave nova
 * começa sem dado nenhum.
 */
export function useClients(filtros: FiltrosDeClientes) {
  return useQuery({
    queryKey: chaveDaListagem(filtros),
    queryFn: () => listarClientes(filtros),
    placeholderData: keepPreviousData,
  })
}

/** Um cliente pelo identificador. O erro sobe: é a ficha que o traduz (CLNT-14 AC2). */
export function useClient(id: string) {
  return useQuery({
    queryKey: chaveDoCliente(id),
    queryFn: () => buscarCliente(id),
  })
}

/** Regiões já usadas pelo consultor, para as sugestões e o filtro (CLNT-04). */
export function useRegioes() {
  return useQuery({
    queryKey: CHAVE_DE_REGIOES,
    queryFn: listarRegioes,
    staleTime: VALIDADE_DAS_REGIOES,
  })
}
