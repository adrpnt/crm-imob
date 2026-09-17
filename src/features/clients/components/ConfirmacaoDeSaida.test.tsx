import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef } from 'react'
import { createMemoryRouter, Link, useNavigate } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'

import { ConfirmacaoDeSaida } from './ConfirmacaoDeSaida'

/**
 * Tela de escrita em miniatura: um campo, um caminho de saída e um salvamento
 * que navega logo depois de concluir. É a ordem em que o bloqueio costuma
 * errar, e por isso o salvamento está aqui e não só nas telas.
 */
function Formulario({ sujo }: { sujo: boolean }) {
  const navegar = useNavigate()
  const concluido = useRef(false)

  function salvar() {
    concluido.current = true
    navegar('/clients')
  }

  return (
    <>
      <input aria-label="Nome" defaultValue="Ana Prado" />
      <Link to="/clients">Voltar para a listagem</Link>
      <button type="button" onClick={salvar}>
        Salvar
      </button>
      <ConfirmacaoDeSaida temAlteracoes={() => sujo && !concluido.current} />
    </>
  )
}

function renderizar(sujo: boolean) {
  const router = createMemoryRouter(
    [
      { path: '/clients/new', element: <Formulario sujo={sujo} /> },
      { path: '/clients', element: <p>listagem de clientes</p> },
    ],
    { initialEntries: ['/clients/new'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const sair = () => userEvent.click(screen.getByRole('link', { name: 'Voltar para a listagem' }))

describe('ConfirmacaoDeSaida', () => {
  it('deixa sair quando não há alterações pendentes', async () => {
    const router = renderizar(false)

    await sair()

    expect(await screen.findByText('listagem de clientes')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/clients')
  })

  it('bloqueia a navegação interna quando há alterações pendentes', async () => {
    const router = renderizar(true)

    await sair()

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/clients/new')
    expect(screen.queryByText('listagem de clientes')).not.toBeInTheDocument()
  })

  it('nomeia o que está em jogo e deixa continuar editando como opção segura', async () => {
    renderizar(true)

    await sair()

    const dialogo = await screen.findByRole('dialog')
    expect(dialogo).toHaveAccessibleName('Sair sem salvar?')
    expect(dialogo).toHaveTextContent('As alterações feitas neste formulário serão perdidas.')
    expect(screen.getByRole('button', { name: 'Continuar editando' })).toHaveFocus()
  })

  it('descarta e prossegue para o destino que estava bloqueado', async () => {
    const router = renderizar(true)

    await sair()
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar alterações' }))

    expect(await screen.findByText('listagem de clientes')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/clients')
  })

  it('cancelar mantém o consultor onde está, com o formulário intacto', async () => {
    const router = renderizar(true)

    await sair()
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar editando' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/clients/new')
    expect(screen.getByLabelText('Nome')).toHaveValue('Ana Prado')
  })

  // Escape é o gesto de desistir da saída, não de confirmá-la (CLNT-18 AC4).
  it('Escape fecha o diálogo sem sair da tela', async () => {
    const router = renderizar(true)

    await sair()
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/clients/new')
  })

  it('volta a pedir confirmação numa segunda tentativa de sair', async () => {
    renderizar(true)

    await sair()
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar editando' }))
    await sair()

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  // A ordem em que o bloqueio costuma errar: quem acabou de salvar não tem
  // alterações pendentes, e não pode ser perguntado se quer descartá-las.
  it('não bloqueia a navegação depois de salvar com sucesso', async () => {
    const router = renderizar(true)

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('listagem de clientes')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/clients')
  })
})
