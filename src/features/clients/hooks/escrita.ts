import { useMutation, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query'

import type { DadosDeCliente } from '../schemas'
import {
  atualizarCliente,
  CHAVE_DE_CLIENTES,
  chaveDoCliente,
  criarCliente,
  excluirCliente,
  type ResultadoDeEscrita,
} from '../services/client-service'

/**
 * Refaz as consultas afetadas por uma escrita bem-sucedida.
 *
 * Invalidar em vez de escrever no cache à mão é o que mantém um único ponto de
 * invalidação e o que faz o total e a paginação se recalcularem pela consulta
 * refeita, sem cálculo local (CLNT-17 AC4). Invalidar `['clients']` alcança a
 * listagem e as regiões de uma vez, porque a chave das regiões é prefixada por
 * ela.
 *
 * Recusa do serviço não invalida nada: o banco não mudou, e refazer a consulta
 * só custaria uma ida à rede para devolver a mesma lista (CLNT-17 AC6).
 */
function refazer(
  clienteDeConsultas: QueryClient,
  resultado: ResultadoDeEscrita,
  chaves: readonly QueryKey[],
): void {
  if (!resultado.ok) return
  for (const chave of chaves) {
    void clienteDeConsultas.invalidateQueries({ queryKey: chave })
  }
}

/**
 * Cria um cliente (CLNT-02).
 *
 * Nenhuma das três mutações trata 401 ou 403 por conta própria: isso é do
 * `mutationCache.onError` do `queryClient` (AD-016), que dispara para toda
 * mutação e não pode ser esquecido por uma nova.
 */
export function useCreateClient() {
  const clienteDeConsultas = useQueryClient()

  return useMutation({
    mutationFn: (dados: DadosDeCliente) => criarCliente(dados),
    onSuccess: (resultado) => refazer(clienteDeConsultas, resultado, [CHAVE_DE_CLIENTES]),
  })
}

export type EdicaoDeCliente = { id: string; dados: DadosDeCliente }

/** Atualiza um cliente (CLNT-15). Invalida também a ficha, que exibe os mesmos valores. */
export function useUpdateClient() {
  const clienteDeConsultas = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dados }: EdicaoDeCliente) => atualizarCliente(id, dados),
    onSuccess: (resultado, { id }) =>
      refazer(clienteDeConsultas, resultado, [CHAVE_DE_CLIENTES, chaveDoCliente(id)]),
  })
}

/** Exclui um cliente (CLNT-17). As notas vão por cascata, no banco. */
export function useDeleteClient() {
  const clienteDeConsultas = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => excluirCliente(id),
    onSuccess: (resultado, id) =>
      refazer(clienteDeConsultas, resultado, [CHAVE_DE_CLIENTES, chaveDoCliente(id)]),
  })
}
