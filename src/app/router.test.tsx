import { render, screen } from '@testing-library/react'
import { createMemoryRouter, type RouteObject } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'

import { rotas } from './router'

function renderizarEm(caminho: string) {
  return render(
    <RouterProvider router={createMemoryRouter(rotas, { initialEntries: [caminho] })} />,
  )
}

/** Percorre a árvore inteira, incluindo rotas aninhadas. */
function todasAsRotas(lista: RouteObject[]): RouteObject[] {
  return lista.flatMap((rota) => [rota, ...todasAsRotas(rota.children ?? [])])
}

describe('árvore de rotas', () => {
  it('renderiza a raiz dentro do layout privado', () => {
    renderizarEm('/')
    expect(screen.getByRole('banner')).toHaveTextContent('CRM Imobiliário')
    expect(screen.getByRole('heading', { name: 'CRM Imobiliário' })).toBeInTheDocument()
  })

  it('renderiza a página de não encontrado em um endereço inexistente', () => {
    renderizarEm('/rota-que-nao-existe')
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
  })

  it('não mostra a moldura privada em uma rota inexistente', () => {
    renderizarEm('/rota-que-nao-existe')
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('oferece caminho de volta ao CRM na página de não encontrado', () => {
    renderizarEm('/rota-que-nao-existe')
    expect(screen.getByRole('link', { name: 'Voltar ao CRM' })).toHaveAttribute('href', '/')
  })

  // AD-013: os dados ficam com o TanStack Query. Uma rota com loader criaria um
  // segundo cache, com invalidação em dois lugares. Esta asserção é o alarme.
  it('não define loader nem action em nenhuma rota', () => {
    const comCarregamento = todasAsRotas(rotas).filter((r) => r.loader ?? r.action)
    expect(comCarregamento).toEqual([])
  })
})
