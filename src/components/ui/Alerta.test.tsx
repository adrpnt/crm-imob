import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Alerta } from './Alerta'

describe('Alerta', () => {
  it('exibe a mensagem recebida', () => {
    render(<Alerta tom="erro">E-mail ou senha inválidos</Alerta>)
    expect(screen.getByRole('alert')).toHaveTextContent('E-mail ou senha inválidos')
  })

  // `role="alert"` interrompe o leitor de tela. Um erro de envio precisa disso:
  // a pessoa não pode descobrir que falhou só quando chegar ali lendo.
  it('usa anúncio assertivo para erro', () => {
    render(<Alerta tom="erro">falhou</Alerta>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  // `role="status"` aguarda uma pausa. Anunciar "pronto, salvo" por cima do que
  // está sendo lido atrapalha mais do que ajuda.
  it('usa anúncio educado para sucesso, aviso e informação', () => {
    for (const tom of ['sucesso', 'aviso', 'informacao'] as const) {
      const { unmount } = render(<Alerta tom={tom}>mensagem</Alerta>)
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      unmount()
    }
  })

  // Distinguir só por cor deixa de fora quem não separa vermelho de verde.
  it('distingue os tons por texto, e não apenas por cor', () => {
    const { unmount } = render(<Alerta tom="erro">algo</Alerta>)
    expect(screen.getByRole('alert')).toHaveTextContent(/^Erro:/)
    unmount()

    render(<Alerta tom="sucesso">algo</Alerta>)
    expect(screen.getByRole('status')).toHaveTextContent(/^Pronto:/)
  })

  it('usa marcadores distintos para cada tom', () => {
    const marcadores = new Set<string>()
    for (const tom of ['erro', 'aviso', 'sucesso', 'informacao'] as const) {
      const { unmount } = render(<Alerta tom={tom}>x</Alerta>)
      const texto = screen.getByText(/:$/).textContent ?? ''
      marcadores.add(texto)
      unmount()
    }
    expect(marcadores.size).toBe(4)
  })

  it('assume o tom informativo quando nenhum é declarado', () => {
    render(<Alerta>algo aconteceu</Alerta>)
    expect(screen.getByRole('status')).toHaveAttribute('data-tom', 'informacao')
  })

  it('expõe o tom escolhido, que a folha de estilo consome', () => {
    render(<Alerta tom="erro">x</Alerta>)
    expect(screen.getByRole('alert')).toHaveAttribute('data-tom', 'erro')
  })
})
