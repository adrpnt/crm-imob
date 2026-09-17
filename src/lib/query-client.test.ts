import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  aoFalharConsulta,
  deveTentarDeNovo,
  ehErroDeAutorizacao,
  ehSessaoExpirada,
  queryClient,
} from './query-client'
import { consumirSessaoExpirada, marcarSessaoExpirada } from './sessao-expirada'
import { supabase } from './supabase'

vi.mock('./supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }))

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

describe('ehSessaoExpirada', () => {
  it('reconhece o status 401', () => {
    expect(ehSessaoExpirada({ status: 401 })).toBe(true)
  })

  it('reconhece o status 403', () => {
    expect(ehSessaoExpirada({ status: 403 })).toBe(true)
  })

  // Esta é a distinção que a emenda ao spec introduziu. O 42501 significa
  // "linha alheia" com sessão válida: inserir um cliente com owner_id de outro
  // produz esse código, e é comportamento esperado.
  it('NÃO reconhece o 42501 da RLS, que é permissão negada com sessão válida', () => {
    expect(ehSessaoExpirada({ code: '42501' })).toBe(false)
  })

  it('não quebra com valores que não são objeto', () => {
    expect(ehSessaoExpirada(null)).toBe(false)
    expect(ehSessaoExpirada('erro')).toBe(false)
  })
})

describe('as duas classificações decidem coisas diferentes sobre o mesmo erro', () => {
  it('o 42501 não é repetido, mas também não encerra a sessão', () => {
    const erro = { code: '42501' }
    expect(ehErroDeAutorizacao(erro)).toBe(true)
    expect(ehSessaoExpirada(erro)).toBe(false)
  })

  it('o 401 não é repetido e encerra a sessão', () => {
    const erro = { status: 401 }
    expect(ehErroDeAutorizacao(erro)).toBe(true)
    expect(ehSessaoExpirada(erro)).toBe(true)
  })
})

describe('aoFalharConsulta', () => {
  beforeEach(() => {
    consumirSessaoExpirada()
  })

  afterEach(() => {
    vi.clearAllMocks()
    consumirSessaoExpirada()
  })

  it('encerra a sessão e sinaliza a expiração em um 401', () => {
    aoFalharConsulta({ status: 401 })
    expect(supabase.auth.signOut).toHaveBeenCalledOnce()
    expect(consumirSessaoExpirada()).toBe(true)
  })

  it('não encerra a sessão em um 42501', () => {
    aoFalharConsulta({ code: '42501' })
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
    expect(consumirSessaoExpirada()).toBe(false)
  })

  it('ignora erro comum de rede', () => {
    aoFalharConsulta(new Error('network'))
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
  })

  it('está ligado ao cache de consultas do cliente', () => {
    expect(queryClient.getQueryCache().config.onError).toBe(aoFalharConsulta)
  })
})

/**
 * Executa uma mutação de verdade pelo cache do cliente construído.
 *
 * Provocar a mutação em vez de chamar `aoFalharConsulta` na mão é o que prova
 * a ligação: uma função correta e desligada do `MutationCache` passaria em
 * qualquer teste que a invocasse diretamente — foi exatamente a dívida D3.
 */
async function mutacaoQueFalha(
  erro: unknown,
  opcoes: { onError?: (erro: unknown) => void } = {},
): Promise<void> {
  const mutacao = queryClient
    .getMutationCache()
    .build<unknown, unknown, void, unknown>(queryClient, {
      mutationFn: () => Promise.reject(erro),
      ...opcoes,
    })
  await expect(mutacao.execute(undefined)).rejects.toBe(erro)
}

describe('falha de autorização em mutação (AD-016)', () => {
  beforeEach(() => {
    consumirSessaoExpirada()
  })

  afterEach(() => {
    vi.clearAllMocks()
    consumirSessaoExpirada()
    queryClient.getMutationCache().clear()
  })

  it('está ligado ao cache de mutações do cliente', () => {
    expect(queryClient.getMutationCache().config.onError).toBe(aoFalharConsulta)
  })

  it('um 401 em mutação encerra a sessão e sinaliza a expiração', async () => {
    await mutacaoQueFalha({ status: 401 })
    expect(supabase.auth.signOut).toHaveBeenCalledOnce()
    expect(consumirSessaoExpirada()).toBe(true)
  })

  // O 42501 é "esta linha não é sua" com sessão válida. Derrubar o consultor
  // para o login por isso é o erro que `ehSessaoExpirada` existe para evitar.
  it('um 42501 em mutação NÃO encerra a sessão', async () => {
    await mutacaoQueFalha({ code: '42501' })
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
    expect(consumirSessaoExpirada()).toBe(false)
  })

  // A garantia que o AD-016 compra: o callback do cache não pode ser
  // sobrescrito por uma mutação individual, então uma mutação nova não nasce
  // esquecida por tratar o próprio erro.
  it('dispara mesmo quando a mutação trata o próprio erro', async () => {
    const proprio = vi.fn()
    await mutacaoQueFalha({ status: 401 }, { onError: proprio })
    expect(proprio).toHaveBeenCalledOnce()
    expect(supabase.auth.signOut).toHaveBeenCalledOnce()
    expect(consumirSessaoExpirada()).toBe(true)
  })
})

describe('consumirSessaoExpirada', () => {
  it('devolve falso quando nada marcou', () => {
    consumirSessaoExpirada()
    expect(consumirSessaoExpirada()).toBe(false)
  })

  it('é destrutivo: a segunda leitura já devolve falso', () => {
    marcarSessaoExpirada()
    expect(consumirSessaoExpirada()).toBe(true)
    expect(consumirSessaoExpirada()).toBe(false)
  })
})
