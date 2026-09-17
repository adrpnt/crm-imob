import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { criarCliente, listarRegioes, type Cliente } from '../services/client-service'
import { NovoCliente } from './NovoCliente'

vi.mock('../services/client-service', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../services/client-service')>()),
  criarCliente: vi.fn(),
  listarRegioes: vi.fn(),
}))

const criar = vi.mocked(criarCliente)
const regioes = vi.mocked(listarRegioes)

const CRIADO = { id: 'c1', name: 'Ana Prado' } as Cliente

/** O payload de um cadastro só com o nome: o resto sai indefinido, não vazio. */
const SO_O_NOME = {
  name: 'Ana Prado',
  email: undefined,
  phone: undefined,
  status: 'lead',
  source: undefined,
  region: undefined,
  income: undefined,
  income_type: undefined,
}

function renderizar() {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(
    [
      { path: '/clients/new', element: <NovoCliente /> },
      { path: '/clients', element: <p>listagem de clientes</p> },
      { path: '/clients/:id', element: <p>ficha do cliente</p> },
    ],
    { initialEntries: ['/clients/new'] },
  )

  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const preencherNome = () => userEvent.type(screen.getByLabelText('Nome'), 'Ana Prado')
const cadastrar = () => userEvent.click(screen.getByRole('button', { name: 'Cadastrar cliente' }))

beforeEach(() => {
  criar.mockResolvedValue({ ok: true, cliente: CRIADO })
  regioes.mockResolvedValue([])
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('NovoCliente', () => {
  it('abre o formulário de cadastro com status em lead', () => {
    renderizar()

    expect(screen.getByLabelText('Nome')).toHaveValue('')
    expect(screen.getByLabelText('Status')).toHaveValue('lead')
  })

  // CLNT-01 AC1: só o nome é obrigatório para criar.
  it('cadastra com apenas o nome preenchido', async () => {
    renderizar()

    await preencherNome()
    await cadastrar()

    await waitFor(() => expect(criar).toHaveBeenCalledWith(SO_O_NOME))
  })

  it('navega para a ficha do cliente criado', async () => {
    const router = renderizar()

    await preencherNome()
    await cadastrar()

    expect(await screen.findByText('ficha do cliente')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/clients/c1')
  })

  // A confirmação do AC1 viaja com a navegação: um alerta nesta tela sumiria
  // no mesmo quadro em que ela é trocada pela ficha.
  it('leva a confirmação do cadastro para a ficha', async () => {
    const router = renderizar()

    await preencherNome()
    await cadastrar()

    await screen.findByText('ficha do cliente')
    expect(router.state.location.state).toEqual({ mensagem: 'Cliente cadastrado.' })
  })

  // CLNT-05 AC10: a causa em linguagem compreensível, e nada do que foi
  // digitado se perde.
  it('mantém a tela e os dados digitados quando o serviço recusa', async () => {
    criar.mockResolvedValue({ ok: false, mensagem: 'Você não tem permissão para esta alteração.' })
    const router = renderizar()

    await preencherNome()
    await userEvent.type(screen.getByLabelText('Telefone'), '11987654321')
    await cadastrar()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Você não tem permissão para esta alteração.',
    )
    expect(router.state.location.pathname).toBe('/clients/new')
    expect(screen.getByLabelText('Nome')).toHaveValue('Ana Prado')
    expect(screen.getByLabelText('Telefone')).toHaveValue('11987654321')
  })

  it('não chama o serviço quando o nome é inválido', async () => {
    renderizar()

    await userEvent.type(screen.getByLabelText('Nome'), 'A')
    await cadastrar()

    expect(await screen.findByText('O nome precisa de ao menos 2 caracteres')).toBeInTheDocument()
    expect(criar).not.toHaveBeenCalled()
  })

  it('impede um segundo envio enquanto o primeiro está em andamento', async () => {
    criar.mockReturnValue(new Promise(() => {}))
    renderizar()

    await preencherNome()
    await cadastrar()

    const botao = await screen.findByRole('button', { name: 'Salvando…' })
    expect(botao).toBeDisabled()
    await userEvent.click(botao)
    expect(criar).toHaveBeenCalledTimes(1)
  })

  // CLNT-04: as sugestões são as regiões que o próprio consultor já usou.
  it('oferece as regiões já usadas como sugestão', async () => {
    regioes.mockResolvedValue(['Barra', 'Zona Sul'])
    renderizar()

    await waitFor(() => {
      const sugeridas = [...document.querySelectorAll('datalist option')].map(
        (opcao) => (opcao as HTMLOptionElement).value,
      )
      expect(sugeridas).toEqual(['Barra', 'Zona Sul'])
    })
  })

  it('pede confirmação ao sair com alterações pendentes', async () => {
    const router = renderizar()

    await preencherNome()
    await userEvent.click(screen.getByRole('link', { name: 'Voltar para a listagem' }))

    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Sair sem salvar?')
    expect(router.state.location.pathname).toBe('/clients/new')
  })

  it('não pede confirmação depois de cadastrar com sucesso', async () => {
    renderizar()

    await preencherNome()
    await cadastrar()

    expect(await screen.findByText('ficha do cliente')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
