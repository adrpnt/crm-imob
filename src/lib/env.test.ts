import { describe, expect, it } from 'vitest'

import { env, parseEnv } from './env'

const valido = {
  VITE_SUPABASE_URL: 'https://abcdefgh.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'chave-publicavel',
}

describe('parseEnv', () => {
  it('devolve as duas variáveis quando a origem é válida', () => {
    expect(parseEnv(valido)).toEqual(valido)
  })

  it('nomeia a variável ausente na mensagem de erro', () => {
    const semUrl = { VITE_SUPABASE_ANON_KEY: valido.VITE_SUPABASE_ANON_KEY }
    expect(() => parseEnv(semUrl)).toThrowError(/VITE_SUPABASE_URL/)
  })

  it('nomeia a variável vazia na mensagem de erro', () => {
    expect(() => parseEnv({ ...valido, VITE_SUPABASE_ANON_KEY: '' })).toThrowError(
      /VITE_SUPABASE_ANON_KEY/,
    )
  })

  it('rejeita uma URL malformada nomeando a variável', () => {
    expect(() => parseEnv({ ...valido, VITE_SUPABASE_URL: 'nao-e-uma-url' })).toThrowError(
      /VITE_SUPABASE_URL/,
    )
  })
})

describe('env', () => {
  it('é exportado já validado a partir do ambiente do build', () => {
    expect(env.VITE_SUPABASE_URL).toMatch(/^https?:\/\//)
    expect(env.VITE_SUPABASE_ANON_KEY.length).toBeGreaterThan(0)
  })
})
