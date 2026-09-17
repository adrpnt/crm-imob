import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { listarRegioes } from '../services/client-service'
import { PainelDeFiltros } from './PainelDeFiltros'

vi.mock('../services/client-service', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../services/client-service')>()),
  listarRegioes: vi.fn(),
}))

const regioes = vi.mocked(listarRegioes)

function renderizar(entrada = '/clients') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: '/clients', element: <PainelDeFiltros /> }], {
    initialEntries: [entrada],
  })

  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const selecao = (rotulo: string) => screen.getByLabelText<HTMLSelectElement>(rotulo)
const valores = (rotulo: string) => [...selecao(rotulo).options].map((opcao) => opcao.value)

/** As regiões chegam por consulta; esperar por elas antes de escolher uma. */
const esperarAsRegioes = () =>
  waitFor(() => expect(valores('Região')).toEqual(['', 'Barra', 'Centro', 'Zona Sul']))

beforeEach(() => {
  regioes.mockResolvedValue(['Barra', 'Centro', 'Zona Sul'])
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('PainelDeFiltros', () => {
  // CLNT-18 AC1: rótulo real e visível em cada controle.
  it('exibe os três filtros com rótulo visível', () => {
    renderizar()

    expect(selecao('Status')).toBeInTheDocument()
    expect(selecao('Origem')).toBeInTheDocument()
    expect(selecao('Região')).toBeInTheDocument()
  })

  it('oferece os cinco status do domínio, com opção para todos', () => {
    renderizar()

    expect(valores('Status')).toEqual(['', 'lead', 'contacted', 'qualified', 'client', 'inactive'])
    expect(screen.getByRole('option', { name: 'Todos' })).toBeInTheDocument()
  })

  it('oferece as seis origens do domínio, com opção para todas', () => {
    renderizar()

    expect(valores('Origem')).toEqual([
      '',
      'indication',
      'instagram',
      'website',
      'whatsapp',
      'portal',
      'other',
    ])
  })

  // CLNT-04 e AC5: as opções são as regiões que o próprio consultor já usou.
  // A ordem alfabética vem de `listarRegioes` (client-service.test.ts:242).
  it('oferece como região as que vêm do useRegioes', async () => {
    renderizar()

    await esperarAsRegioes()
    expect(regioes).toHaveBeenCalled()
  })

  // AC7: abrir a URL com filtros restaura exatamente aquele estado.
  it('chega preenchido a partir da URL ao abrir a tela', async () => {
    renderizar('/clients?status=qualified&source=instagram&region=Zona+Sul')

    await esperarAsRegioes()
    expect(selecao('Status')).toHaveValue('qualified')
    expect(selecao('Origem')).toHaveValue('instagram')
    expect(selecao('Região')).toHaveValue('Zona Sul')
  })

  // AC6: mudar um filtro reflete o estado na query string.
  it('escreve o status escolhido na URL', async () => {
    const router = renderizar()

    await userEvent.selectOptions(selecao('Status'), 'qualified')

    expect(router.state.location.search).toBe('?status=qualified')
  })

  it('escreve a origem e a região escolhidas na URL', async () => {
    const router = renderizar()
    await esperarAsRegioes()

    await userEvent.selectOptions(selecao('Origem'), 'instagram')
    await userEvent.selectOptions(selecao('Região'), 'Barra')

    const parametros = new URLSearchParams(router.state.location.search)
    expect(parametros.get('source')).toBe('instagram')
    expect(parametros.get('region')).toBe('Barra')
  })

  // AC8: qualquer filtro que muda devolve a listagem à primeira página.
  it('volta para a primeira página ao mudar um filtro', async () => {
    const router = renderizar('/clients?page=3')

    await userEvent.selectOptions(selecao('Status'), 'lead')

    expect(new URLSearchParams(router.state.location.search).get('page')).toBeNull()
  })

  // AC4: status, origem e região combinam entre si e com a busca por E lógico.
  it('combina os filtros entre si e com a busca', async () => {
    const router = renderizar('/clients?search=ana&status=lead')
    await esperarAsRegioes()

    await userEvent.selectOptions(selecao('Região'), 'Centro')

    const parametros = new URLSearchParams(router.state.location.search)
    expect(parametros.get('search')).toBe('ana')
    expect(parametros.get('status')).toBe('lead')
    expect(parametros.get('region')).toBe('Centro')
  })

  // CLNT-13 AC14: a ação de limpar que o estado de busca sem resultado usa.
  it('limpa a busca e os filtros, preservando a ordenação', async () => {
    const router = renderizar(
      '/clients?search=ana&status=lead&source=portal&region=Barra&sort=name',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    expect(router.state.location.search).toBe('?sort=name')
  })

  // AC10: abaixo de 768px os filtros continuam acessíveis — quebram de linha
  // em vez de serem escondidos por utilitária responsiva.
  it('mantém os filtros acessíveis em tela estreita', () => {
    renderizar()
    const painel = screen.getByRole('group', { name: 'Filtros' })

    expect(painel.className).toContain('flex-wrap')
    expect(painel.className).not.toMatch(/(^|\s|:)hidden(\s|$)/)
  })
})
