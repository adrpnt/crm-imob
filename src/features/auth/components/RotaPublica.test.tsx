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

  // Sem isto, a guarda venceria a corrida contra a navegação da tela de login e
  // descartaria a rota que o consultor tentou abrir antes de entrar.
  it('respeita a rota pretendida ao redirecionar quem acabou de entrar', () => {
    const router = createMemoryRouter(
      [
        { element: <RotaPublica />, children: [{ path: '/login', element: <p>login</p> }] },
        { path: '/profile', element: <p>tela de perfil</p> },
        { path: '/clients', element: <p>listagem de clientes</p> },
      ],
      { initialEntries: ['/login?redirect=%2Fprofile'] },
    )
    render(
      <ContextoDeAutenticacao.Provider value={autenticado(SESSAO)}>
        <RouterProvider router={router} />
      </ContextoDeAutenticacao.Provider>,
    )
    expect(screen.getByText('tela de perfil')).toBeInTheDocument()
  })

  it('ignora destino externo no parâmetro ao redirecionar', () => {
    const router = createMemoryRouter(
      [
        { element: <RotaPublica />, children: [{ path: '/login', element: <p>login</p> }] },
        { path: '/clients', element: <p>listagem de clientes</p> },
      ],
      { initialEntries: ['/login?redirect=https%3A%2F%2Fsite-falso.example'] },
    )
    render(
      <ContextoDeAutenticacao.Provider value={autenticado(SESSAO)}>
        <RouterProvider router={router} />
      </ContextoDeAutenticacao.Provider>,
    )
    expect(screen.getByText('listagem de clientes')).toBeInTheDocument()
  })

  it('leva ao CRM quem já está autenticado e tenta o cadastro', () => {
    renderizar(autenticado(SESSAO), '/signup')
    expect(screen.getByText('listagem de clientes')).toBeInTheDocument()
  })

  // A guarda deixa passar qualquer estado nesta rota. Quem recusa o formulário a
  // uma sessão comum é a própria tela, que distingue os três casos — e é o que o
  // AUTH-08 AC7 pede, ao mandar orientar quem chega "sem sessão de recuperação".
  //
  // Redirecionar aqui também quebraria o fluxo real: o supabase-js emite
  // INITIAL_SESSION com a sessão do link antes de PASSWORD_RECOVERY, e neste
  // intervalo a guarda veria "autenticado sem marca".
  it('nunca redireciona a rota de redefinição, qualquer que seja a sessão', () => {
    const casos = [autenticado(SESSAO, false), autenticado(SESSAO, true), ANONIMO] as const

    for (const estado of casos) {
      const { unmount } = renderizar(estado, '/reset-password')
      expect(screen.getByText('formulário de nova senha')).toBeInTheDocument()
      expect(screen.queryByText('listagem de clientes')).not.toBeInTheDocument()
      unmount()
    }
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
})
