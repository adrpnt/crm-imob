import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, type InitialEntry } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buscarCliente, type Cliente } from '../services/client-service'
import { FichaDoCliente } from './FichaDoCliente'

vi.mock('../services/client-service', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../services/client-service')>()),
  buscarCliente: vi.fn(),
}))

const buscar = vi.mocked(buscarCliente)

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
  created_at: '2026-01-05T12:00:00Z',
  updated_at: '2026-02-10T12:00:00Z',
}

function renderizar(entrada: InitialEntry = '/clients/c1') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/clients/:id', element: <FichaDoCliente /> },
      { path: '/clients/:id/edit', element: <p>edição do cliente</p> },
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

/** O valor exibido sob um termo da lista de dados. */
function valorDe(termo: string): string {
  const dt = screen.getByText(termo)
  const dd = dt.nextElementSibling
  return dd?.textContent ?? ''
}

beforeEach(() => {
  buscar.mockResolvedValue(CLIENTE)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('FichaDoCliente', () => {
  // CLNT-13 AC12: esqueleto no lugar de área em branco.
  it('exibe esqueleto enquanto o cliente carrega', () => {
    buscar.mockReturnValue(new Promise(() => {}))
    renderizar()

    expect(screen.getByRole('status')).toHaveTextContent(/carregando o cliente/i)
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  // CLNT-14 AC1: todos os campos cadastrados.
  it('exibe os campos cadastrados do cliente', async () => {
    renderizar()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Joana Silva' }),
    ).toBeInTheDocument()
    expect(valorDe('E-mail')).toBe('joana@exemplo.com')
    expect(valorDe('Telefone')).toBe('(11) 98765-4321')
    expect(valorDe('Status')).toBe('Qualificado')
    expect(valorDe('Origem')).toBe('Instagram')
    expect(valorDe('Região')).toBe('Zona Sul')
    expect(valorDe('Tipo de renda')).toBe('Formal')
  })

  // CLNT-14 AC1: renda em BRL, e não o número cru da coluna.
  it('exibe a renda formatada em BRL', async () => {
    renderizar()

    await screen.findByRole('heading', { level: 1, name: 'Joana Silva' })
    expect(valorDe('Renda')).toContain('3.500,50')
    expect(valorDe('Renda')).toContain('R$')
  })

  // CLNT-14 AC1: as duas datas, e não apenas a de cadastro.
  it('exibe as datas de criação e de atualização', async () => {
    renderizar()

    await screen.findByRole('heading', { level: 1, name: 'Joana Silva' })
    expect(valorDe('Cadastrado em')).toBe('05/01/2026')
    expect(valorDe('Atualizado em')).toBe('10/02/2026')
  })

  // Campo opcional vazio é ausência, e não `R$ 0,00` nem string vazia.
  it('exibe ausência nos campos opcionais em branco', async () => {
    buscar.mockResolvedValue({
      ...CLIENTE,
      email: null,
      phone: null,
      source: null,
      region: null,
      income: null,
      income_type: null,
    })
    renderizar()

    await screen.findByRole('heading', { level: 1, name: 'Joana Silva' })
    expect(valorDe('E-mail')).toBe('—')
    expect(valorDe('Telefone')).toBe('—')
    expect(valorDe('Origem')).toBe('—')
    expect(valorDe('Região')).toBe('—')
    expect(valorDe('Renda')).toBe('—')
    expect(valorDe('Tipo de renda')).toBe('—')
  })

  // CLNT-14 AC2: sem revelar que o registro existe, e com retorno à listagem.
  it('exibe não encontrado sem revelar o registro quando a leitura falha', async () => {
    buscar.mockRejectedValue(new Error('sem linhas'))
    renderizar()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cliente não encontrado' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Joana Silva')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para a listagem' })).toHaveAttribute(
      'href',
      '/clients',
    )
  })

  // CLNT-14 AC8: editar.
  it('oferece a edição do cliente', async () => {
    renderizar()

    expect(await screen.findByRole('link', { name: 'Editar' })).toHaveAttribute(
      'href',
      '/clients/c1/edit',
    )
  })

  // CLNT-14 AC8 e CLNT-16 AC2: a ação destrutiva é distinta da primária.
  it('oferece a exclusão do cliente como ação destrutiva', async () => {
    renderizar()

    const excluir = await screen.findByRole('button', { name: 'Excluir' })
    expect(excluir).toHaveAttribute('data-variante', 'destrutiva')
  })

  // CLNT-14 AC8: voltar para a listagem preservando os filtros de origem.
  it('volta para a listagem preservando os filtros de origem', async () => {
    renderizar('/clients/c1?status=lead&region=Zona+Sul&page=2')

    await screen.findByRole('heading', { level: 1, name: 'Joana Silva' })
    expect(screen.getByRole('link', { name: 'Voltar para a listagem' })).toHaveAttribute(
      'href',
      '/clients?status=lead&region=Zona+Sul&page=2',
    )
  })

  // CLNT-01 AC1 e CLNT-15 AC4: a confirmação do cadastro e da edição aparece aqui.
  it('exibe a confirmação que veio no estado da navegação', async () => {
    renderizar({ pathname: '/clients/c1', state: { mensagem: 'Cliente cadastrado.' } })

    await screen.findByRole('heading', { level: 1, name: 'Joana Silva' })
    const anuncio = screen.getByRole('status')
    expect(anuncio).toHaveTextContent('Cliente cadastrado.')
    expect(anuncio).toHaveAttribute('data-tom', 'sucesso')
  })

  it('não exibe confirmação quando a navegação não trouxe mensagem', async () => {
    renderizar()

    await screen.findByRole('heading', { level: 1, name: 'Joana Silva' })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  // CLNT-16 AC1: acionar excluir abre a confirmação nomeando o cliente.
  it('abre a confirmação de exclusão ao acionar excluir', async () => {
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }))

    const dialogo = screen.getByRole('dialog')
    expect(dialogo).toHaveAccessibleName('Excluir cliente?')
    expect(dialogo).toHaveTextContent('Joana Silva')
  })

  // CLNT-16 AC7: cancelar fecha sem nenhuma alteração, e o registro continua visível.
  it('mantém a ficha quando a confirmação de exclusão é cancelada', async () => {
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Joana Silva' })).toBeInTheDocument()
  })

  // A lista de notas pertence à feature `notes`; a ficha reserva o lugar dela.
  it('reserva o ponto onde a lista de notas entra', async () => {
    renderizar()

    await screen.findByRole('heading', { level: 1, name: 'Joana Silva' })
    expect(screen.getByRole('heading', { level: 2, name: 'Notas' })).toBeInTheDocument()
  })
})
