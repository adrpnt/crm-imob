import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'

import type { Cliente } from '../services/client-service'
import { TabelaDeClientes } from './TabelaDeClientes'

/** O espaço estreito que o `Intl` põe depois de `R$`. */
const ESPACO = ' '

function cliente(parcial: Partial<Cliente> = {}): Cliente {
  return {
    id: 'c1',
    owner_id: 'u1',
    name: 'Ana Prado',
    email: null,
    phone: null,
    status: 'lead',
    source: null,
    region: null,
    income: null,
    income_type: null,
    search_text: null,
    created_at: '2026-09-17T15:30:00.000Z',
    updated_at: '2026-09-17T15:30:00.000Z',
    ...parcial,
  }
}

function renderizar(clientes: Cliente[], entrada = '/clients') {
  const router = createMemoryRouter(
    [{ path: '/clients', element: <TabelaDeClientes clientes={clientes} /> }],
    { initialEntries: [entrada] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const linhas = () => within(screen.getByRole('table')).getAllByRole('row')
const celulas = (indiceDaLinha: number) => within(linhas()[indiceDaLinha]).getAllByRole('cell')
const cabecalho = (nome: string) => screen.getByRole('columnheader', { name: new RegExp(nome) })
const acionar = (nome: string) =>
  userEvent.click(screen.getByRole('button', { name: new RegExp(nome) }))

describe('TabelaDeClientes', () => {
  it('exibe uma linha por cliente, com os cabeçalhos de coluna', () => {
    renderizar([cliente(), cliente({ id: 'c2', name: 'Bruno Lima' })])

    expect(linhas()).toHaveLength(3)
    for (const coluna of ['Nome', 'Contato', 'Status', 'Região', 'Renda', 'Cadastrado em']) {
      expect(cabecalho(coluna)).toBeInTheDocument()
    }
  })

  it('exibe nome, contato, status, região e data de cada cliente', () => {
    renderizar([
      cliente({
        name: 'Ana Prado',
        email: 'ana@exemplo.com',
        phone: '11987654321',
        status: 'qualified',
        region: 'Zona Sul',
      }),
    ])

    const conteudo = celulas(1).map((celula) => celula.textContent)
    expect(conteudo[0]).toBe('Ana Prado')
    expect(conteudo[1]).toBe('ana@exemplo.com(11) 98765-4321')
    expect(conteudo[2]).toBe('Qualificado')
    expect(conteudo[3]).toBe('Zona Sul')
    expect(conteudo[5]).toBe('17/09/2026')
  })

  // Premissa do spec: renda em BRL, com separador de milhar e duas casas.
  it('exibe a renda formatada em BRL', () => {
    renderizar([cliente({ income: 3500.5 })])

    expect(celulas(1)[4].textContent).toBe(`R$${ESPACO}3.500,50`)
  })

  // Só o nome é obrigatório: os demais campos ausentes viram traço, e não
  // célula em branco.
  it('exibe traço onde o cliente não tem valor', () => {
    renderizar([cliente()])
    const conteudo = celulas(1).map((celula) => celula.textContent)

    expect(conteudo[1]).toBe('——')
    expect(conteudo[3]).toBe('—')
    expect(conteudo[4]).toBe('—')
  })

  it('leva à ficha do cliente pelo nome', () => {
    renderizar([cliente({ id: 'abc-123', name: 'Ana Prado' })])

    expect(screen.getByRole('link', { name: 'Ana Prado' })).toHaveAttribute(
      'href',
      '/clients/abc-123',
    )
  })

  // CLNT-11 AC9: ordenar por nome ou por data, nas duas direções.
  it('ordena por nome ao acionar o cabeçalho Nome', async () => {
    const router = renderizar([cliente()])

    await acionar('Nome')

    expect(router.state.location.search).toBe('?sort=name&order=asc')
  })

  it('alterna crescente e decrescente ao reacionar o mesmo cabeçalho', async () => {
    const router = renderizar([cliente()])

    await acionar('Nome')
    await acionar('Nome')

    // `order=desc` é o padrão e sai da URL; o que sobra é a coluna.
    expect(router.state.location.search).toBe('?sort=name')
  })

  it('ordena por data ao acionar o cabeçalho Cadastrado em', async () => {
    const router = renderizar([cliente()])

    await acionar('Cadastrado em')

    expect(router.state.location.search).toBe('?order=asc')
  })

  it('anuncia a ordenação corrente por aria-sort', () => {
    renderizar([cliente()], '/clients?sort=name&order=asc')

    expect(cabecalho('Nome')).toHaveAttribute('aria-sort', 'ascending')
  })

  it('anuncia como não ordenada a coluna que não ordena', () => {
    renderizar([cliente()], '/clients?sort=name&order=asc')

    expect(cabecalho('Cadastrado em')).toHaveAttribute('aria-sort', 'none')
  })

  // Edge case do spec: truncar sem quebrar o layout, com o valor completo
  // acessível — o texto continua inteiro no DOM, o corte é do CSS.
  it('trunca nome muito longo mantendo o valor completo acessível', () => {
    const nome = 'Maria Aparecida dos Santos Albuquerque Vasconcelos de Oliveira Filha'
    renderizar([cliente({ name: nome })])
    const link = screen.getByRole('link', { name: nome })

    expect(link).toHaveTextContent(nome)
    expect(link).toHaveAttribute('title', nome)
    expect(link.className).toContain('truncate')
  })

  // Edge case do spec: dois clientes de mesmo nome são permitidos e se
  // distinguem por e-mail ou telefone.
  it('distingue dois clientes de mesmo nome pelo contato', () => {
    renderizar([
      cliente({ id: 'c1', name: 'Ana Prado', email: 'ana.p@exemplo.com' }),
      cliente({ id: 'c2', name: 'Ana Prado', phone: '11987654321' }),
    ])

    expect(screen.getAllByRole('link', { name: 'Ana Prado' })).toHaveLength(2)
    expect(celulas(1)[1].textContent).toBe('ana.p@exemplo.com—')
    expect(celulas(2)[1].textContent).toBe('—(11) 98765-4321')
  })
})
