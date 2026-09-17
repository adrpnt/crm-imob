import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'

import { Paginacao } from './Paginacao'

function renderizar(total: number, entrada = '/clients') {
  const router = createMemoryRouter([{ path: '/clients', element: <Paginacao total={total} /> }], {
    initialEntries: [entrada],
  })
  render(<RouterProvider router={router} />)
  return router
}

const anterior = () => screen.getByRole('button', { name: 'Anterior' })
const proxima = () => screen.getByRole('button', { name: 'Próxima' })
const resumo = () => screen.getByRole('navigation', { name: 'Paginação' }).textContent

describe('Paginacao', () => {
  // CLNT-07 AC11: o total que satisfaz os filtros correntes.
  it('exibe o total de clientes', () => {
    renderizar(45)

    expect(resumo()).toContain('45 clientes')
  })

  // CLNT-07 AC1: páginas de 20 — 45 clientes cabem em três.
  it('divide a carteira em páginas de 20', () => {
    renderizar(45, '/clients?page=2')

    expect(resumo()).toContain('página 2 de 3')
  })

  it('avança para a próxima página escrevendo na URL', async () => {
    const router = renderizar(45)

    await userEvent.click(proxima())

    expect(router.state.location.search).toBe('?page=2')
  })

  it('volta para a página anterior escrevendo na URL', async () => {
    const router = renderizar(45, '/clients?page=3')

    await userEvent.click(anterior())

    expect(router.state.location.search).toBe('?page=2')
  })

  it('desativa o controle de voltar na primeira página', () => {
    renderizar(45)

    expect(anterior()).toBeDisabled()
    expect(proxima()).toBeEnabled()
  })

  it('desativa o controle de avançar na última página', () => {
    renderizar(45, '/clients?page=3')

    expect(proxima()).toBeDisabled()
    expect(anterior()).toBeEnabled()
  })

  // AC4 e AC6: paginar não desfaz a busca nem os filtros.
  it('preserva a busca e os filtros ao paginar', async () => {
    const router = renderizar(45, '/clients?search=ana&status=lead&sort=name')

    await userEvent.click(proxima())

    const parametros = new URLSearchParams(router.state.location.search)
    expect(parametros.get('search')).toBe('ana')
    expect(parametros.get('status')).toBe('lead')
    expect(parametros.get('sort')).toBe('name')
    expect(parametros.get('page')).toBe('2')
  })

  // Edge case do spec: página pedida acima do total exibe a última existente.
  it('exibe a última página existente quando a URL pede além do total', async () => {
    const router = renderizar(45, '/clients?page=9')

    await waitFor(() => expect(router.state.location.search).toBe('?page=3'))
    expect(resumo()).toContain('página 3 de 3')
  })

  it('não redireciona quando a página cabe no total', async () => {
    const router = renderizar(45, '/clients?page=2')

    await waitFor(() => expect(resumo()).toContain('página 2 de 3'))
    expect(router.state.location.search).toBe('?page=2')
  })

  // Sem nenhum resultado não há página para onde ir, e nem por isso a tela
  // pode oferecer um controle que produz página inválida.
  it('desativa os dois controles quando não há nenhum cliente', () => {
    renderizar(0)

    expect(resumo()).toContain('0 clientes')
    expect(anterior()).toBeDisabled()
    expect(proxima()).toBeDisabled()
  })
})
