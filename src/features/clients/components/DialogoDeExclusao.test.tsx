import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { excluirCliente, type Cliente } from '../services/client-service'
import { DialogoDeExclusao } from './DialogoDeExclusao'

vi.mock('../services/client-service', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../services/client-service')>()),
  excluirCliente: vi.fn(),
}))

const excluir = vi.mocked(excluirCliente)

const CLIENTE = { id: 'c1', name: 'Joana Silva' }

/** A linha devolvida pelo `delete ... returning`, como o serviço a entrega. */
const EXCLUIDO: Cliente = {
  id: 'c1',
  owner_id: 'u1',
  name: 'Joana Silva',
  email: null,
  phone: null,
  status: 'lead',
  source: null,
  region: null,
  income: null,
  income_type: null,
  search_text: 'joana silva',
  created_at: '2026-01-05T12:00:00Z',
  updated_at: '2026-01-05T12:00:00Z',
}

function renderizar({ destino = '/clients?status=lead&page=2', aoFechar = vi.fn() } = {}) {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(
    [
      {
        path: '/clients/:id',
        element: (
          <DialogoDeExclusao aberto cliente={CLIENTE} destino={destino} aoFechar={aoFechar} />
        ),
      },
      { path: '/clients', element: <p>listagem de clientes</p> },
    ],
    { initialEntries: ['/clients/c1'] },
  )

  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, aoFechar }
}

const confirmar = () => userEvent.click(screen.getByRole('button', { name: 'Excluir' }))

beforeEach(() => {
  excluir.mockResolvedValue({ ok: true, cliente: EXCLUIDO })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('DialogoDeExclusao', () => {
  // CLNT-16 AC1: o diálogo nomeia o cliente.
  it('nomeia o cliente na confirmação', () => {
    renderizar()

    const dialogo = screen.getByRole('dialog')
    expect(dialogo).toHaveAccessibleName('Excluir cliente?')
    expect(dialogo).toHaveTextContent('Joana Silva')
  })

  // CLNT-16 AC1: irreversível, e as notas vão junto.
  it('avisa que a ação é irreversível e que as notas serão removidas junto', () => {
    renderizar()

    const dialogo = screen.getByRole('dialog')
    expect(dialogo).toHaveTextContent(/irreversível/)
    expect(dialogo).toHaveTextContent(/notas dele serão removidas junto/)
  })

  // CLNT-16 AC2: a ação destrutiva é visualmente distinta da primária.
  it('apresenta a exclusão como ação destrutiva', () => {
    renderizar()

    expect(screen.getByRole('button', { name: 'Excluir' })).toHaveAttribute(
      'data-variante',
      'destrutiva',
    )
  })

  // CLNT-16 AC2: a opção segura é a focada quando o diálogo abre.
  it('deixa o cancelamento como opção focada por padrão', () => {
    renderizar()

    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })

  // CLNT-16 AC3: confirmar exclui o cliente.
  it('exclui o cliente pelo identificador ao confirmar', async () => {
    renderizar()
    await confirmar()

    await waitFor(() => expect(excluir).toHaveBeenCalledWith('c1'))
  })

  // CLNT-16 AC3: volta à listagem com os filtros anteriores preservados.
  it('retorna à listagem preservando os filtros de origem', async () => {
    const { router } = renderizar()
    await confirmar()

    expect(await screen.findByText('listagem de clientes')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/clients')
    expect(router.state.location.search).toBe('?status=lead&page=2')
  })

  // CLNT-16 AC3: a confirmação é exibida pela listagem, que é onde o consultor chega.
  it('leva a confirmação da exclusão para a listagem', async () => {
    const { router } = renderizar()
    await confirmar()

    await screen.findByText('listagem de clientes')
    expect(router.state.location.state).toEqual({ mensagem: 'Cliente excluído.' })
  })

  // CLNT-16 AC8: progresso indicado e segunda confirmação impedida.
  it('indica progresso e impede uma segunda confirmação durante a exclusão', async () => {
    excluir.mockReturnValue(new Promise(() => {}))
    renderizar()
    await confirmar()

    const botao = await screen.findByRole('button', { name: 'Excluindo…' })
    expect(botao).toBeDisabled()
    expect(botao).toHaveAttribute('aria-busy', 'true')

    await userEvent.click(botao)
    expect(excluir).toHaveBeenCalledTimes(1)
  })

  // CLNT-16 AC6: falha mantém o registro visível e exibe a mensagem.
  it('mantém o registro e exibe a mensagem quando a exclusão falha', async () => {
    excluir.mockResolvedValue({
      ok: false,
      mensagem: 'Você não tem permissão para esta alteração.',
    })
    const { router } = renderizar()
    await confirmar()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Você não tem permissão para esta alteração.',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/clients/c1')
  })

  // CLNT-16 AC7: cancelar fecha sem nenhuma alteração.
  it('fecha sem excluir ao cancelar', async () => {
    const { aoFechar, router } = renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(aoFechar).toHaveBeenCalledTimes(1)
    expect(excluir).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/clients/c1')
  })
})
