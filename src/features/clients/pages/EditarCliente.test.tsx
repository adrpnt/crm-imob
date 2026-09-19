import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, type InitialEntry } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  atualizarCliente,
  buscarCliente,
  listarRegioes,
  type Cliente,
} from '../services/client-service'
import { EditarCliente } from './EditarCliente'

vi.mock('../services/client-service', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../services/client-service')>()),
  buscarCliente: vi.fn(),
  atualizarCliente: vi.fn(),
  listarRegioes: vi.fn(),
}))

const buscar = vi.mocked(buscarCliente)
const atualizar = vi.mocked(atualizarCliente)
const regioes = vi.mocked(listarRegioes)

const CLIENTE: Cliente = {
  id: 'c1',
  owner_id: 'u1',
  name: 'Joana Silva',
  email: 'joana@exemplo.com',
  phone: '11987654321',
  status: 'qualified',
  source: 'instagram',
  region: 'Zona Sul',
  income: 3500.5,
  income_type: 'formal',
  search_text: 'joana silva joana@exemplo.com 11987654321',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
}

/** As oito colunas do grant, como o serviço as recebe depois do schema. */
const DADOS_ATUAIS = {
  name: 'Joana Silva',
  email: 'joana@exemplo.com',
  phone: '11987654321',
  status: 'qualified',
  source: 'instagram',
  region: 'Zona Sul',
  income: 3500.5,
  income_type: 'formal',
}

