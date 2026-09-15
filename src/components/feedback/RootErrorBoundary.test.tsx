import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registrarErroDoCliente } from '../../lib/error-log'
import { RootErrorBoundary } from './RootErrorBoundary'

vi.mock('../../lib/error-log', () => ({ registrarErroDoCliente: vi.fn() }))

const registrar = vi.mocked(registrarErroDoCliente)

function Explode(): never {
  throw new Error('componente quebrou')
}

describe('RootErrorBoundary', () => {
  beforeEach(() => {
    // React relata o erro capturado no console; silenciado para não poluir a saída.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    registrar.mockResolvedValue('gravado')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('renderiza os filhos quando nada falha', () => {
    render(
      <RootErrorBoundary>
        <p>tudo certo</p>
      </RootErrorBoundary>,
    )
    expect(screen.getByText('tudo certo')).toBeInTheDocument()
    expect(registrar).not.toHaveBeenCalled()
  })

  it('substitui a árvore por uma tela de erro quando um filho lança acima do roteador', () => {
    render(
      <RootErrorBoundary>
        <Explode />
      </RootErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado')
  })

  it('oferece a ação de recarregar', async () => {
    const reload = vi.fn()
    vi.spyOn(globalThis, 'location', 'get').mockReturnValue({
      ...globalThis.location,
      pathname: '/clients/7',
      reload,
    } as Location)

    render(
      <RootErrorBoundary>
        <Explode />
      </RootErrorBoundary>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Recarregar' }))
    expect(reload).toHaveBeenCalledOnce()
  })

  it('registra o erro com a mensagem e a rota corrente', () => {
    vi.spyOn(globalThis, 'location', 'get').mockReturnValue({
      ...globalThis.location,
      pathname: '/clients/7',
    } as Location)

    render(
      <RootErrorBoundary>
        <Explode />
      </RootErrorBoundary>,
    )

    expect(registrar).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'componente quebrou' }),
      '/clients/7',
    )
  })

  it('segue exibindo a tela de erro quando o próprio registro falha', () => {
    registrar.mockRejectedValue(new Error('registro explodiu'))

    expect(() =>
      render(
        <RootErrorBoundary>
          <Explode />
        </RootErrorBoundary>,
      ),
    ).not.toThrow()
    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado')
  })
})
