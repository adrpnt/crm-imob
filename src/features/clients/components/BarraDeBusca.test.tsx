import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BarraDeBusca } from './BarraDeBusca'

const ATRASO = 300

/**
 * Conta escritas na URL pelas chaves de localização distintas que o roteador
 * publica. É a medida certa para o atraso: o que precisa ser único não é a
 * chamada da função, é a navegação que ela produz.
 */
function renderizar(entrada = '/clients') {
  const router = createMemoryRouter([{ path: '/clients', element: <BarraDeBusca /> }], {
    initialEntries: [entrada],
  })

  const escritas = new Set<string>()
  router.subscribe((estado) => escritas.add(estado.location.key))

  render(<RouterProvider router={router} />)
  return { router, escritas }
}

const campo = () => screen.getByLabelText<HTMLInputElement>('Buscar')

/**
 * Digita tecla a tecla, emitindo um evento por caractere — que é o que o
 * atraso precisa distinguir de um evento por termo. `userEvent` não serve
 * aqui: com temporizador falso ele fica preso à espera do próprio relógio,
 * e o critério desta tarefa exige o relógio sob controle do teste.
 */
function digitar(texto: string) {
  const alvo = campo()
  for (let fim = 1; fim <= texto.length; fim += 1) {
    fireEvent.change(alvo, { target: { value: texto.slice(0, fim) } })
  }
}

/** Deixa o atraso vencer e as navegações resultantes assentarem. */
const esperarOAtraso = () => act(() => vi.advanceTimersByTimeAsync(ATRASO))

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('BarraDeBusca', () => {
  // CLNT-18 AC1: rótulo real e visível, não texto de exemplo.
  it('exibe o campo de busca com rótulo visível', () => {
    renderizar()

    expect(campo()).toBeInTheDocument()
    expect(screen.getByText('Nome, e-mail ou telefone')).toBeInTheDocument()
  })

  // CLNT-10 AC7: abrir a URL com busca restaura aquele estado.
  it('reflete o termo que veio da URL ao abrir a tela', () => {
    renderizar('/clients?search=ana')

    expect(campo()).toHaveValue('ana')
  })

  // CLNT-08 AC2: a busca aplica após 300ms sem nova digitação.
  it('não escreve na URL enquanto a digitação continua', async () => {
    const { router, escritas } = renderizar()

    digitar('ana')
    await act(() => vi.advanceTimersByTimeAsync(ATRASO - 1))

    expect(escritas.size).toBe(0)
    expect(router.state.location.search).toBe('')
  })

  // O critério central do atraso: cinco teclas, uma escrita.
  it('produz uma única escrita na URL para cinco teclas em sequência', async () => {
    const { router, escritas } = renderizar()

    digitar('anaca')
    await esperarOAtraso()

    expect(escritas.size).toBe(1)
    expect(router.state.location.search).toBe('?search=anaca')
  })

  it('escreve o termo buscado na query string depois da pausa', async () => {
    const { router } = renderizar()

    digitar('zona sul')
    await esperarOAtraso()

    expect(router.state.location.search).toBe('?search=zona+sul')
  })

  // AC8: mudar a busca volta para a primeira página.
  it('volta para a primeira página ao aplicar a busca', async () => {
    const { router } = renderizar('/clients?page=3')

    digitar('ana')
    await esperarOAtraso()

    expect(new URLSearchParams(router.state.location.search).get('page')).toBeNull()
  })

  // AC4: busca e filtros combinam por E lógico, então buscar não desfaz filtro.
  it('preserva os demais filtros ao aplicar a busca', async () => {
    const { router } = renderizar('/clients?status=lead&region=Barra&sort=name')

    digitar('ana')
    await esperarOAtraso()

    const parametros = new URLSearchParams(router.state.location.search)
    expect(parametros.get('status')).toBe('lead')
    expect(parametros.get('region')).toBe('Barra')
    expect(parametros.get('sort')).toBe('name')
    expect(parametros.get('search')).toBe('ana')
  })

  it('remove o parâmetro de busca quando o termo é apagado', async () => {
    const { router } = renderizar('/clients?search=ana')

    fireEvent.change(campo(), { target: { value: '' } })
    await esperarOAtraso()

    expect(router.state.location.search).toBe('')
  })

  // CLNT-10 AC6 e AC7: a URL é a fonte única (AD-015). Voltar no navegador ou
  // limpar os filtros muda a URL por fora, e o campo tem de acompanhar.
  it('acompanha o termo quando a URL muda por fora', async () => {
    const { router } = renderizar('/clients?search=ana')

    await act(() => router.navigate('/clients'))

    expect(campo()).toHaveValue('')
  })
})
