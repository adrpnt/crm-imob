import type { Session } from '@supabase/supabase-js'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'

import { ContextoDeAutenticacao } from '../auth-context'
import { ANONIMO, CARREGANDO, autenticado, type EstadoDeAutenticacao } from '../estado'
import { RotaPublica } from './RotaPublica'

const SESSAO = { access_token: 'a', user: { id: 'u1' } } as unknown as Session

function renderizar(estado: EstadoDeAutenticacao, entrada: string) {
  const router = createMemoryRouter(
    [
      {
        element: <RotaPublica />,
        children: [
          { path: '/login', element: <p>formulário de login</p> },
          { path: '/signup', element: <p>formulário de cadastro</p> },
          { path: '/reset-password', element: <p>formulário de nova senha</p> },
        ],
      },
      { path: '/clients', element: <p>listagem de clientes</p> },
    ],
    { initialEntries: [entrada] },
  )

  return render(
    <ContextoDeAutenticacao.Provider value={estado}>
      <RouterProvider router={router} />
    </ContextoDeAutenticacao.Provider>,
  )
}

describe('RotaPublica', () => {
  it('não renderiza nem o formulário nem o CRM enquanto a sessão carrega', () => {
    renderizar(CARREGANDO, '/login')
    expect(screen.queryByText('formulário de login')).not.toBeInTheDocument()
    expect(screen.queryByText('listagem de clientes')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renderiza o formulário para quem não tem sessão', () => {
    renderizar(ANONIMO, '/login')
    expect(screen.getByText('formulário de login')).toBeInTheDocument()
  })

  it('leva ao CRM quem já está autenticado', () => {
    renderizar(autenticado(SESSAO), '/login')
    expect(screen.getByText('listagem de clientes')).toBeInTheDocument()
    expect(screen.queryByText('formulário de login')).not.toBeInTheDocument()
  })

  it('leva ao CRM quem já está autenticado e tenta o cadastro', () => {
    renderizar(autenticado(SESSAO), '/signup')
    expect(screen.getByText('listagem de clientes')).toBeInTheDocument()
  })

  // O link de recuperação autentica o usuário. Sem esta exceção, a regra acima
  // o expulsaria da tela de redefinir senha um instante após ele clicar.
  it('libera a redefinição para uma sessão de recuperação', () => {
    renderizar(autenticado(SESSAO, true), '/reset-password')
    expect(screen.getByText('formulário de nova senha')).toBeInTheDocument()
  })

  // Quem já entrou não chegou ali por um link de e-mail.
  it('não libera a redefinição para uma sessão comum', () => {
    renderizar(autenticado(SESSAO, false), '/reset-password')
    expect(screen.getByText('listagem de clientes')).toBeInTheDocument()
    expect(screen.queryByText('formulário de nova senha')).not.toBeInTheDocument()
  })

  // A exceção é de uma rota só: a marca não devolve acesso ao resto.
  it('a marca de recuperação não abre as demais rotas públicas', () => {
    renderizar(autenticado(SESSAO, true), '/login')
    expect(screen.getByText('listagem de clientes')).toBeInTheDocument()
    expect(screen.queryByText('formulário de login')).not.toBeInTheDocument()
  })

  it('a marca de recuperação não devolve acesso ao cadastro', () => {
    renderizar(autenticado(SESSAO, true), '/signup')
    expect(screen.getByText('listagem de clientes')).toBeInTheDocument()
  })

  it('quem não tem sessão alcança a redefinição, para ver a orientação de pedir link', () => {
    renderizar(ANONIMO, '/reset-password')
    expect(screen.getByText('formulário de nova senha')).toBeInTheDocument()
  })
})
