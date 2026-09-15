import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registrarErroDoCliente } from '../../lib/error-log'
import { rotas } from '../../app/router'
import { ErroDeRota } from './ErroDeRota'

vi.mock('../../lib/error-log', () => ({ registrarErroDoCliente: vi.fn() }))

const registrar = vi.mocked(registrarErroDoCliente)

function Explode(): never {
  throw new Error('a rota quebrou')
}

describe('ErroDeRota', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    registrar.mockResolvedValue('gravado')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('exibe a tela de erro quando a rota lança', () => {
    const router = createMemoryRouter([
      { path: '/', element: <Explode />, ErrorBoundary: ErroDeRota },
    ])
    render(<RouterProvider router={router} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado')
  })

  it('registra o erro lançado pela rota', () => {
    const router = createMemoryRouter([
      { path: '/', element: <Explode />, ErrorBoundary: ErroDeRota },
    ])
    render(<RouterProvider router={router} />)

    expect(registrar).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'a rota quebrou' }),
      expect.any(String),
    )
  })

  it('segue exibindo a tela quando o próprio registro falha', () => {
    registrar.mockRejectedValue(new Error('registro explodiu'))
    const router = createMemoryRouter([
      { path: '/', element: <Explode />, ErrorBoundary: ErroDeRota },
    ])

    expect(() => render(<RouterProvider router={router} />)).not.toThrow()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  // A lacuna que motivou este componente: sem ErrorBoundary nas rotas de topo,
  // a fronteira padrão do React Router captura o erro e mostra a tela genérica
  // da biblioteca, sem registrar nada.
  it('está registrada em todas as rotas de topo da árvore real', () => {
    expect(rotas.length).toBeGreaterThan(0)
    for (const rota of rotas) {
      expect(rota.ErrorBoundary).toBe(ErroDeRota)
    }
  })
})
