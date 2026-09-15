import { describe, expect, it } from 'vitest'

import { deveTentarDeNovo, ehErroDeAutorizacao, queryClient } from './query-client'

describe('ehErroDeAutorizacao', () => {
  it('reconhece a recusa do PostgREST por política ou privilégio', () => {
    expect(ehErroDeAutorizacao({ code: '42501', message: 'permission denied' })).toBe(true)
  })

  it('reconhece sessão inválida pelo status 401', () => {
    expect(ehErroDeAutorizacao({ status: 401 })).toBe(true)
  })

  it('reconhece sessão inválida pelo status 403', () => {
    expect(ehErroDeAutorizacao({ status: 403 })).toBe(true)
  })

  it('não confunde violação de constraint com falta de autorização', () => {
    expect(ehErroDeAutorizacao({ code: '23514' })).toBe(false)
  })

  it('não quebra com valores que não são objeto', () => {
    expect(ehErroDeAutorizacao(null)).toBe(false)
    expect(ehErroDeAutorizacao(undefined)).toBe(false)
    expect(ehErroDeAutorizacao('erro')).toBe(false)
  })
})

describe('deveTentarDeNovo', () => {
  it('não repete uma falha de autorização, nem na primeira tentativa', () => {
    expect(deveTentarDeNovo(0, { code: '42501' })).toBe(false)
  })

  it('repete uma falha de rede enquanto houver tentativas', () => {
    expect(deveTentarDeNovo(0, new Error('network'))).toBe(true)
    expect(deveTentarDeNovo(1, new Error('network'))).toBe(true)
  })

  it('para depois de duas tentativas extras', () => {
    expect(deveTentarDeNovo(2, new Error('network'))).toBe(false)
  })
})

describe('queryClient', () => {
  it('usa o predicado como política de retry das consultas', () => {
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(deveTentarDeNovo)
  })

  it('não repete mutações: reenviar uma escrita pode duplicar efeito', () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false)
  })
})
