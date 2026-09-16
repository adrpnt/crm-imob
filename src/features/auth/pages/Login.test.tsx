import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { marcarSessaoExpirada } from '../../../lib/sessao-expirada'
import { entrar } from '../services/auth-service'
import { Login } from './Login'

vi.mock('../services/auth-service', () => ({ entrar: vi.fn() }))

const entrarMock = vi.mocked(entrar)

function renderizar(entrada = '/login') {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <Login /> },
      { path: '/clients', element: <p>listagem de clientes</p> },
      { path: '/clients/:id', element: <p>ficha do cliente</p> },
      { path: '/signup', element: <p>tela de cadastro</p> },
      { path: '/forgot-password', element: <p>tela de recuperação</p> },
    ],
    { initialEntries: [entrada] },
  )
  render(<RouterProvider router={router} />)
  return router
}

async function preencherEEnviar(email = 'joana@exemplo.com', senha = 'senha-valida') {
  await userEvent.type(screen.getByLabelText('E-mail'), email)
  await userEvent.type(screen.getByLabelText('Senha'), senha)
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

beforeEach(() => {
  entrarMock.mockResolvedValue({ ok: true })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Login', () => {
  it('valida no cliente antes de chamar o serviço', async () => {
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Informe um e-mail válido')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha')).toBeInTheDocument()
    expect(entrarMock).not.toHaveBeenCalled()
  })

  it('entrega as credenciais normalizadas ao serviço', async () => {
    renderizar()
    await preencherEEnviar('  JOANA@Exemplo.com  ')

    expect(entrarMock).toHaveBeenCalledWith({
      email: 'joana@exemplo.com',
      senha: 'senha-valida',
    })
  })

  it('leva ao CRM após entrar', async () => {
    const router = renderizar()
    await preencherEEnviar()

    expect(await screen.findByText('listagem de clientes')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/clients')
  })

  it('leva à rota pretendida quando há uma', async () => {
    const router = renderizar('/login?redirect=%2Fclients%2F123')
    await preencherEEnviar()

    expect(await screen.findByText('ficha do cliente')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/clients/123')
  })

  // Redirecionamento aberto: o destino externo precisa ser ignorado, não seguido.
  it('ignora um destino externo e vai ao CRM', async () => {
    const router = renderizar('/login?redirect=https%3A%2F%2Fsite-falso.com')
    await preencherEEnviar()

    expect(await screen.findByText('listagem de clientes')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/clients')
  })

  it('exibe a frase genérica quando as credenciais não servem', async () => {
    entrarMock.mockResolvedValue({ ok: false, mensagem: 'E-mail ou senha inválidos' })
    renderizar()
    await preencherEEnviar()

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos')
  })

  it('não navega quando o serviço recusa', async () => {
    entrarMock.mockResolvedValue({ ok: false, mensagem: 'E-mail ou senha inválidos' })
    const router = renderizar()
    await preencherEEnviar()

    await screen.findByRole('alert')
    expect(router.state.location.pathname).toBe('/login')
  })

  // O alerta precisa sumir assim que o consultor reenvia, e não só quando a
  // segunda tentativa termina. Manter o erro antigo na tela durante o reenvio
  // faz parecer que a nova tentativa já falhou.
  it('limpa o erro anterior assim que o reenvio começa', async () => {
    entrarMock.mockResolvedValue({ ok: false, mensagem: 'E-mail ou senha inválidos' })
    renderizar()
    await preencherEEnviar()
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    let concluir: (r: { ok: true }) => void = () => {}
    entrarMock.mockReturnValue(
      new Promise((resolve) => {
        concluir = resolve
      }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    // Ainda em voo: o erro antigo já saiu da tela.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    concluir({ ok: true })
    expect(await screen.findByText('listagem de clientes')).toBeInTheDocument()
  })

  it('avisa quando a sessão expirou, sem confundir com erro de credencial', async () => {
    marcarSessaoExpirada()
    renderizar()

    const aviso = screen.getByRole('status')
    expect(aviso).toHaveTextContent(/sua sessão expirou/i)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('não repete o aviso de expiração numa segunda visita', async () => {
    marcarSessaoExpirada()
    const { unmount } = render(
      <RouterProvider
        router={createMemoryRouter([{ path: '/login', element: <Login /> }], {
          initialEntries: ['/login'],
        })}
      />,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
    unmount()

    renderizar()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  // AUTH-04 AC5: durante a autenticação o botão desabilita e anuncia progresso.
  it('desabilita o botão e anuncia progresso durante o envio', async () => {
    let concluir: (r: { ok: true }) => void = () => {}
    entrarMock.mockReturnValue(
      new Promise((resolve) => {
        concluir = resolve
      }),
    )

    renderizar()
    await preencherEEnviar()

    const botao = await screen.findByRole('button', { name: /entrando/i })
    expect(botao).toBeDisabled()
    expect(botao).toHaveAttribute('aria-busy', 'true')

    await userEvent.click(botao)
    expect(entrarMock).toHaveBeenCalledOnce()

    concluir({ ok: true })
    expect(await screen.findByText('listagem de clientes')).toBeInTheDocument()
  })

  it('oferece caminho para cadastro e para recuperação', async () => {
    renderizar()
    expect(screen.getByRole('link', { name: 'Criar conta' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toBeInTheDocument()
  })
})
