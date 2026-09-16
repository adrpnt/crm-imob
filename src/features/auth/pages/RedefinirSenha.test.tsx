import type { Session } from '@supabase/supabase-js'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ContextoDeAutenticacao } from '../auth-context'
import { ANONIMO, autenticado } from '../estado'
import { redefinirSenha } from '../services/auth-service'
import { RedefinirSenha } from './RedefinirSenha'

vi.mock('../services/auth-service', () => ({ redefinirSenha: vi.fn() }))

const redefinirMock = vi.mocked(redefinirSenha)
const SESSAO = { access_token: 'a', user: { id: 'u1' } } as unknown as Session

function renderizar({ emRecuperacao = true, entrada = '/reset-password' } = {}) {
  const estado = emRecuperacao ? autenticado(SESSAO, true) : ANONIMO
  const router = createMemoryRouter(
    [
      { path: '/reset-password', element: <RedefinirSenha /> },
      { path: '/clients', element: <p>listagem de clientes</p> },
      { path: '/forgot-password', element: <p>tela de recuperação</p> },
    ],
    { initialEntries: [entrada] },
  )
  render(
    <ContextoDeAutenticacao.Provider value={estado}>
      <RouterProvider router={router} />
    </ContextoDeAutenticacao.Provider>,
  )
  return router
}

async function definirSenha(senha = 'nova-senha-123', confirmacao = senha) {
  await userEvent.type(screen.getByLabelText('Nova senha'), senha)
  await userEvent.type(screen.getByLabelText('Confirmação da nova senha'), confirmacao)
  await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))
}

beforeEach(() => {
  redefinirMock.mockResolvedValue({ ok: true })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('RedefinirSenha com sessão de recuperação', () => {
  it('apresenta o formulário de nova senha', () => {
    renderizar()
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmação da nova senha')).toBeInTheDocument()
  })

  it('valida antes de chamar o serviço', async () => {
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByText('A senha precisa de ao menos 8 caracteres')).toBeInTheDocument()
    expect(redefinirMock).not.toHaveBeenCalled()
  })

  it('reporta divergência no campo de confirmação', async () => {
    renderizar()
    await definirSenha('nova-senha-123', 'outra-coisa-456')

    const erro = await screen.findByText('A confirmação não confere com a senha')
    expect(screen.getByLabelText('Confirmação da nova senha')).toHaveAttribute(
      'aria-describedby',
      erro.id,
    )
    expect(redefinirMock).not.toHaveBeenCalled()
  })

  it('salva a nova senha e leva ao CRM', async () => {
    const router = renderizar()
    await definirSenha()

    expect(redefinirMock).toHaveBeenCalledWith('nova-senha-123')
    expect(await screen.findByText('listagem de clientes')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/clients')
  })

  it('explica quando o servidor recusa a troca', async () => {
    redefinirMock.mockResolvedValue({
      ok: false,
      mensagem: 'Este link expirou ou já foi usado. Solicite um novo.',
    })
    const router = renderizar()
    await definirSenha()

    expect(await screen.findByRole('alert')).toHaveTextContent(/expirou ou já foi usado/i)
    expect(router.state.location.pathname).toBe('/reset-password')
  })

  it('desabilita o botão durante o salvamento', async () => {
    let concluir: (r: { ok: true }) => void = () => {}
    redefinirMock.mockReturnValue(
      new Promise((resolve) => {
        concluir = resolve
      }),
    )

    renderizar()
    await definirSenha()

    const botao = await screen.findByRole('button', { name: /salvando/i })
    expect(botao).toBeDisabled()
    await userEvent.click(botao)
    expect(redefinirMock).toHaveBeenCalledOnce()

    concluir({ ok: true })
    await screen.findByText('listagem de clientes')
  })
})

describe('RedefinirSenha sem sessão de recuperação', () => {
  // AUTH-08 AC7: quem chegou digitando o endereço precisa ser orientado, e não
  // ver um formulário que falharia ao ser enviado.
  it('orienta a abrir o link do e-mail, sem formulário', () => {
    renderizar({ emRecuperacao: false })

    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/abra o link que enviamos/i)
  })

  it('oferece caminho para solicitar um novo link', async () => {
    renderizar({ emRecuperacao: false })
    await userEvent.click(screen.getByRole('link', { name: 'Solicitar um novo link' }))
    expect(await screen.findByText('tela de recuperação')).toBeInTheDocument()
  })

  // AUTH-08 AC5: chegar por um link expirado é diferente de chegar sem link, e
  // o Supabase sinaliza isso no fragmento da URL.
  it('explica que o link expirou, quando foi esse o caso', () => {
    renderizar({
      emRecuperacao: false,
      entrada: '/reset-password#error=access_denied&error_code=otp_expired',
    })

    const aviso = screen.getByRole('status')
    expect(aviso).toHaveTextContent(/este link expirou/i)
    expect(aviso).not.toHaveTextContent(/abra o link que enviamos/i)
  })

  it('distingue link expirado de chegada sem link', () => {
    const { unmount } = render(
      <ContextoDeAutenticacao.Provider value={ANONIMO}>
        <RouterProvider
          router={createMemoryRouter([{ path: '/reset-password', element: <RedefinirSenha /> }], {
            initialEntries: ['/reset-password#error_code=otp_expired'],
          })}
        />
      </ContextoDeAutenticacao.Provider>,
    )
    const comLink = screen.getByRole('status').textContent
    unmount()

    renderizar({ emRecuperacao: false })
    const semLink = screen.getByRole('status').textContent

    expect(comLink).not.toBe(semLink)
  })
})
