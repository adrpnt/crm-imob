import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Cliente } from '../services/client-service'
import { CartoesDeClientes } from './CartoesDeClientes'
import { TabelaDeClientes } from './TabelaDeClientes'

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

/** Monta só os cartões, ou o par inteiro, sob o mesmo roteador. */
function renderizar(clientes: Cliente[], comTabela = false) {
  const conteudo = (
    <>
      {comTabela ? <TabelaDeClientes clientes={clientes} /> : null}
      <CartoesDeClientes clientes={clientes} />
    </>
  )

  const router = createMemoryRouter([{ path: '/clients', element: conteudo }], {
    initialEntries: ['/clients'],
  })
  render(<RouterProvider router={router} />)
}

const cartoes = () => within(screen.getByRole('list')).getAllByRole('listitem')

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CartoesDeClientes', () => {
  it('exibe um cartão por cliente', () => {
    renderizar([cliente(), cliente({ id: 'c2', name: 'Bruno Lima' })])

    expect(cartoes()).toHaveLength(2)
  })

  it('mostra nome, contato, status e região em cada cartão', () => {
    renderizar([
      cliente({
        name: 'Ana Prado',
        email: 'ana@exemplo.com',
        phone: '11987654321',
        status: 'qualified',
        region: 'Zona Sul',
      }),
    ])
    const cartao = cartoes()[0]

    expect(within(cartao).getByRole('link', { name: 'Ana Prado' })).toBeInTheDocument()
    expect(within(cartao).getByText('ana@exemplo.com')).toBeInTheDocument()
    expect(within(cartao).getByText('(11) 98765-4321')).toBeInTheDocument()
    expect(cartao.textContent).toContain('Qualificado')
    expect(cartao.textContent).toContain('Zona Sul')
  })

  it('leva à ficha do cliente pelo nome', () => {
    renderizar([cliente({ id: 'abc-123' })])

    expect(screen.getByRole('link', { name: 'Ana Prado' })).toHaveAttribute(
      'href',
      '/clients/abc-123',
    )
  })

  // Só o nome é obrigatório: campo ausente vira traço, nunca área em branco.
  it('exibe traço onde o cliente não tem valor', () => {
    renderizar([cliente()])
    const cartao = cartoes()[0]

    expect(within(cartao).getAllByText('—')).toHaveLength(2)
    expect(cartao.textContent).toContain('· —')
  })

  // CLNT-12 AC10: abaixo de 768px a carteira é de cartões.
  it('esconde os cartões de 768px para cima, por utilitária', () => {
    renderizar([cliente()])

    expect(screen.getByRole('list').className).toContain('md:hidden')
  })

  it('deixa a tabela para 768px e acima, por utilitária', () => {
    renderizar([cliente()], true)
    const moldura = screen.getByRole('table').parentElement

    expect(moldura?.className).toContain('hidden')
    expect(moldura?.className).toContain('md:block')
  })

  // A alternância é de CSS: funciona no primeiro quadro, sem salto de layout.
  it('não consulta matchMedia para escolher a apresentação', () => {
    // O jsdom não traz `matchMedia`: um consumidor dele quebraria antes da
    // asserção. O duplo existe para que a prova seja a chamada que não houve.
    const consulta = vi.fn()
    vi.stubGlobal('matchMedia', consulta)

    renderizar([cliente()], true)

    expect(consulta).not.toHaveBeenCalled()
  })

  // O critério central do par: nenhum cliente existe só no desktop.
  it('entrega a mesma lista às duas árvores', () => {
    const lista = [
      cliente({ id: 'c1', name: 'Ana Prado' }),
      cliente({ id: 'c2', name: 'Bruno Lima' }),
      cliente({ id: 'c3', name: 'Carla Souza' }),
    ]
    renderizar(lista, true)

    expect(cartoes()).toHaveLength(3)
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(4)
    for (const { name, id } of lista) {
      const ocorrencias = screen.getAllByRole('link', { name })
      expect(ocorrencias).toHaveLength(2)
      expect(ocorrencias.every((link) => link.getAttribute('href') === `/clients/${id}`)).toBe(true)
    }
  })
})
