import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pedirRecuperacao } from '../services/auth-service'
import { EsqueciSenha } from './EsqueciSenha'

vi.mock('../services/auth-service', () => ({ pedirRecuperacao: vi.fn() }))

const pedirMock = vi.mocked(pedirRecuperacao)

function renderizar() {
  render(
    <RouterProvider
      router={createMemoryRouter(
        [
          { path: '/forgot-password', element: <EsqueciSenha /> },
          { path: '/login', element: <p>tela de login</p> },
        ],
        { initialEntries: ['/forgot-password'] },
      )}
    />,
  )
}

async function pedirPara(email: string) {
  await userEvent.type(screen.getByLabelText('E-mail'), email)
  await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }))
}

beforeEach(() => {
  pedirMock.mockResolvedValue({ ok: true })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('EsqueciSenha', () => {
  it('valida o e-mail antes de chamar o serviço', async () => {
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByText('Informe um e-mail válido')).toBeInTheDocument()
    expect(pedirMock).not.toHaveBeenCalled()
  })

  it('pede o link apontando para a rota de redefinição na origem atual', async () => {
    renderizar()
    await pedirPara('joana@exemplo.com')

    expect(pedirMock).toHaveBeenCalledWith(
      'joana@exemplo.com',
      `${window.location.origin}/reset-password`,
    )
  })

  it('normaliza o e-mail antes de enviar', async () => {
    renderizar()
    await pedirPara('  JOANA@Exemplo.com  ')
    expect(pedirMock).toHaveBeenCalledWith('joana@exemplo.com', expect.any(String))
  })

  // A confirmação é condicional de propósito. Dizer "enviamos para você"
  // confirmaria que o endereço tem cadastro, transformando a tela num
  // verificador de e-mails.
  it('confirma sem revelar se a conta existe', async () => {
    renderizar()
    await pedirPara('joana@exemplo.com')

    const confirmacao = await screen.findByRole('status')
    expect(confirmacao).toHaveTextContent(/se houver uma conta/i)
    expect(confirmacao.textContent).not.toMatch(/enviamos para você|conta encontrada|não existe/i)
  })

  it('substitui o formulário pela confirmação, evitando reenvio acidental', async () => {
    renderizar()
    await pedirPara('joana@exemplo.com')

    await screen.findByRole('status')
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar link' })).not.toBeInTheDocument()
  })

  it('exibe erro e mantém o formulário quando a rede falha', async () => {
    pedirMock.mockResolvedValue({ ok: false, mensagem: 'Sem conexão com o servidor.' })
    renderizar()
    await pedirPara('joana@exemplo.com')

    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão com o servidor.')
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
  })

  it('desabilita o botão durante o envio', async () => {
    let concluir: (r: { ok: true }) => void = () => {}
    pedirMock.mockReturnValue(
      new Promise((resolve) => {
        concluir = resolve
      }),
    )

    renderizar()
    await pedirPara('joana@exemplo.com')

    const botao = await screen.findByRole('button', { name: /enviando/i })
    expect(botao).toBeDisabled()
    await userEvent.click(botao)
    expect(pedirMock).toHaveBeenCalledOnce()

    concluir({ ok: true })
    await screen.findByRole('status')
  })

  it('oferece caminho de volta ao login em ambos os estados', async () => {
    renderizar()
    expect(screen.getByRole('link', { name: 'Voltar para entrar' })).toBeInTheDocument()

    await pedirPara('joana@exemplo.com')
    await screen.findByRole('status')
    expect(screen.getByRole('link', { name: 'Voltar para entrar' })).toBeInTheDocument()
  })
})
