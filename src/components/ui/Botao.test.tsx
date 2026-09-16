import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Botao } from './Botao'

describe('Botao', () => {
  it('usa o conteúdo como nome acessível', () => {
    render(<Botao>Entrar</Botao>)
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('dispara a ação ao ser clicado', async () => {
    const aoClicar = vi.fn()
    render(<Botao onClick={aoClicar}>Entrar</Botao>)
    await userEvent.click(screen.getByRole('button'))
    expect(aoClicar).toHaveBeenCalledOnce()
  })

  // AUTH-01 AC6: durante o envio, um segundo clique não pode disparar a ação.
  // A prevenção mora aqui e não na tela, para não depender de cada formulário
  // lembrar de implementá-la.
  it('ignora cliques enquanto está enviando', async () => {
    const aoClicar = vi.fn()
    render(
      <Botao enviando onClick={aoClicar}>
        Entrar
      </Botao>,
    )

    const botao = screen.getByRole('button')
    await userEvent.click(botao)
    await userEvent.click(botao)

    expect(aoClicar).not.toHaveBeenCalled()
    expect(botao).toBeDisabled()
  })

  it('anuncia o progresso a leitores de tela enquanto envia', () => {
    render(<Botao enviando>Entrar</Botao>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })

  it('não anuncia progresso quando não está enviando', () => {
    render(<Botao>Entrar</Botao>)
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy')
  })

  it('pode ser desabilitado por outro motivo que não o envio', () => {
    render(<Botao inativo>Entrar</Botao>)
    const botao = screen.getByRole('button')
    expect(botao).toBeDisabled()
    expect(botao).not.toHaveAttribute('aria-busy')
  })

  // O padrão do HTML dentro de um formulário é `submit`, o que faria um botão
  // de cancelar enviar o formulário sem querer.
  it('é do tipo button por padrão, para não enviar formulário sem querer', () => {
    render(<Botao>Cancelar</Botao>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('aceita ser declarado como envio', () => {
    render(<Botao type="submit">Entrar</Botao>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('não envia o formulário quando é do tipo padrão', async () => {
    const aoEnviar = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <form onSubmit={aoEnviar}>
        <Botao>Não envia</Botao>
      </form>,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(aoEnviar).not.toHaveBeenCalled()
  })

  it('envia o formulário quando declarado como submit', async () => {
    const aoEnviar = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <form onSubmit={aoEnviar}>
        <Botao type="submit">Envia</Botao>
      </form>,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(aoEnviar).toHaveBeenCalledOnce()
  })

  it('expõe a variante escolhida, que a folha de estilo consome', () => {
    render(
      <>
        <Botao>Primária</Botao>
        <Botao variante="secundaria">Secundária</Botao>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Primária' })).toHaveAttribute(
      'data-variante',
      'primaria',
    )
    expect(screen.getByRole('button', { name: 'Secundária' })).toHaveAttribute(
      'data-variante',
      'secundaria',
    )
  })

  it('é alcançável pelo teclado', async () => {
    render(<Botao>Entrar</Botao>)
    await userEvent.tab()
    expect(screen.getByRole('button')).toHaveFocus()
  })
})
