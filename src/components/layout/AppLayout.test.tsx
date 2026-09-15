import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'

import { AppLayout } from './AppLayout'

function renderizar(acoesDoUsuario?: React.ReactNode) {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <AppLayout acoesDoUsuario={acoesDoUsuario} />,
      children: [{ index: true, element: <p>conteúdo da rota</p> }],
    },
  ])
  return render(<RouterProvider router={router} />)
}

describe('AppLayout', () => {
  it('renderiza o conteúdo da rota filha no lugar do Outlet', () => {
    renderizar()
    expect(screen.getByText('conteúdo da rota')).toBeInTheDocument()
  })

  it('exibe a identificação do produto no cabeçalho', () => {
    renderizar()
    expect(screen.getByRole('banner')).toHaveTextContent('CRM Imobiliário')
  })

  it('reserva o espaço das ações do usuário mesmo quando ninguém o preenche', () => {
    renderizar()
    expect(screen.getByTestId('acoes-do-usuario')).toBeEmptyDOMElement()
  })

  it('renderiza as ações do usuário fornecidas pela rota', () => {
    renderizar(<button type="button">Sair</button>)
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('mantém o conteúdo dentro da região principal, e não do cabeçalho', () => {
    renderizar()
    expect(screen.getByRole('main')).toHaveTextContent('conteúdo da rota')
    expect(screen.getByRole('banner')).not.toHaveTextContent('conteúdo da rota')
  })
})
