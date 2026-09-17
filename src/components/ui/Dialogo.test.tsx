import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Dialogo } from './Dialogo'

/**
 * A tela em volta do diálogo: um gatilho que o abre e um campo que fica atrás.
 *
 * O gatilho existe porque a devolução do foco à origem só pode ser asserida se
 * houver uma origem de verdade; o campo, porque é o elemento de trás que a
 * tabulação não pode alcançar com o diálogo aberto.
 */
function Cenario({
  acao = vi.fn(),
  rotuloDeCancelar,
}: {
  acao?: () => void
  rotuloDeCancelar?: string
}) {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <button onClick={() => setAberto(true)}>Excluir cliente</button>
      <input aria-label="Campo de trás" />

      <Dialogo
        aberto={aberto}
        titulo="Excluir Joana Silva?"
        descricao="A ação é irreversível e as notas serão removidas junto."
        rotuloDeCancelar={rotuloDeCancelar}
        aoFechar={() => setAberto(false)}
      >
        <button onClick={acao}>Excluir</button>
      </Dialogo>
    </>
  )
}

async function abrir(rotuloDeCancelar?: string, acao = vi.fn()) {
  render(<Cenario acao={acao} rotuloDeCancelar={rotuloDeCancelar} />)
  const gatilho = screen.getByRole('button', { name: 'Excluir cliente' })
  await userEvent.click(gatilho)
  return { gatilho, acao, dialogo: screen.getByRole('dialog') }
}

describe('Dialogo', () => {
  it('não põe nada na tela enquanto está fechado', () => {
    render(<Cenario />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Excluir Joana Silva?')).not.toBeInTheDocument()
  })

  it('é anunciado como diálogo modal, com o título por nome acessível', async () => {
    const { dialogo } = await abrir()

    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(dialogo).toHaveAccessibleName('Excluir Joana Silva?')
  })

  // CLNT-16 AC1: o diálogo nomeia o cliente e avisa o que vai junto. A
  // descrição é associada, e não apenas exibida ao lado.
  it('associa a descrição ao diálogo', async () => {
    const { dialogo } = await abrir()

    expect(dialogo).toHaveAccessibleDescription(
      'A ação é irreversível e as notas serão removidas junto.',
    )
  })

  // CLNT-18 AC3 leva o foco para dentro; CLNT-16 AC2 diz para onde: a opção
  // segura é a que está sob o dedo quando o diálogo abre.
  it('leva o foco para dentro do diálogo, no cancelamento', async () => {
    const { dialogo } = await abrir()

    expect(dialogo.contains(document.activeElement)).toBe(true)
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })

  it('confina a tabulação: do último elemento volta ao primeiro', async () => {
    await abrir()

    const cancelar = screen.getByRole('button', { name: 'Cancelar' })
    const excluir = screen.getByRole('button', { name: 'Excluir' })

    await userEvent.tab()
    expect(excluir).toHaveFocus()

    await userEvent.tab()
    expect(cancelar).toHaveFocus()
  })

  it('confina a tabulação: do primeiro para trás vai ao último', async () => {
    await abrir()

    const excluir = screen.getByRole('button', { name: 'Excluir' })

    await userEvent.tab({ shift: true })
    expect(excluir).toHaveFocus()
  })

  it('não deixa a tabulação alcançar a tela de trás', async () => {
    await abrir()

    const deTras = screen.getByLabelText('Campo de trás')
    for (let volta = 0; volta < 4; volta += 1) {
      await userEvent.tab()
      expect(deTras).not.toHaveFocus()
    }
  })

  // CLNT-18 AC4: Escape é o gesto de desistir. Confundi-lo com confirmar
  // apagaria um cliente por engano.
  it('fecha no Escape sem executar a ação', async () => {
    const { acao } = await abrir()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(acao).not.toHaveBeenCalled()
  })

  it('fecha no cancelamento sem executar a ação', async () => {
    const { acao } = await abrir()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(acao).not.toHaveBeenCalled()
  })

  // CLNT-18 AC3: sem a devolução, quem navega por teclado recomeça do topo da
  // página a cada confirmação.
  it('devolve o foco ao elemento que o abriu', async () => {
    const { gatilho } = await abrir()

    await userEvent.keyboard('{Escape}')

    expect(gatilho).toHaveFocus()
  })

  it('executa a ação recebida quando ela é acionada', async () => {
    const { acao } = await abrir()

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(acao).toHaveBeenCalledOnce()
  })

  // Os dois consumidores dizem coisas diferentes ao desistir: a exclusão
  // cancela, a saída do formulário continua editando.
  it('aceita outro texto de cancelamento, para servir aos dois consumidores', async () => {
    await abrir('Continuar editando')

    expect(screen.getByRole('button', { name: 'Continuar editando' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
  })
})
