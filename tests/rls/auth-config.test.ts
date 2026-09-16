import { randomUUID } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'

import { exigirSupabaseLocal } from './helpers.ts'

/**
 * Configuração do Supabase Auth, verificada pelo comportamento.
 *
 * Deliberadamente não lê `config.toml`: o arquivo pode dizer uma coisa e a
 * pilha em execução se comportar de outra, porque a configuração só passa a
 * valer após reiniciar os serviços. Ler o arquivo provaria que o texto mudou,
 * não que o Supabase mudou.
 */
const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

function clienteAnonimo() {
  return createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

describe('configuração do Supabase Auth', () => {
  beforeAll(async () => {
    await exigirSupabaseLocal()
  })

  it('recusa cadastro com senha de 7 caracteres', async () => {
    const { error } = await clienteAnonimo().auth.signUp({
      email: `curta-${randomUUID()}@teste.local`,
      password: '1234567',
    })

    expect(error).not.toBeNull()
    expect(error!.message.toLowerCase()).toContain('password')
  })

  it('aceita cadastro com senha de 8 caracteres', async () => {
    const { data, error } = await clienteAnonimo().auth.signUp({
      email: `ok-${randomUUID()}@teste.local`,
      password: '12345678',
    })

    expect(error).toBeNull()
    expect(data.user).not.toBeNull()
  })

  it('entrega sessão imediatamente no cadastro, sem confirmação de e-mail', async () => {
    // AD-007: a confirmação está desativada, então signUp devolve sessão.
    // Se alguém a ligar no config.toml, este teste é o alarme.
    const { data, error } = await clienteAnonimo().auth.signUp({
      email: `sessao-${randomUUID()}@teste.local`,
      password: 'senha-valida-123',
    })

    expect(error).toBeNull()
    expect(data.session).not.toBeNull()
  })
})
