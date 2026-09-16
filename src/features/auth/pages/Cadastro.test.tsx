import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cadastrar } from '../services/auth-service'
import { Cadastro } from './Cadastro'

vi.mock('../services/auth-service', () => ({ cadastrar: vi.fn() }))

const cadastrarMock = vi.mocked(cadastrar)

function renderizar() {
  const router = createMemoryRouter(
    [
      { path: '/signup', element: <Cadastro /> },
      { path: '/clients', element: <p>listagem de clientes</p> },
      { path: '/login', element: <p>tela de login</p> },
    ],
    { initialEntries: ['/signup'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const VALIDO = {
  nome: 'Joana Silva',
  email: 'joana@exemplo.com',
  senha: 'senha-valida-123',
}

async function preencher(campos: Partial<typeof VALIDO> & { confirmacao?: string } = {}) {
  const dados = { ...VALIDO, confirmacao: campos.confirmacao ?? VALIDO.senha, ...campos }
  await userEvent.type(screen.getByLabelText('Nome completo'), dados.nome)
  await userEvent.type(screen.getByLabelText('E-mail'), dados.email)
  await userEvent.type(screen.getByLabelText('Senha'), dados.senha)
  await userEvent.type(screen.getByLabelText('Confirmação da senha'), dados.confirmacao)
}

const enviar = () => userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

beforeEach(() => {
  cadastrarMock.mockResolvedValue({ ok: true })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Cadastro', () => {
  it('reporta os quatro campos vazios sem chamar o serviço', async () => {
    renderizar()
    await enviar()

    expect(await screen.findByText('Informe seu nome completo')).toBeInTheDocument()
    expect(screen.getByText('Informe um e-mail válido')).toBeInTheDocument()
    expect(screen.getByText('A senha precisa de ao menos 8 caracteres')).toBeInTheDocument()
    expect(cadastrarMock).not.toHaveBeenCalled()
  })

  it('reporta a divergência no campo de confirmação, não no de senha', async () => {
    renderizar()
    await preencher({ confirmacao: 'outra-coisa-123' })
    await enviar()

    const erro = await screen.findByText('A confirmação não confere com a senha')
    const confirmacao = screen.getByLabelText('Confirmação da senha')
    expect(confirmacao).toHaveAttribute('aria-describedby', erro.id)
    expect(screen.getByLabelText('Senha')).not.toHaveAttribute('aria-invalid')
    expect(cadastrarMock).not.toHaveBeenCalled()
  })

  it('reporta senha curta sem chamar o serviço', async () => {
    renderizar()
    await preencher({ senha: '1234567', confirmacao: '1234567' })
    await enviar()

    expect(await screen.findByText('A senha precisa de ao menos 8 caracteres')).toBeInTheDocument()
    expect(cadastrarMock).not.toHaveBeenCalled()
  })

  it('entrega os dados normalizados, sem a confirmação', async () => {
    renderizar()
    await preencher({ email: '  JOANA@Exemplo.com  ', nome: '  Joana   Silva  ' })
    await enviar()

    expect(cadastrarMock).toHaveBeenCalledWith({
      nomeCompleto: 'Joana Silva',
      email: 'joana@exemplo.com',
      senha: VALIDO.senha,
    })
  })

  // AD-007: a confirmação de e-mail está desligada, então o cadastro devolve
  // sessão e o consultor entra direto, sem tela intermediária.
  it('entra no CRM direto após criar a conta', async () => {
    const router = renderizar()
    await preencher()
    await enviar()

    expect(await screen.findByText('listagem de clientes')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/clients')
  })

  it('orienta quando o e-mail já tem conta', async () => {
    cadastrarMock.mockResolvedValue({
      ok: false,
      mensagem: 'Este e-mail já possui conta. Entre ou recupere sua senha.',
    })
    renderizar()
    await preencher()
    await enviar()

    expect(await screen.findByRole('alert')).toHaveTextContent(/já possui conta/i)
  })

  // Limpar quatro campos por causa de um e-mail repetido seria punir o erro.
  it('preserva o que foi digitado quando o serviço recusa', async () => {
    cadastrarMock.mockResolvedValue({ ok: false, mensagem: 'Este e-mail já possui conta.' })
    renderizar()
    await preencher()
    await enviar()
    await screen.findByRole('alert')

    expect(screen.getByLabelText('Nome completo')).toHaveValue('Joana Silva')
    expect(screen.getByLabelText('E-mail')).toHaveValue('joana@exemplo.com')
    expect(screen.getByLabelText('Senha')).toHaveValue(VALIDO.senha)
  })

  it('não navega quando o serviço recusa', async () => {
    cadastrarMock.mockResolvedValue({ ok: false, mensagem: 'falhou' })
    const router = renderizar()
    await preencher()
    await enviar()
    await screen.findByRole('alert')

    expect(router.state.location.pathname).toBe('/signup')
  })

  it('desabilita o botão e impede segundo envio durante o cadastro', async () => {
    let concluir: (r: { ok: true }) => void = () => {}
    cadastrarMock.mockReturnValue(
      new Promise((resolve) => {
        concluir = resolve
      }),
    )

    renderizar()
    await preencher()
    await enviar()

    const botao = await screen.findByRole('button', { name: /criando conta/i })
    expect(botao).toBeDisabled()
    await userEvent.click(botao)
    expect(cadastrarMock).toHaveBeenCalledOnce()

    concluir({ ok: true })
    expect(await screen.findByText('listagem de clientes')).toBeInTheDocument()
  })

  it('oferece caminho para quem já tem conta', () => {
    renderizar()
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument()
  })
})
