import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Esqueleto } from './Esqueleto'

const linhasDe = (regiao: HTMLElement) => regiao.querySelectorAll('[data-linha]')

describe('Esqueleto', () => {
  // CLNT-18 AC7: o carregamento é anunciado, e não apenas exibido. `polite`
  // espera a frase corrente terminar em vez de atravessar a leitura.
  it('anuncia o carregamento em região assistiva', () => {
    render(<Esqueleto />)

    const regiao = screen.getByRole('status')
    expect(regiao).toHaveAttribute('aria-live', 'polite')
    expect(regiao).toHaveTextContent('Carregando…')
  })

  // A tabela pede uma linha por registro; o cartão, poucas; a ficha, um bloco.
  it('desenha a quantidade de linhas pedida', () => {
    render(<Esqueleto linhas={5} />)

    expect(linhasDe(screen.getByRole('status'))).toHaveLength(5)
  })

  it('desenha uma contagem padrão quando nenhuma é informada', () => {
    render(<Esqueleto />)

    expect(linhasDe(screen.getByRole('status'))).toHaveLength(3)
  })

  // Vinte retângulos vazios lidos em voz alta dizem menos que uma frase.
  it('mantém as barras fora da árvore de acessibilidade', () => {
    render(<Esqueleto linhas={4} />)

    const regiao = screen.getByRole('status')
    for (const linha of linhasDe(regiao)) {
      expect(linha.closest('[aria-hidden="true"]')).not.toBeNull()
    }
    expect(regiao).toHaveTextContent('Carregando…')
  })

  it('aceita o rótulo do que está carregando', () => {
    render(<Esqueleto rotulo="Carregando a carteira" />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando a carteira…')
  })

  // O anúncio não se repete a cada nova linha: é uma região só, com o mesmo
  // texto, mesmo quando a contagem muda entre uma renderização e outra.
  it('não repete o anúncio quando a contagem de linhas muda', () => {
    const { rerender } = render(<Esqueleto linhas={2} />)

    rerender(<Esqueleto linhas={8} />)

    const regioes = screen.getAllByRole('status')
    expect(regioes).toHaveLength(1)
    expect(regioes[0]).toHaveTextContent('Carregando…')
    expect(linhasDe(regioes[0])).toHaveLength(8)
  })
})
