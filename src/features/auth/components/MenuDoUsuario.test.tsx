import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sair } from '../services/auth-service'
import { buscarPerfil, CHAVE_DO_PERFIL, type Perfil } from '../services/profile-service'
import { MenuDoUsuario } from './MenuDoUsuario'

vi.mock('../services/auth-service', () => ({ sair: vi.fn() }))
vi.mock('../services/profile-service', async (original) => {
  const real = await original<typeof import('../services/profile-service')>()
  return { ...real, buscarPerfil: vi.fn() }
})

const sairMock = vi.mocked(sair)
const buscar = vi.mocked(buscarPerfil)

const PERFIL: Perfil = {
  id: 'u1',
  full_name: 'Joana Silva',
  email: 'joana@exemplo.com',
  phone: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/clients', element: <MenuDoUsuario /> },
      { path: '/profile', element: <p>tela de perfil</p> },
    ],
    { initialEntries: ['/clients'] },
  )
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return cliente
}

beforeEach(() => {
  buscar.mockResolvedValue(PERFIL)
  sairMock.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('MenuDoUsuario', () => {
  it('exibe o nome do consultor autenticado', async () => {
    renderizar()
    expect(await screen.findByText('Joana Silva')).toBeInTheDocument()
  })

  it('oferece a ação de sair mesmo antes de o perfil chegar', () => {
    buscar.mockReturnValue(new Promise(() => {}))
    renderizar()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
    expect(screen.queryByText('Joana Silva')).not.toBeInTheDocument()
  })

  it('leva à tela de perfil pelo nome', async () => {
    renderizar()
    await userEvent.click(await screen.findByRole('link', { name: 'Joana Silva' }))
    expect(await screen.findByText('tela de perfil')).toBeInTheDocument()
  })

  it('encerra a sessão ao sair', async () => {
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(sairMock).toHaveBeenCalledOnce()
  })

  // Navegar daqui faria a guarda pública devolver o consultor ao CRM no
  // instante entre a navegação e a chegada do evento SIGNED_OUT. Quem
  // redireciona é a guarda das rotas privadas, ao ver o estado mudar.
  it('não navega ao sair: quem redireciona é a guarda', async () => {
    const router = createMemoryRouter(
      [
        { path: '/clients', element: <MenuDoUsuario /> },
        { path: '/login', element: <p>tela de login</p> },
      ],
      { initialEntries: ['/clients'] },
    )
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(sairMock).toHaveBeenCalledOnce()
    expect(router.state.location.pathname).toBe('/clients')
  })

  // A mesma chave que a tela de perfil invalida ao salvar. É o que faz o nome
  // corrigido aparecer aqui sem recarregar a página.
  it('lê o perfil pela chave compartilhada com a tela de perfil', async () => {
    const cliente = renderizar()
    await screen.findByText('Joana Silva')

    buscar.mockResolvedValue({ ...PERFIL, full_name: 'Joana M. Silva' })
    await cliente.invalidateQueries({ queryKey: CHAVE_DO_PERFIL })

    expect(await screen.findByText('Joana M. Silva')).toBeInTheDocument()
  })
})
