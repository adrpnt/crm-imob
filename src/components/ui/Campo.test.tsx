import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Campo } from './Campo'

describe('Campo', () => {
  it('expõe o controle pelo rótulo visível', () => {
    render(<Campo rotulo="E-mail" />)
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
  })

  it('foca o controle ao clicar no rótulo, o que prova a amarração', async () => {
    render(<Campo rotulo="E-mail" />)
    await userEvent.click(screen.getByText('E-mail'))
    expect(screen.getByLabelText('E-mail')).toHaveFocus()
  })

  // Texto de exemplo some quando o consultor digita, e nunca existiu para quem
  // usa leitor de tela. O rótulo precisa estar lá de qualquer forma.
  it('mantém o rótulo mesmo quando há texto de exemplo', () => {
    render(<Campo rotulo="E-mail" placeholder="voce@exemplo.com" />)
    expect(screen.getByText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('placeholder', 'voce@exemplo.com')
  })

  it('marca o controle como inválido e o associa à mensagem de erro', () => {
    render(<Campo rotulo="E-mail" erro="Informe um e-mail válido" />)

    const controle = screen.getByLabelText('E-mail')
    const mensagem = screen.getByText('Informe um e-mail válido')

    expect(controle).toHaveAttribute('aria-invalid', 'true')
    expect(controle).toHaveAttribute('aria-describedby', mensagem.id)
    expect(mensagem.id).not.toBe('')
  })

  it('não marca como inválido quando não há erro', () => {
    render(<Campo rotulo="E-mail" />)
    const controle = screen.getByLabelText('E-mail')
    expect(controle).not.toHaveAttribute('aria-invalid')
    expect(controle).not.toHaveAttribute('aria-describedby')
  })

  it('associa também o texto de apoio', () => {
    render(<Campo rotulo="Telefone" dica="Com DDD, só números" />)
    const controle = screen.getByLabelText('Telefone')
    const dica = screen.getByText('Com DDD, só números')
    expect(controle).toHaveAttribute('aria-describedby', dica.id)
  })

  it('associa apoio e erro ao mesmo tempo, na ordem de leitura', () => {
    render(<Campo rotulo="Telefone" dica="Com DDD" erro="Telefone inválido" />)
    const controle = screen.getByLabelText('Telefone')
    const dica = screen.getByText('Com DDD')
    const erro = screen.getByText('Telefone inválido')
    expect(controle).toHaveAttribute('aria-describedby', `${dica.id} ${erro.id}`)
  })

  it('gera identificadores distintos para cada instância', () => {
    render(
      <>
        <Campo rotulo="Senha" erro="curta" />
        <Campo rotulo="Confirmação" erro="não confere" />
      </>,
    )
    const a = screen.getByLabelText('Senha').getAttribute('aria-describedby')
    const b = screen.getByLabelText('Confirmação').getAttribute('aria-describedby')
    expect(a).not.toBe(b)
  })

  it('encaminha props ao controle, como o register do formulário exige', async () => {
    const digitado: string[] = []
    render(
      <Campo
        rotulo="Nome"
        type="text"
        name="nomeCompleto"
        onChange={(e) => digitado.push(e.target.value)}
      />,
    )

    const controle = screen.getByLabelText('Nome')
    expect(controle).toHaveAttribute('name', 'nomeCompleto')
    await userEvent.type(controle, 'Jo')
    // `e.target.value` traz o valor acumulado do controle, não a tecla isolada.
    expect(digitado).toEqual(['J', 'Jo'])
  })
})
