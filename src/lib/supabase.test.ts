import { afterEach, describe, expect, it, vi } from 'vitest'

import { opcoesDoCliente } from './supabase'

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({})) }))

/**
 * Contrato das opções de sessão.
 *
 * A primeira rodada de verificação desligou `autoRefreshToken` e os cinco gates
 * passaram — o AUTH-12 AC5 não tinha evidência alguma. A segunda rodada mostrou
 * que prender apenas a constante era insuficiente: passar as opções inline,
 * ignorando-a, continuava escapando. Por isso há dois níveis aqui — o valor das
 * opções, e o fato de serem estas as entregues ao cliente.
 */
afterEach(() => {
  vi.resetModules()
})

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

describe('o cliente é construído com essas opções', () => {
  // Prender só a constante deixaria passar um cliente construído com opções
  // inline: a constante certa, o cliente errado, e nenhum teste reclamando.
  it('entrega as opções declaradas ao createClient', async () => {
    vi.resetModules()
    const { createClient } = await import('@supabase/supabase-js')
    await import('./supabase')

    expect(createClient).toHaveBeenCalledOnce()

    const [, , opcoes] = vi.mocked(createClient).mock.calls[0]
    expect(opcoes).toMatchObject({
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  })

  it('usa a url e a chave validadas pelo módulo de ambiente', async () => {
    vi.resetModules()
    const { createClient } = await import('@supabase/supabase-js')
    const { env } = await import('./env')
    await import('./supabase')

    const [url, chave] = vi.mocked(createClient).mock.calls[0]
    expect(url).toBe(env.VITE_SUPABASE_URL)
    expect(chave).toBe(env.VITE_SUPABASE_ANON_KEY)
  })
})
