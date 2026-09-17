import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { CampoComSugestoes } from './CampoComSugestoes'

const REGIOES = ['Barra', 'Centro', 'Zona Sul']

/** As opções de um `datalist` não entram na árvore de acessibilidade. */
function sugestoesOferecidas(controle: HTMLElement): string[] {
  const lista = document.getElementById(controle.getAttribute('list') ?? '')
  return [...(lista?.querySelectorAll('option') ?? [])].map((opcao) => opcao.value)
}

describe('CampoComSugestoes', () => {
  it('expõe o controle pelo rótulo visível e o foca pelo rótulo', async () => {
    render(<CampoComSugestoes rotulo="Região" sugestoes={REGIOES} />)

    await userEvent.click(screen.getByText('Região'))
    expect(screen.getByLabelText('Região')).toHaveFocus()
  })

  it('oferece as regiões já usadas pelo consultor', () => {
    render(<CampoComSugestoes rotulo="Região" sugestoes={REGIOES} />)

    const controle = screen.getByLabelText('Região')
    expect(controle.getAttribute('list')).not.toBe('')
    expect(sugestoesOferecidas(controle)).toEqual(REGIOES)
  })

  // AD-009: a lista é atalho, não domínio fechado. Uma região nova precisa
  // entrar pelo mesmo campo, senão o consultor fica preso às que já existem.
  it('aceita uma região que não está na lista', async () => {
    render(<CampoComSugestoes rotulo="Região" sugestoes={REGIOES} />)

    const controle = screen.getByLabelText('Região')
    await userEvent.type(controle, 'Ilha do Governador')

    expect(controle).toHaveValue('Ilha do Governador')
  })

  it('marca o controle como inválido e o associa à mensagem de erro', () => {
    render(
      <CampoComSugestoes rotulo="Região" sugestoes={REGIOES} erro="Use no máximo 80 caracteres" />,
    )

    const controle = screen.getByLabelText('Região')
    const mensagem = screen.getByText('Use no máximo 80 caracteres')

    expect(controle).toHaveAttribute('aria-invalid', 'true')
    expect(controle).toHaveAttribute('aria-describedby', mensagem.id)
  })

  it('associa o texto de apoio, como em Campo', () => {
    render(<CampoComSugestoes rotulo="Região" sugestoes={REGIOES} dica="Bairro ou zona" />)

    const controle = screen.getByLabelText('Região')
    expect(controle).toHaveAttribute('aria-describedby', screen.getByText('Bairro ou zona').id)
    expect(controle).not.toHaveAttribute('aria-invalid')
  })

  // O primeiro cadastro acontece com a carteira vazia: não há região nenhuma
  // para sugerir, e o campo tem de continuar sendo um campo.
  it('continua utilizável quando não há nenhuma sugestão', async () => {
    render(<CampoComSugestoes rotulo="Região" sugestoes={[]} />)

    const controle = screen.getByLabelText('Região')
    expect(controle).toBeVisible()
    expect(sugestoesOferecidas(controle)).toEqual([])

    await userEvent.type(controle, 'Barra')
    expect(controle).toHaveValue('Barra')
  })

  it('encaminha props ao controle, como o register do formulário exige', async () => {
    const digitado: string[] = []
    render(
      <CampoComSugestoes
        rotulo="Região"
        sugestoes={REGIOES}
        name="region"
        onChange={(e) => digitado.push(e.target.value)}
      />,
    )

    const controle = screen.getByLabelText('Região')
    expect(controle).toHaveAttribute('name', 'region')
    await userEvent.type(controle, 'Ce')
    expect(digitado).toEqual(['C', 'Ce'])
  })
})
