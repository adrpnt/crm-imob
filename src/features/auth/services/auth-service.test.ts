import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { supabase } from '../../../lib/supabase'
import {
  cadastrar,
  entrar,
  pedirRecuperacao,
  redefinirSenha,
  sair,
  traduzirErro,
} from './auth-service'

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}))

const auth = vi.mocked(supabase.auth)

// Formatos observados contra o Supabase local, não inventados.
const ERRO_CREDENCIAL = {
  code: 'invalid_credentials',
  status: 400,
  message: 'Invalid login credentials',
}
const ERRO_EXISTENTE = {
  code: 'user_already_exists',
  status: 422,
  message: 'User already registered',
}
const ERRO_SENHA_FRACA = {
  code: 'weak_password',
  status: 422,
  message: 'Password should be at least 8 characters.',
}
const ERRO_REDE = { message: 'Failed to fetch' }

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('traduzirErro', () => {
  it('devolve a mesma frase para credencial errada e para e-mail sem conta', () => {
    // O Supabase já usa o mesmo código para os dois casos; o teste garante que
    // esta camada não desfaça a discrição.
    expect(traduzirErro(ERRO_CREDENCIAL)).toBe('E-mail ou senha inválidos')
  })

  it('não vaza a palavra e-mail nem senha isoladamente na frase de credencial', () => {
    const frase = traduzirErro(ERRO_CREDENCIAL)
    expect(frase).not.toMatch(/não (existe|encontrad)/i)
    expect(frase).not.toMatch(/senha (incorreta|errada)/i)
  })

  it('distingue falha de rede de credencial inválida', () => {
    expect(traduzirErro(ERRO_REDE)).toBe(
      'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
    )
    expect(traduzirErro(ERRO_REDE)).not.toBe(traduzirErro(ERRO_CREDENCIAL))
  })

  it('distingue limite de tentativas de credencial inválida', () => {
    const frase = traduzirErro({ code: 'over_request_rate_limit', status: 429 })
    expect(frase).toMatch(/aguarde/i)
    expect(frase).not.toBe(traduzirErro(ERRO_CREDENCIAL))
  })

  it('reconhece limite pelo status 429 mesmo sem código conhecido', () => {
    expect(traduzirErro({ status: 429, code: 'desconhecido' })).toMatch(/aguarde/i)
  })

  it('orienta quando o e-mail já tem conta', () => {
    expect(traduzirErro(ERRO_EXISTENTE)).toMatch(/já possui conta/i)
  })

  it('explica o link expirado e oferece caminho', () => {
    expect(traduzirErro({ code: 'otp_expired', status: 401 })).toMatch(/expirou|já foi usado/i)
  })

  it('cai numa frase genérica para código desconhecido', () => {
    expect(traduzirErro({ code: 'jamais_visto', status: 500 })).toBe(
      'Não foi possível concluir agora. Tente de novo em instantes.',
    )
  })

  it('registra o erro original no console antes de traduzir', () => {
    traduzirErro(ERRO_CREDENCIAL)
    expect(console.error).toHaveBeenCalledWith('[falha de autenticação]', ERRO_CREDENCIAL)
  })
})

describe('entrar', () => {
  it('devolve ok quando as credenciais servem', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null } as never)
    expect(await entrar({ email: 'a@b.co', senha: 'x' })).toEqual({ ok: true })
  })

  it('devolve a frase traduzida quando falha', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: ERRO_CREDENCIAL } as never)
    expect(await entrar({ email: 'a@b.co', senha: 'x' })).toEqual({
      ok: false,
      mensagem: 'E-mail ou senha inválidos',
    })
  })
})

describe('cadastrar', () => {
  it('envia o nome nos metadados, que é de onde o trigger o lê', async () => {
    auth.signUp.mockResolvedValue({ error: null } as never)

    await cadastrar({ nomeCompleto: 'Joana Silva', email: 'a@b.co', senha: 'senha-longa' })

    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: 'senha-longa',
      options: { data: { full_name: 'Joana Silva' } },
    })
  })

  it('traduz o e-mail já cadastrado preservando a orientação', async () => {
    auth.signUp.mockResolvedValue({ error: ERRO_EXISTENTE } as never)
    const r = await cadastrar({ nomeCompleto: 'X', email: 'a@b.co', senha: 'senha-longa' })
    expect(r).toEqual({
      ok: false,
      mensagem: 'Este e-mail já possui conta. Entre ou recupere sua senha.',
    })
  })

  it('traduz a senha recusada pelo servidor', async () => {
    auth.signUp.mockResolvedValue({ error: ERRO_SENHA_FRACA } as never)
    const r = await cadastrar({ nomeCompleto: 'X', email: 'a@b.co', senha: 'curta' })
    expect(r).toEqual({ ok: false, mensagem: 'A senha precisa de ao menos 8 caracteres' })
  })
})

describe('pedirRecuperacao', () => {
  it('pede o link apontando para a rota de redefinição', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null } as never)

    await pedirRecuperacao('a@b.co', 'http://localhost:5173/reset-password')

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.co', {
      redirectTo: 'http://localhost:5173/reset-password',
    })
  })

  it('devolve ok mesmo quando o servidor recusa por conta inexistente', async () => {
    // Revelar essa recusa diria ao visitante quais e-mails têm conta.
    auth.resetPasswordForEmail.mockResolvedValue({
      error: { code: 'user_not_found', status: 400 },
    } as never)

    expect(await pedirRecuperacao('a@b.co', '/x')).toEqual({ ok: true })
  })

  it('surfaceia falha de rede, porque essa vale nova tentativa', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: ERRO_REDE } as never)
    const r = await pedirRecuperacao('a@b.co', '/x')
    expect(r.ok).toBe(false)
  })

  it('surfaceia limite de envio', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({
      error: { code: 'over_email_send_rate_limit', status: 429 },
    } as never)
    const r = await pedirRecuperacao('a@b.co', '/x')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.mensagem).toMatch(/aguarde/i)
  })
})

describe('redefinirSenha', () => {
  it('atualiza a senha do usuário', async () => {
    auth.updateUser.mockResolvedValue({ error: null } as never)
    expect(await redefinirSenha('senha-nova-123')).toEqual({ ok: true })
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'senha-nova-123' })
  })

  it('explica o link expirado', async () => {
    auth.updateUser.mockResolvedValue({ error: { code: 'otp_expired', status: 401 } } as never)
    const r = await redefinirSenha('senha-nova-123')
    expect(r.ok === false && r.mensagem).toMatch(/expirou|já foi usado/i)
  })
})

describe('sair', () => {
  it('encerra a sessão', async () => {
    auth.signOut.mockResolvedValue({ error: null } as never)
    await sair()
    expect(auth.signOut).toHaveBeenCalledOnce()
  })
})