function renderizar(entrada: InitialEntry = '/clients/c1/edit') {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(
    [
      { path: '/clients/:id/edit', element: <EditarCliente /> },
      { path: '/clients/:id', element: <p>ficha do cliente</p> },
      { path: '/clients', element: <p>listagem de clientes</p> },
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

const salvar = () => userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

beforeEach(() => {
  buscar.mockResolvedValue(CLIENTE)
  atualizar.mockResolvedValue({ ok: true, cliente: CLIENTE })
  regioes.mockResolvedValue([])
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('EditarCliente', () => {
  // CLNT-15 AC6: esqueleto no lugar de área em branco.
  it('exibe esqueleto enquanto o cliente carrega', () => {
    buscar.mockReturnValue(new Promise(() => {}))
    renderizar()

    expect(screen.getByRole('status')).toHaveTextContent(/carregando o cliente/i)
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
  })

  // CLNT-14 AC2: sem revelar se o registro existe, e com caminho de volta.
  it('exibe não encontrado quando a leitura falha', async () => {
    buscar.mockRejectedValue(new Error('sem linhas'))
    renderizar()

    expect(await screen.findByText('Cliente não encontrado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para a listagem' })).toBeInTheDocument()
  })

  it('pré-preenche o formulário com os valores atuais', async () => {
    renderizar()

    expect(await screen.findByLabelText('Nome')).toHaveValue('Joana Silva')
    expect(screen.getByLabelText('E-mail')).toHaveValue('joana@exemplo.com')
    expect(screen.getByLabelText('Telefone')).toHaveValue('11987654321')
    expect(screen.getByLabelText('Status')).toHaveValue('qualified')
    expect(screen.getByLabelText('Origem')).toHaveValue('instagram')
    expect(screen.getByLabelText('Região')).toHaveValue('Zona Sul')
    expect(screen.getByLabelText('Tipo de renda')).toHaveValue('formal')
    await waitFor(() =>
      expect(screen.getByLabelText<HTMLInputElement>('Renda').value).toContain('3.500,50'),
    )
  })

  it('salva a alteração com o identificador e as oito colunas editáveis', async () => {
    renderizar()

    const nome = await screen.findByLabelText('Nome')
    await userEvent.clear(nome)
    await userEvent.type(nome, 'Joana M. Silva')
    await salvar()

    await waitFor(() =>
      expect(atualizar).toHaveBeenCalledWith('c1', { ...DADOS_ATUAIS, name: 'Joana M. Silva' }),
    )
  })

  it('volta para a ficha depois de salvar', async () => {
    const router = renderizar()

    const nome = await screen.findByLabelText('Nome')
    await userEvent.type(nome, ' Souza')
    await salvar()

    expect(await screen.findByText('ficha do cliente')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/clients/c1')
  })

  // CLNT-14 AC8: a query string da listagem chega pelo link da ficha e volta
  // com o consultor. Sem ela, "Voltar para a listagem" entrega a carteira
  // inteira depois de qualquer edição.
  it('volta para a ficha mantendo os filtros de origem', async () => {
    const router = renderizar('/clients/c1/edit?status=lead&region=Zona+Sul')

    const nome = await screen.findByLabelText('Nome')
    await userEvent.type(nome, ' Souza')
    await salvar()

    await screen.findByText('ficha do cliente')
    expect(router.state.location.pathname).toBe('/clients/c1')
    expect(router.state.location.search).toBe('?status=lead&region=Zona+Sul')
  })

  it('leva a confirmação das alterações para a ficha', async () => {
    const router = renderizar()

    const nome = await screen.findByLabelText('Nome')
    await userEvent.type(nome, ' Souza')
    await salvar()

    await screen.findByText('ficha do cliente')
    expect(router.state.location.state).toEqual({ mensagem: 'Alterações salvas.' })
  })

  it('mantém a tela e os dados digitados quando o serviço recusa', async () => {
    atualizar.mockResolvedValue({
      ok: false,
      mensagem: 'Você não tem permissão para esta alteração.',
    })
    const router = renderizar()

    const nome = await screen.findByLabelText('Nome')
    await userEvent.clear(nome)
    await userEvent.type(nome, 'Joana M. Silva')
    await salvar()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Você não tem permissão para esta alteração.',
    )
    expect(router.state.location.pathname).toBe('/clients/c1/edit')
    expect(screen.getByLabelText('Nome')).toHaveValue('Joana M. Silva')
  })

  // Edge case do spec: excluído em outra aba não pode falhar em silêncio.
  it('avisa que o cliente não existe mais ao salvar um registro excluído em outra aba', async () => {
    atualizar.mockResolvedValue({
      ok: false,
      mensagem: 'Este cliente não existe mais. Ele pode ter sido excluído em outra aba.',
    })
    renderizar()

    const nome = await screen.findByLabelText('Nome')
    await userEvent.type(nome, ' Souza')
    await salvar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Este cliente não existe mais')
    expect(screen.getByRole('link', { name: 'Voltar para a ficha' })).toBeInTheDocument()
  })

  // CLNT-15 AC5: as mesmas regras do cadastro, sem enviar a requisição.
  it('não chama o serviço quando a validação falha', async () => {
    renderizar()

    const nome = await screen.findByLabelText('Nome')
    await userEvent.clear(nome)
    await userEvent.type(nome, 'A')
    await salvar()

    expect(await screen.findByText('O nome precisa de ao menos 2 caracteres')).toBeInTheDocument()
    expect(atualizar).not.toHaveBeenCalled()
  })

  it('impede um segundo envio enquanto o primeiro está em andamento', async () => {
    atualizar.mockReturnValue(new Promise(() => {}))
    renderizar()

    const nome = await screen.findByLabelText('Nome')
    await userEvent.type(nome, ' Souza')
    await salvar()

    const botao = await screen.findByRole('button', { name: 'Salvando…' })
    expect(botao).toBeDisabled()
    await userEvent.click(botao)
    expect(atualizar).toHaveBeenCalledTimes(1)
  })

  it('pede confirmação ao sair com alterações pendentes', async () => {
    const router = renderizar()

    const nome = await screen.findByLabelText('Nome')
    await userEvent.type(nome, ' Souza')
    await userEvent.click(screen.getByRole('link', { name: 'Voltar para a ficha' }))

    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Sair sem salvar?')
    expect(router.state.location.pathname).toBe('/clients/c1/edit')
  })

  it('não pede confirmação depois de salvar com sucesso', async () => {
    renderizar()

    const nome = await screen.findByLabelText('Nome')
    await userEvent.type(nome, ' Souza')
    await salvar()

    expect(await screen.findByText('ficha do cliente')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
