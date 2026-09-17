import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PADROES } from '../filtros'
import type { DadosDeCliente } from '../schemas'
import {
  atualizarCliente,
  CHAVE_DE_REGIOES,
  chaveDaListagem,
  chaveDoCliente,
  criarCliente,
  excluirCliente,
  type Cliente,
  type PaginaDeClientes,
} from '../services/client-service'
import { useCreateClient, useDeleteClient, useUpdateClient } from './escrita'

// As chaves vêm do módulo real: é nelas que os testes asseram, e substituí-las
// por dublê provaria a chave do dublê, não a que a invalidação alcança.
vi.mock('../services/client-service', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../services/client-service')>()),
  criarCliente: vi.fn(),
  atualizarCliente: vi.fn(),
  excluirCliente: vi.fn(),
}))

const criar = vi.mocked(criarCliente)
const atualizar = vi.mocked(atualizarCliente)
const excluir = vi.mocked(excluirCliente)

const CLIENTE = { id: 'c1', name: 'Joana Silva' } as Cliente
const PAGINA: PaginaDeClientes = { clientes: [CLIENTE], total: 1 }
const REGIOES = ['Centro', 'Zona Sul']
const OUTRO = { id: 'c2', name: 'Bruno' } as Cliente
const DADOS = { name: 'Joana Silva', status: 'lead' } as DadosDeCliente

/**
 * Cliente de consultas novo por teste, com as quatro chaves já semeadas.
 *
 * As consultas ficam sem observador de propósito: sem tela montada, a
 * invalidação marca a chave para refazer em vez de disparar a consulta, e é a
 * marca que os testes leem. `aoFalhar` é o `MutationCache` do `queryClient`
 * real (AD-016), aqui em forma de espião.
 */
function montar() {
  const aoFalhar = vi.fn()
  const cliente = new QueryClient({
    mutationCache: new MutationCache({ onError: aoFalhar }),
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  cliente.setQueryData(chaveDaListagem(PADROES), PAGINA)
  cliente.setQueryData(CHAVE_DE_REGIOES, REGIOES)
  cliente.setQueryData(chaveDoCliente('c1'), CLIENTE)
  cliente.setQueryData(chaveDoCliente('c2'), OUTRO)

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: cliente }, children)

  const paraRefazer = (chave: readonly unknown[]) =>
    cliente.getQueryState(chave)?.isInvalidated === true

  return { cliente, wrapper, aoFalhar, paraRefazer }
}

beforeEach(() => {
  criar.mockResolvedValue({ ok: true, cliente: CLIENTE })
  atualizar.mockResolvedValue({ ok: true, cliente: CLIENTE })
  excluir.mockResolvedValue({ ok: true, cliente: CLIENTE })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useCreateClient', () => {
  it('envia os dados ao serviço e devolve o resultado', async () => {
    const { wrapper } = montar()

    const { result } = renderHook(() => useCreateClient(), { wrapper })
    result.current.mutate(DADOS)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(criar).toHaveBeenCalledWith(DADOS)
    expect(result.current.data).toEqual({ ok: true, cliente: CLIENTE })
  })

  // `['clients']` alcança a listagem e as regiões; a ficha tem chave própria e
  // não muda por um cadastro, então fica de fora — invalidar tudo esconderia
  // uma chave errada atrás do excesso.
  it('marca a listagem e as regiões para refazer, sem tocar na ficha', async () => {
    const { wrapper, paraRefazer } = montar()

    const { result } = renderHook(() => useCreateClient(), { wrapper })
    result.current.mutate(DADOS)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(paraRefazer(chaveDaListagem(PADROES))).toBe(true)
    expect(paraRefazer(CHAVE_DE_REGIOES)).toBe(true)
    expect(paraRefazer(chaveDoCliente('c1'))).toBe(false)
  })

  // CLNT-17 AC4: o total e a paginação se recalculam pela consulta refeita. Se
  // a mutação escrevesse no cache, o dado semeado teria mudado aqui.
  it('não escreve no cache à mão: a página semeada continua intacta', async () => {
    const { cliente, wrapper } = montar()

    const { result } = renderHook(() => useCreateClient(), { wrapper })
    result.current.mutate(DADOS)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(cliente.getQueryData(chaveDaListagem(PADROES))).toEqual(PAGINA)
    expect(cliente.getQueryData(CHAVE_DE_REGIOES)).toEqual(REGIOES)
  })

  // AD-016: a mutação não tem tratamento próprio de 401; o erro chega inteiro
  // ao `MutationCache`, que é quem encerra a sessão.
  it('entrega a falha de autorização ao MutationCache, sem tratá-la', async () => {
    const { wrapper, aoFalhar } = montar()
    const falha = { status: 401, message: 'JWT expired' }
    criar.mockRejectedValueOnce(falha)

    const { result } = renderHook(() => useCreateClient(), { wrapper })
    result.current.mutate(DADOS)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(falha)
    expect(aoFalhar).toHaveBeenCalledOnce()
    expect(aoFalhar.mock.calls[0][0]).toBe(falha)
  })
})

