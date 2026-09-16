import type { Session } from '@supabase/supabase-js'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, useSearchParams } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'

import { ContextoDeAutenticacao } from '../auth-context'
import { ANONIMO, CARREGANDO, autenticado, type EstadoDeAutenticacao } from '../estado'
import { RotaProtegida } from './RotaProtegida'

const SESSAO = { access_token: 'a', user: { id: 'u1' } } as unknown as Session

/** Tela de login de mentira, que expõe o destino recebido. */
function LoginFalso() {
  const [parametros] = useSearchParams()
  return <span data-testid="login">destino:{parametros.get('redirect') ?? '(nenhum)'}</span>
}

function renderizar(estado: EstadoDeAutenticacao, entrada: string) {
  const router = createMemoryRouter(
    [
      {
        element: <RotaProtegida />,
        children: [
          { path: '/clients', element: <p>listagem privada</p> },
          { path: '/clients/:id', element: <p>ficha privada</p> },
        ],
      },
      { path: '/login', element: <LoginFalso /> },
    ],
    { initialEntries: [entrada] },
  )

  return render(
    <ContextoDeAutenticacao.Provider value={estado}>
      <RouterProvider router={router} />
    </ContextoDeAutenticacao.Provider>,
  )
}

describe('RotaProtegida', () => {
  // O estado do meio é o que costuma ser esquecido. Mandar para o login aqui
  // faria a tela piscar a cada recarregamento de quem já está autenticado.
  it('não renderiza nem o conteúdo nem o login enquanto a sessão carrega', () => {
    renderizar(CARREGANDO, '/clients')

    expect(screen.queryByText('listagem privada')).not.toBeInTheDocument()
    expect(screen.queryByTestId('login')).not.toBeInTheDocument()
  })

  it('exibe indicação de progresso enquanto carrega, e não uma tela em branco', () => {
    renderizar(CARREGANDO, '/clients')
    expect(screen.getByRole('status')).toHaveTextContent(/verificando sua sessão/i)
  })

  it('renderiza o conteúdo privado quando há sessão', () => {
    renderizar(autenticado(SESSAO), '/clients')
    expect(screen.getByText('listagem privada')).toBeInTheDocument()
  })

  it('leva ao login quando não há sessão', () => {
    renderizar(ANONIMO, '/clients')
    expect(screen.getByTestId('login')).toBeInTheDocument()
    expect(screen.queryByText('listagem privada')).not.toBeInTheDocument()
  })

  it('preserva a rota pretendida no destino', () => {
    renderizar(ANONIMO, '/clients/123')
    expect(screen.getByTestId('login')).toHaveTextContent('destino:/clients/123')
  })

  // Perder a query devolveria o consultor a uma listagem sem os filtros que ele
  // tinha aplicado, que é justamente o estado compartilhável do PLAN §7.
  it('preserva também os parâmetros de consulta, sem reinterpretá-los', () => {
    // A URL é codificada inteira, então o `+` chega ao destino como `+`, e não
    // convertido em espaço. O que importa é o destino ser idêntico ao pedido:
    // reinterpretar a query aqui devolveria o consultor a um filtro diferente
    // daquele que ele tentou abrir.
    const pedida = '/clients?status=lead&region=Zona+Sul'
    renderizar(ANONIMO, pedida)
    expect(screen.getByTestId('login')).toHaveTextContent(`destino:${pedida}`)
  })

  it('preserva o fragmento', () => {
    renderizar(ANONIMO, '/clients/123#notas')
    expect(screen.getByTestId('login')).toHaveTextContent('destino:/clients/123#notas')
  })

  it('substitui a entrada no histórico, para o botão voltar não recair na rota privada', () => {
    const router = createMemoryRouter(
      [
        { element: <RotaProtegida />, children: [{ path: '/clients', element: <p>privada</p> }] },
        { path: '/login', element: <LoginFalso /> },
      ],
      { initialEntries: ['/clients'] },
    )

    render(
      <ContextoDeAutenticacao.Provider value={ANONIMO}>
        <RouterProvider router={router} />
      </ContextoDeAutenticacao.Provider>,
    )

    // Com `replace`, a rota privada não fica no histórico: só há uma entrada.
    expect(router.state.location.pathname).toBe('/login')
    expect(window.history.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByTestId('login')).toBeInTheDocument()
  })
})
