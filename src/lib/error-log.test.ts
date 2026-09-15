import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registrarErroDoCliente } from './error-log'
import { supabase } from './supabase'

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  },
}))

const auth = vi.mocked(supabase.auth)
const from = vi.mocked(supabase.from)

function comSessao(idDoUsuario: string) {
  auth.getSession.mockResolvedValue({ data: { session: { user: { id: idDoUsuario } } } } as never)
}

function insertQueDevolve(resultado: unknown) {
  const insert = vi.fn().mockResolvedValue(resultado)
  from.mockReturnValue({ insert } as never)
  return insert
}

describe('registrarErroDoCliente', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('grava o erro com identificador, mensagem, stack e rota', async () => {
    comSessao('user-1')
    const insert = insertQueDevolve({ error: null })

    const erro = new Error('TypeError: x is not a function')
    erro.stack = 'Error: x\n  at foo'

    expect(await registrarErroDoCliente(erro, '/clients/1')).toBe('gravado')
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: 'user-1',
        message: 'TypeError: x is not a function',
        stack: 'Error: x\n  at foo',
        route: '/clients/1',
      }),
    )
  })

  it('não tenta escrever quando não há sessão', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } } as never)

    expect(await registrarErroDoCliente(new Error('falhou'), '/login')).toBe('sem-sessao')
    expect(from).not.toHaveBeenCalled()
  })

  it('registra no console o erro que não pôde ser persistido', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } } as never)
    const erro = new Error('quebrou no login')

    await registrarErroDoCliente(erro, '/login')

    // Sem esta asserção, o erro de rota pública sumiria sem deixar rastro
    // algum: não vai para o banco por decisão (AD-011), e o console é a única
    // via que resta.
    expect(console.error).toHaveBeenCalledWith('[erro sem sessão, não persistido]', erro)
  })

  it('devolve "falhou" sem lançar quando o insert é recusado', async () => {
    comSessao('user-1')
    insertQueDevolve({ error: { code: '42501', message: 'permission denied' } })

    await expect(registrarErroDoCliente(new Error('x'), '/')).resolves.toBe('falhou')
  })

  it('devolve "falhou" sem lançar quando a própria chamada explode', async () => {
    auth.getSession.mockRejectedValue(new Error('rede caiu'))

    await expect(registrarErroDoCliente(new Error('x'), '/')).resolves.toBe('falhou')
  })

  it('trunca mensagem e stack aos limites das constraints', async () => {
    comSessao('user-1')
    const insert = insertQueDevolve({ error: null })

    const erro = new Error('m'.repeat(2500))
    erro.stack = 's'.repeat(12_000)

    await registrarErroDoCliente(erro, 'r'.repeat(600))

    const enviado = insert.mock.calls[0][0] as Record<string, string>
    expect(enviado.message).toHaveLength(2000)
    expect(enviado.stack).toHaveLength(10_000)
    expect(enviado.route).toHaveLength(500)
  })

  it('usa um texto padrão quando o erro não tem mensagem', async () => {
    comSessao('user-1')
    const insert = insertQueDevolve({ error: null })

    await registrarErroDoCliente(new Error(''), '/')

    expect(insert.mock.calls[0][0]).toMatchObject({ message: 'erro sem mensagem' })
  })
})