describe('useUpdateClient', () => {
  it('envia identificador e dados ao serviço', async () => {
    const { wrapper } = montar()

    const { result } = renderHook(() => useUpdateClient(), { wrapper })
    result.current.mutate({ id: 'c1', dados: DADOS })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(atualizar).toHaveBeenCalledWith('c1', DADOS)
    expect(result.current.data).toEqual({ ok: true, cliente: CLIENTE })
  })

  // CLNT-15 AC4: os novos valores aparecem na ficha e na listagem. A ficha do
  // outro cliente prova que a chave leva o identificador.
  it('marca a listagem, as regiões e a ficha editada para refazer', async () => {
    const { wrapper, paraRefazer } = montar()

    const { result } = renderHook(() => useUpdateClient(), { wrapper })
    result.current.mutate({ id: 'c1', dados: DADOS })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(paraRefazer(chaveDaListagem(PADROES))).toBe(true)
    expect(paraRefazer(CHAVE_DE_REGIOES)).toBe(true)
    expect(paraRefazer(chaveDoCliente('c1'))).toBe(true)
    expect(paraRefazer(chaveDoCliente('c2'))).toBe(false)
  })

  it('não escreve no cache à mão: a ficha semeada continua intacta', async () => {
    const { cliente, wrapper } = montar()

    const { result } = renderHook(() => useUpdateClient(), { wrapper })
    result.current.mutate({ id: 'c1', dados: DADOS })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(cliente.getQueryData(chaveDoCliente('c1'))).toEqual(CLIENTE)
    expect(cliente.getQueryData(chaveDaListagem(PADROES))).toEqual(PAGINA)
  })

  it('entrega a falha de autorização ao MutationCache, sem tratá-la', async () => {
    const { wrapper, aoFalhar } = montar()
    const falha = { status: 403, message: 'forbidden' }
    atualizar.mockRejectedValueOnce(falha)

    const { result } = renderHook(() => useUpdateClient(), { wrapper })
    result.current.mutate({ id: 'c1', dados: DADOS })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(falha)
    expect(aoFalhar).toHaveBeenCalledOnce()
    expect(aoFalhar.mock.calls[0][0]).toBe(falha)
  })
})

describe('useDeleteClient', () => {
  it('envia o identificador ao serviço', async () => {
    const { wrapper } = montar()

    const { result } = renderHook(() => useDeleteClient(), { wrapper })
    result.current.mutate('c1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(excluir).toHaveBeenCalledWith('c1')
    expect(result.current.data).toEqual({ ok: true, cliente: CLIENTE })
  })

  // CLNT-17 AC4: a listagem refeita é o que recalcula total e paginação.
  it('marca a listagem, as regiões e a ficha excluída para refazer', async () => {
    const { wrapper, paraRefazer } = montar()

    const { result } = renderHook(() => useDeleteClient(), { wrapper })
    result.current.mutate('c1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(paraRefazer(chaveDaListagem(PADROES))).toBe(true)
    expect(paraRefazer(CHAVE_DE_REGIOES)).toBe(true)
    expect(paraRefazer(chaveDoCliente('c1'))).toBe(true)
    expect(paraRefazer(chaveDoCliente('c2'))).toBe(false)
  })

  // CLNT-17 AC6: a exclusão recusada mantém o registro visível. Nada mudou no
  // banco, então nada é marcado para refazer.
  it('recusa do serviço mantém o registro visível e não marca nada para refazer', async () => {
    const { cliente, wrapper, paraRefazer } = montar()
    excluir.mockResolvedValueOnce({ ok: false, mensagem: 'Você não tem permissão.' })

    const { result } = renderHook(() => useDeleteClient(), { wrapper })
    result.current.mutate('c1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({ ok: false, mensagem: 'Você não tem permissão.' })
    expect(cliente.getQueryData(chaveDaListagem(PADROES))).toEqual(PAGINA)
    expect(paraRefazer(chaveDaListagem(PADROES))).toBe(false)
    expect(paraRefazer(chaveDoCliente('c1'))).toBe(false)
  })

  it('entrega a falha de autorização ao MutationCache, sem tratá-la', async () => {
    const { wrapper, aoFalhar } = montar()
    const falha = { status: 401, message: 'JWT expired' }
    excluir.mockRejectedValueOnce(falha)

    const { result } = renderHook(() => useDeleteClient(), { wrapper })
    result.current.mutate('c1')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(falha)
    expect(aoFalhar).toHaveBeenCalledOnce()
    expect(aoFalhar.mock.calls[0][0]).toBe(falha)
  })
})
