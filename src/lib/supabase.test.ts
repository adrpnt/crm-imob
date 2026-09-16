import { describe, expect, it } from 'vitest'

import { opcoesDoCliente } from './supabase'

/**
 * Contrato das opções de sessão.
 *
 * A verificação independente desligou `autoRefreshToken` e os cinco gates
 * passaram — o AUTH-12 AC5 não tinha evidência alguma. Estas asserções são
 * baratas e transformam cada opção num compromisso verificável.
 */
describe('opções de sessão do cliente Supabase', () => {
  it('mantém a sessão entre visitas, como o AUTH-05 exige', () => {
    expect(opcoesDoCliente.auth.persistSession).toBe(true)
  })

  // Sem renovação, o consultor é deslogado no meio do trabalho quando o token
  // de acesso expira — tipicamente em uma hora.
  it('renova o token automaticamente, como o AUTH-12 exige', () => {
    expect(opcoesDoCliente.auth.autoRefreshToken).toBe(true)
  })

  // Desligar isto quebraria o fluxo de redefinição por completo: o token do
  // link nunca seria lido da URL.
  it('lê a sessão que vem na URL, de que o link de recuperação depende', () => {
    expect(opcoesDoCliente.auth.detectSessionInUrl).toBe(true)
  })
})
