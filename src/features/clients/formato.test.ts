import { describe, expect, it } from 'vitest'

import {
  formatarData,
  formatarRenda,
  formatarTelefone,
  rendaParaNumero,
  SEM_VALOR,
} from './formato'

/**
 * O `Intl` separa o símbolo do valor com espaço inquebrável (U+00A0), não com
 * espaço comum. Escrito com o escape para que a asserção não dependa de um
 * caractere invisível colado no arquivo.
 */
const ESPACO = ' '

describe('formatarRenda', () => {
  it('exibe em BRL com separador de milhar e duas casas', () => {
    expect(formatarRenda(1234.5)).toBe(`R$${ESPACO}1.234,50`)
  })

  it('mantém o separador de milhar no limite do check', () => {
    expect(formatarRenda(99999999.99)).toBe(`R$${ESPACO}99.999.999,99`)
  })

  // Renda ausente e renda zero significam coisas diferentes: uma diz que
  // ninguém perguntou, a outra que a apuração deu zero.
  it('exibe renda nula como ausência, e não como R$ 0,00', () => {
    expect(formatarRenda(null)).toBe(SEM_VALOR)
    expect(formatarRenda(null)).not.toBe(`R$${ESPACO}0,00`)
  })

  it('exibe renda zero como R$ 0,00, que é um valor apurado', () => {
    expect(formatarRenda(0)).toBe(`R$${ESPACO}0,00`)
  })
})

describe('rendaParaNumero', () => {
  // O campo aceita as duas formas: o consultor digita 1234,50 ou cola
  // R$ 1.234,50 de uma conversa, e os dois chegam ao schema como número.
  it('aceita dígitos com e sem máscara', () => {
    expect(rendaParaNumero('1234')).toBe(1234)
    expect(rendaParaNumero('1234,50')).toBe(1234.5)
    expect(rendaParaNumero('R$ 1.234,50')).toBe(1234.5)
    expect(rendaParaNumero('99.999.999,99')).toBe(99999999.99)
  })

  // Vazio é renda não informada; rabisco é erro de digitação, e vira NaN para
  // que o schema o recuse em vez de gravar ausência silenciosamente.
  it('devolve ausência para vazio e NaN para texto sem número', () => {
    expect(rendaParaNumero('')).toBeUndefined()
    expect(rendaParaNumero('   ')).toBeUndefined()
    expect(rendaParaNumero('abc')).toBeNaN()
  })

  // Preservar o sinal é o que faz o erro do CLNT-01 AC4 aparecer no campo.
  it('preserva o negativo, para o schema recusá-lo com mensagem', () => {
    expect(rendaParaNumero('-500')).toBe(-500)
  })
})

describe('formatarTelefone', () => {
  it('aplica a máscara de celular a 11 dígitos', () => {
    expect(formatarTelefone('11987654321')).toBe('(11) 98765-4321')
  })

  it('aplica a máscara de fixo a 10 dígitos', () => {
    expect(formatarTelefone('1134567890')).toBe('(11) 3456-7890')
  })

  // A coluna aceita de 8 a 20 dígitos: inventar máscara para um número
  // internacional exibiria algo que ninguém digitou.
  it('exibe comprimento inesperado como está, sem quebrar', () => {
    expect(formatarTelefone('12345678')).toBe('12345678')
    expect(formatarTelefone('123456789012345')).toBe('123456789012345')
  })

  it('exibe telefone ausente como ausência', () => {
    expect(formatarTelefone(null)).toBe(SEM_VALOR)
  })
})

describe('formatarData', () => {
  // CLNT-14 AC1: criação e atualização na ficha, em formato brasileiro.
  it('exibe a data no formato brasileiro', () => {
    expect(formatarData('2026-09-17T15:30:00.000Z')).toBe('17/09/2026')
  })
})
