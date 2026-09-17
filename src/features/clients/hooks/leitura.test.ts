import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PADROES, type FiltrosDeClientes } from '../filtros'
import {
  buscarCliente,
  chaveDaListagem,
  chaveDoCliente,
  CHAVE_DE_REGIOES,
  listarClientes,
  listarRegioes,
  type Cliente,
  type PaginaDeClientes,
} from '../services/client-service'
import { useClient, useClients, useRegioes } from './leitura'

// As chaves e os tipos vêm do módulo real: é nelas que os testes asseram, e
// substituí-las por dublê provaria a chave do dublê, não a do serviço.
vi.mock('../services/client-service', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../services/client-service')>()),
  listarClientes: vi.fn(),
  buscarCliente: vi.fn(),
  listarRegioes: vi.fn(),
}))

const listar = vi.mocked(listarClientes)
const buscar = vi.mocked(buscarCliente)
const regioes = vi.mocked(listarRegioes)

const CLIENTE = { id: 'c1', name: 'Joana Silva' } as Cliente
const PAGINA: PaginaDeClientes = { clientes: [CLIENTE], total: 1 }
const SEGUNDA: PaginaDeClientes = { clientes: [{ id: 'c2', name: 'Bruno' } as Cliente], total: 2 }

function filtros(ajustes: Partial<FiltrosDeClientes> = {}): FiltrosDeClientes {
  return { ...PADROES, ...ajustes }
}

/**
 * Cliente de consultas novo por teste, sem repetição de falha.
 *
 * O cliente da aplicação é um singleton com cache e política de retry
 * próprios: reaproveitá-lo faria um teste ver o dado que o anterior deixou.
 */
function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: cliente }, children)
  return { cliente, wrapper }
}

beforeEach(() => {
  listar.mockResolvedValue(PAGINA)
  buscar.mockResolvedValue(CLIENTE)
  regioes.mockResolvedValue(['Centro', 'Zona Sul'])
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useClients', () => {
  it('devolve a página do serviço sob a chave derivada dos filtros', async () => {
    const { cliente, wrapper } = montar()
    const f = filtros({ status: 'lead', page: 2 })

    const { result } = renderHook(() => useClients(f), { wrapper })

    expect(result.current.isPending).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(PAGINA)
    expect(listar).toHaveBeenCalledWith(f)
    expect(cliente.getQueryData(chaveDaListagem(f))).toEqual(PAGINA)
  })

  // A chave precisa conter os sete campos: um filtro de fora dela mudaria a
  // tela sem mudar a consulta, e o consultor veria a lista antiga filtrada.
  it('refaz a consulta quando qualquer um dos filtros muda', async () => {
    const { wrapper } = montar()
    const variacoes: Partial<FiltrosDeClientes>[] = [
      { busca: 'joana' },
      { status: 'lead' },
      { origem: 'instagram' },
      { regiao: 'Zona Sul' },
      { sort: 'name' },
      { order: 'asc' },
      { page: 3 },
    ]

    const { result, rerender } = renderHook(({ f }: { f: FiltrosDeClientes }) => useClients(f), {
      wrapper,
      initialProps: { f: filtros() },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    for (const variacao of variacoes) {
      rerender({ f: filtros(variacao) })
      await waitFor(() => expect(result.current.isFetching).toBe(false))
    }

    expect(listar.mock.calls.map(([recebido]) => recebido)).toEqual([
      filtros(),
      ...variacoes.map((v) => filtros(v)),
    ])
  })

  it('mantém a página anterior visível durante a troca de página', async () => {
    const { wrapper } = montar()
    let liberar: (pagina: PaginaDeClientes) => void = () => {}

    const { result, rerender } = renderHook(({ f }: { f: FiltrosDeClientes }) => useClients(f), {
      wrapper,
      initialProps: { f: filtros() },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    listar.mockImplementationOnce(
      () => new Promise<PaginaDeClientes>((aceitar) => (liberar = aceitar)),
    )
    rerender({ f: filtros({ page: 2 }) })

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true))
    expect(result.current.data).toEqual(PAGINA)

    liberar(SEGUNDA)
    await waitFor(() => expect(result.current.data).toEqual(SEGUNDA))
    expect(result.current.isPlaceholderData).toBe(false)
  })

  it('expõe o erro da consulta, que a tela traduz em estado de erro', async () => {
    const { wrapper } = montar()
    const falha = new Error('rede indisponível')
    listar.mockRejectedValueOnce(falha)

    const { result } = renderHook(() => useClients(filtros()), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(falha)
    expect(result.current.data).toBeUndefined()
  })
})

describe('useClient', () => {
  it('devolve o cliente sob a chave própria do identificador', async () => {
    const { cliente, wrapper } = montar()

    const { result } = renderHook(() => useClient('c1'), { wrapper })

    expect(result.current.isPending).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(CLIENTE)
    expect(buscar).toHaveBeenCalledWith('c1')
    expect(cliente.getQueryData(chaveDoCliente('c1'))).toEqual(CLIENTE)
  })

  it('expõe o erro em vez de devolver cliente fabricado', async () => {
    const { wrapper } = montar()
    const falha = { code: 'PGRST116' }
    buscar.mockRejectedValueOnce(falha)

    const { result } = renderHook(() => useClient('inexistente'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(falha)
    expect(result.current.data).toBeUndefined()
  })
})

describe('useRegioes', () => {
  it('devolve as regiões sob a chave própria', async () => {
    const { cliente, wrapper } = montar()

    const { result } = renderHook(() => useRegioes(), { wrapper })

    expect(result.current.isPending).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(['Centro', 'Zona Sul'])
    expect(cliente.getQueryData(CHAVE_DE_REGIOES)).toEqual(['Centro', 'Zona Sul'])
  })

  it('expõe o erro da consulta de regiões', async () => {
    const { wrapper } = montar()
    const falha = new Error('falhou')
    regioes.mockRejectedValueOnce(falha)

    const { result } = renderHook(() => useRegioes(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(falha)
  })

  // A chave é prefixada por `clients` de propósito: as três mutações invalidam
  // `['clients']`, e é isso que faz uma região nova aparecer no filtro sem
  // que cada mutação precise se lembrar de invalidar uma segunda chave.
  it('é alcançada pela invalidação da listagem', async () => {
    const { cliente, wrapper } = montar()

    const { result } = renderHook(() => useRegioes(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(regioes).toHaveBeenCalledOnce()

    await cliente.invalidateQueries({ queryKey: ['clients'] })

    await waitFor(() => expect(regioes).toHaveBeenCalledTimes(2))
  })

  // Sem a validade longa, cada abertura da listagem releria a coluna `region`
  // de todas as linhas do consultor.
  it('tem validade longa: remontar não refaz a consulta', async () => {
    const { wrapper } = montar()

    const primeira = renderHook(() => useRegioes(), { wrapper })
    await waitFor(() => expect(primeira.result.current.isSuccess).toBe(true))
    primeira.unmount()

    const segunda = renderHook(() => useRegioes(), { wrapper })
    await waitFor(() => expect(segunda.result.current.isSuccess).toBe(true))

    expect(regioes).toHaveBeenCalledOnce()
  })
})
