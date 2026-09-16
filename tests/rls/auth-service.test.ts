import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  cadastrar,
  entrar,
  redefinirSenha,
  sair,
} from '../../src/features/auth/services/auth-service.ts'
import { supabase } from '../../src/lib/supabase.ts'
import { exigirSupabaseLocal } from './helpers.ts'

/**
 * O serviço de autenticação contra o Supabase real.
 *
 * Os testes unitários do serviço substituem o cliente por mock, o que os torna
 * cegos para a forma da API: renomear `options.data` ou trocar a assinatura de
 * `signUp` mantém todos eles verdes e quebra o produto. Esta suíte amarra os
 * dois lados do contrato.
 */
describe('auth-service contra a pilha local', () => {
  it('cadastra, entra, recusa senha errada e redefine', async () => {
    await exigirSupabaseLocal()
    const email = `servico-${randomUUID()}@teste.local`

    expect(
      await cadastrar({ nomeCompleto: 'Joana Serviço', email, senha: 'senha-valida-123' }),
    ).toEqual({
      ok: true,
    })

    expect(await entrar({ email, senha: 'senha-valida-123' })).toEqual({ ok: true })

    // A frase genérica precisa valer contra o erro real, e não só contra o mock.
    expect(await entrar({ email, senha: 'senha-errada-123' })).toEqual({
      ok: false,
      mensagem: 'E-mail ou senha inválidos',
    })

    await entrar({ email, senha: 'senha-valida-123' })
    expect(await redefinirSenha('outra-senha-456')).toEqual({ ok: true })
    await sair()
    expect(await entrar({ email, senha: 'outra-senha-456' })).toEqual({ ok: true })

    await sair()
  })

  it('o nome enviado pelo serviço chega ao perfil criado pelo trigger', async () => {
    await exigirSupabaseLocal()
    const email = `perfil-${randomUUID()}@teste.local`

    await cadastrar({ nomeCompleto: 'Bruno Trigger', email, senha: 'senha-valida-123' })
    await entrar({ email, senha: 'senha-valida-123' })

    const { data } = await supabase.from('profiles').select('full_name, email').single()

    expect(data?.full_name).toBe('Bruno Trigger')
    expect(data?.email).toBe(email)

    await sair()
  })

  it('recusa cadastro repetido com o mesmo e-mail', async () => {
    await exigirSupabaseLocal()
    const email = `repetido-${randomUUID()}@teste.local`

    await cadastrar({ nomeCompleto: 'Primeiro', email, senha: 'senha-valida-123' })
    const segundo = await cadastrar({ nomeCompleto: 'Segundo', email, senha: 'senha-valida-123' })

    expect(segundo.ok).toBe(false)
    expect(segundo.ok === false && segundo.mensagem).toMatch(/já possui conta/i)

    await sair()
  })
})
