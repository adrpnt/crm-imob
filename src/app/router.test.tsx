import { render, screen } from '@testing-library/react'
import { createMemoryRouter, type RouteObject } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it, vi } from 'vitest'

import { RotaProtegida } from '../features/auth/components/RotaProtegida'
import { RotaPublica } from '../features/auth/components/RotaPublica'
import { ErroDeRota } from '../components/feedback/ErroDeRota'
import { rotas } from './router'

vi.mock('../features/auth/services/profile-service', async (original) => {
  const real = await original<typeof import('../features/auth/services/profile-service')>()
  return { ...real, buscarPerfil: vi.fn().mockResolvedValue(null) }
})

function renderizarEm(caminho: string) {
  return render(
    <RouterProvider router={createMemoryRouter(rotas, { initialEntries: [caminho] })} />,
  )
}

/** Percorre a árvore inteira, incluindo rotas aninhadas. */
function todasAsRotas(lista: RouteObject[]): RouteObject[] {
  return lista.flatMap((rota) => [rota, ...todasAsRotas(rota.children ?? [])])
}

/**
 * Sobe a árvore a partir de uma rota, devolvendo os elementos de cada nível.
 *
 * Verificar a guarda pela árvore REAL, e não por uma montada no teste, é o que
 * faz esta suíte detectar uma rota nova cadastrada no lugar errado.
 */
function ancestraisDe(caminho: string): unknown[] {
  const encontrar = (lista: RouteObject[], acumulado: unknown[]): unknown[] | null => {
    for (const rota of lista) {
      const aqui = [...acumulado, rota.element]
      if (rota.path === caminho) return aqui
      const abaixo = rota.children ? encontrar(rota.children, aqui) : null
      if (abaixo) return abaixo
    }
    return null
  }
  const achado = encontrar(rotas, [])
  if (!achado) throw new Error(`rota ${caminho} não existe na árvore`)
  return achado
}

const tipoDe = (elemento: unknown) => (elemento as { type?: unknown } | null)?.type

const PRIVADAS = ['/clients', '/profile']
const PUBLICAS = ['/login', '/signup', '/forgot-password', '/reset-password']

describe('árvore de rotas', () => {
  it('coloca todas as rotas de CRM sob a guarda das privadas', () => {
    for (const caminho of PRIVADAS) {
      expect(ancestraisDe(caminho).map(tipoDe)).toContain(RotaProtegida)
    }
  })

  it('coloca todas as rotas de autenticação sob a guarda das públicas', () => {
    for (const caminho of PUBLICAS) {
      expect(ancestraisDe(caminho).map(tipoDe)).toContain(RotaPublica)
    }
  })

  it('não deixa rota de autenticação sob a guarda das privadas', () => {
    for (const caminho of PUBLICAS) {
      expect(ancestraisDe(caminho).map(tipoDe)).not.toContain(RotaProtegida)
    }
  })

  it('não deixa rota de CRM sob a guarda das públicas', () => {
    for (const caminho of PRIVADAS) {
      expect(ancestraisDe(caminho).map(tipoDe)).not.toContain(RotaPublica)
    }
  })

  it('registra a fronteira de erro em todas as rotas de topo', () => {
    expect(rotas.length).toBeGreaterThan(0)
    for (const rota of rotas) {
      expect(rota.ErrorBoundary).toBe(ErroDeRota)
    }
  })

  // AD-013: os dados ficam com o TanStack Query. Uma rota com loader criaria um
  // segundo cache, com invalidação em dois lugares.
  it('não define loader nem action em nenhuma rota', () => {
    const comCarregamento = todasAsRotas(rotas).filter((r) => r.loader ?? r.action)
    expect(comCarregamento).toEqual([])
  })

  it('renderiza a página de não encontrado em um endereço inexistente', () => {
    renderizarEm('/rota-que-nao-existe')
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
  })

  it('oferece caminho de volta ao CRM na página de não encontrado', () => {
    renderizarEm('/rota-que-nao-existe')
    expect(screen.getByRole('link', { name: 'Voltar ao CRM' })).toHaveAttribute('href', '/')
  })
})
