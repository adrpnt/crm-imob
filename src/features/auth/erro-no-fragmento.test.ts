import { describe, expect, it } from 'vitest'

import { lerErroDoFragmento, traduzirErroDoFragmento } from './erro-no-fragmento'

describe('lerErroDoFragmento', () => {
  it('lê o código e a descrição de um link expirado', () => {
    const erro = lerErroDoFragmento(
      '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
    )
    expect(erro).toEqual({
      codigo: 'otp_expired',
      descricao: 'Email link is invalid or has expired',
    })
  })

  it('funciona com ou sem a cerquilha inicial', () => {
    expect(lerErroDoFragmento('error_code=otp_expired')?.codigo).toBe('otp_expired')
  })

  it('devolve nulo quando não há fragmento', () => {
    expect(lerErroDoFragmento('')).toBeNull()
    expect(lerErroDoFragmento('#')).toBeNull()
  })

  it('devolve nulo quando o fragmento não descreve erro', () => {
    expect(lerErroDoFragmento('#access_token=abc&type=recovery')).toBeNull()
  })
})

describe('traduzirErroDoFragmento', () => {
  it('explica que o link expirou', () => {
    const frase = traduzirErroDoFragmento({ codigo: 'otp_expired', descricao: '' })
    expect(frase).toMatch(/expirou/i)
    expect(frase).toMatch(/solicite um novo/i)
  })

  it('explica que o link não vale mais', () => {
    expect(traduzirErroDoFragmento({ codigo: 'access_denied', descricao: '' })).toMatch(
      /não é mais válido/i,
    )
  })

  it('tem frase de reserva para código desconhecido', () => {
    const frase = traduzirErroDoFragmento({ codigo: 'jamais_visto', descricao: '' })
    expect(frase).toMatch(/solicite um novo/i)
  })

  it('devolve nulo quando não há erro', () => {
    expect(traduzirErroDoFragmento(null)).toBeNull()
  })
})
