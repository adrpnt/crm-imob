import { useQueryClient } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { queryClient } from '../lib/query-client'
import { AppProviders } from './providers'

function Sonda() {
  const cliente = useQueryClient()
  return <span data-testid="sonda">{cliente === queryClient ? 'mesmo-cliente' : 'outro'}</span>
}

describe('AppProviders', () => {
  it('renderiza os filhos', () => {
    render(
      <AppProviders>
        <p>conteúdo</p>
      </AppProviders>,
    )
    expect(screen.getByText('conteúdo')).toBeInTheDocument()
  })

  it('disponibiliza a instância única do QueryClient para a árvore', () => {
    render(
      <AppProviders>
        <Sonda />
      </AppProviders>,
    )
    expect(screen.getByTestId('sonda')).toHaveTextContent('mesmo-cliente')
  })
})
