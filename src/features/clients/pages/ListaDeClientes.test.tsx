import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { listarClientes, listarRegioes, type Cliente } from '../services/client-service'
import { ListaDeClientes } from './ListaDeClientes'

vi.mock('../services/client-service', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../services/client-service')>()),
  listarClientes: vi.fn(),
  listarRegioes: vi.fn(),
}))

const lista = vi.mocked(listarClientes)
const regioes = vi.mocked(listarRegioes)

function cliente(parcial: Partial<Cliente> = {}): Cliente {
  return {
    id: 'c1',
    owner_id: 'u1',
    name: 'Ana Prado',
    email: 'ana@exemplo.com',
    phone: '11987654321',
    status: 'lead',
    source: null,
    region: 'Zona Sul',
    income: 3500.5,
    income_type: null,
    search_text: null,
    created_at: '2026-09-17T15:30:00.000Z',
    updated_at: '2026-09-17T15:30:00.000Z',
    ...parcial,
  }
}

function renderizar(entrada = '/clients') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/clients', element: <ListaDeClientes /> },
      { path: '/clients/new', element: <p>cadastro de cliente</p> },
    ],
    { initialEntries: [entrada] },
  )

  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const tabela = () => screen.getByRole('table')
/**
 * O bloco de um estado vazio. O painel de filtros tem a própria ação de
 * limpar, então a do estado sem resultado é buscada dentro dele.
 */
const bloco = (titulo: string) => screen.getByText(titulo).closest('div') as HTMLElement
const cartoes = () => within(screen.getByRole('list')).getAllByRole('listitem')

beforeEach(() => {
  lista.mockResolvedValue({ clientes: [cliente()], total: 1 })
  regioes.mockResolvedValue(['Barra', 'Zona Sul'])
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('ListaDeClientes', () => {
  it('exibe o título e a ação de cadastrar um cliente', async () => {
    renderizar()

    expect(screen.getByRole('heading', { name: 'Clientes', level: 1 })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Novo cliente' })).toHaveAttribute(
      'href',
      '/clients/new',
    )
  })

  // CLNT-13 AC12: esqueleto no lugar de área em branco.
  it('exibe esqueleto enquanto a consulta carrega', () => {
    lista.mockReturnValue(new Promise(() => {}))
    renderizar()

    expect(screen.getByText('Carregando os clientes…')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  // CLNT-10 AC7: a consulta é a que a URL descreve, inteira.
  it('consulta o serviço com os filtros lidos da URL', async () => {
    renderizar('/clients?search=ana&status=lead&source=portal&region=Barra&sort=name&page=2')

    await waitFor(() =>
      expect(lista).toHaveBeenCalledWith({
        busca: 'ana',
        status: 'lead',
        origem: 'portal',
        regiao: 'Barra',
        sort: 'name',
        order: 'desc',
        page: 2,
      }),
    )
  })

  it('exibe os clientes recebidos na tabela', async () => {
    lista.mockResolvedValue({
      clientes: [cliente(), cliente({ id: 'c2', name: 'Bruno Lima' })],
      total: 2,
    })
    renderizar()

    await screen.findByRole('table')
    expect(within(tabela()).getAllByRole('row')).toHaveLength(3)
    expect(within(tabela()).getByRole('link', { name: 'Ana Prado' })).toBeInTheDocument()
  })

  // CLNT-12 AC10: a mesma lista chega às duas apresentações.
  it('exibe os mesmos clientes nos cartões', async () => {
    lista.mockResolvedValue({
      clientes: [cliente(), cliente({ id: 'c2', name: 'Bruno Lima' })],
      total: 2,
    })
    renderizar()

    await screen.findByRole('table')
    expect(cartoes()).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Bruno Lima' })).toHaveLength(2)
  })

  // CLNT-07 AC11: o total que satisfaz os filtros correntes.
  it('exibe o total e os controles de paginação', async () => {
    lista.mockResolvedValue({ clientes: [cliente()], total: 45 })
    renderizar()

    const paginacao = await screen.findByRole('navigation', { name: 'Paginação' })
    expect(paginacao.textContent).toContain('45 clientes')
    expect(within(paginacao).getByRole('button', { name: 'Próxima' })).toBeEnabled()
  })

  // AC7: abrir a URL com filtros restaura exatamente aquele estado.
  it('restaura busca e filtros nos controles a partir da URL', async () => {
    renderizar('/clients?search=ana&status=qualified&region=Zona+Sul')

    expect(screen.getByLabelText('Buscar')).toHaveValue('ana')
    expect(screen.getByLabelText('Status')).toHaveValue('qualified')
    await waitFor(() => expect(screen.getByLabelText('Região')).toHaveValue('Zona Sul'))
  })

  // AC13: sem nenhum cliente, o convite ao primeiro cadastro.
  it('convida ao primeiro cadastro quando não há nenhum cliente', async () => {
    lista.mockResolvedValue({ clientes: [], total: 0 })
    renderizar()

    expect(await screen.findByText('Sua carteira está vazia')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cadastrar o primeiro cliente' })).toHaveAttribute(
      'href',
      '/clients/new',
    )
  })

  it('não exibe tabela, cartões nem paginação quando não há resultado', async () => {
    lista.mockResolvedValue({ clientes: [], total: 0 })
    renderizar()

    await screen.findByText('Sua carteira está vazia')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument()
  })

  // AC14: busca sem resultado, com a ação de limpar.
  it('oferece a ação de limpar quando os filtros não retornam nada', async () => {
    lista.mockResolvedValue({ clientes: [], total: 0 })
    renderizar('/clients?search=zzz&status=inactive')

    expect(await screen.findByText('Nenhum cliente encontrado')).toBeInTheDocument()
    expect(
      within(bloco('Nenhum cliente encontrado')).getByRole('button', { name: 'Limpar filtros' }),
    ).toBeInTheDocument()
  })

  it('distingue a busca sem resultado do estado inicial', async () => {
    lista.mockResolvedValue({ clientes: [], total: 0 })
    renderizar('/clients?search=zzz')

    await screen.findByText('Nenhum cliente encontrado')
    expect(screen.queryByText('Sua carteira está vazia')).not.toBeInTheDocument()
  })

  it('devolve a listagem sem filtros ao limpar', async () => {
    lista.mockResolvedValue({ clientes: [], total: 0 })
    const router = renderizar('/clients?search=zzz&status=inactive&region=Barra')

    await screen.findByText('Nenhum cliente encontrado')
    await userEvent.click(
      within(bloco('Nenhum cliente encontrado')).getByRole('button', { name: 'Limpar filtros' }),
    )

    expect(router.state.location.search).toBe('')
  })

  // AC15: erro com ação de tentar de novo.
  it('exibe o erro da consulta com ação de tentar de novo', async () => {
    lista.mockRejectedValue(new Error('rede indisponível'))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a carteira agora.',
    )
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('não perde os filtros da URL quando a consulta falha', async () => {
    lista.mockRejectedValue(new Error('rede indisponível'))
    const router = renderizar('/clients?search=ana&status=lead')

    await screen.findByRole('alert')
    expect(router.state.location.search).toBe('?search=ana&status=lead')
    expect(screen.getByLabelText('Buscar')).toHaveValue('ana')
    expect(screen.getByLabelText('Status')).toHaveValue('lead')
  })

  it('refaz a consulta e exibe a lista ao tentar de novo', async () => {
    lista.mockRejectedValueOnce(new Error('rede indisponível'))
    renderizar()

    await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Ana Prado' })).toHaveLength(2)
  })

  // AC10: busca, filtros e ações continuam acessíveis — inclusive no erro,
  // que é de onde o consultor precisa sair mudando o filtro.
  it('mantém busca e filtros acessíveis no estado de erro', async () => {
    lista.mockRejectedValue(new Error('rede indisponível'))
    renderizar()

    await screen.findByRole('alert')
    expect(screen.getByLabelText('Buscar')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Filtros' })).toBeInTheDocument()
  })
})
