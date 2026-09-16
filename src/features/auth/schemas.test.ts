import { describe, expect, it } from 'vitest'

import {
  schemaDeCadastro,
  schemaDeLogin,
  schemaDeNovaSenha,
  schemaDePerfil,
  schemaDeRecuperacao,
} from './schemas'

/** Devolve a mensagem do primeiro problema no campo pedido, ou undefined. */
function erroDe(
  resultado: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } },
  campo: string,
) {
  if (resultado.success) return undefined
  return resultado.error!.issues.find((i) => i.path[0] === campo)?.message
}

const cadastroValido = {
  nomeCompleto: 'Joana Silva',
  email: 'joana@exemplo.com',
  senha: 'senha-de-teste',
  confirmacaoDeSenha: 'senha-de-teste',
}

describe('schemaDeLogin', () => {
  it('aceita credenciais bem formadas', () => {
    const r = schemaDeLogin.safeParse({ email: 'joana@exemplo.com', senha: 'x' })
    expect(r.success).toBe(true)
  })

  it('apara e converte o e-mail para minúsculas', () => {
    const r = schemaDeLogin.safeParse({ email: '  JOANA@Exemplo.COM  ', senha: 'x' })
    expect(r.success && r.data.email).toBe('joana@exemplo.com')
  })

  it('recusa e-mail malformado no campo de e-mail', () => {
    const r = schemaDeLogin.safeParse({ email: 'nao-e-email', senha: 'x' })
    expect(erroDe(r, 'email')).toBe('Informe um e-mail válido')
  })

  it('exige senha, mas não impõe tamanho mínimo no login', () => {
    expect(erroDe(schemaDeLogin.safeParse({ email: 'a@b.co', senha: '' }), 'senha')).toBe(
      'Informe sua senha',
    )
    // Uma senha curta é aceita: exigir o mínimo aqui rejeitaria senha legítima
    // anterior à regra e informaria a política a quem ainda não tem conta.
    expect(schemaDeLogin.safeParse({ email: 'a@b.co', senha: 'abc' }).success).toBe(true)
  })
})

describe('schemaDeCadastro', () => {
  it('aceita um cadastro completo', () => {
    expect(schemaDeCadastro.safeParse(cadastroValido).success).toBe(true)
  })

  it('exige nome completo', () => {
    const r = schemaDeCadastro.safeParse({ ...cadastroValido, nomeCompleto: '   ' })
    expect(erroDe(r, 'nomeCompleto')).toBe('Informe seu nome completo')
  })

  it('limita o nome a 120 caracteres, casando com a constraint de profiles', () => {
    const r = schemaDeCadastro.safeParse({ ...cadastroValido, nomeCompleto: 'n'.repeat(121) })
    expect(erroDe(r, 'nomeCompleto')).toBe('O nome pode ter no máximo 120 caracteres')
    expect(
      schemaDeCadastro.safeParse({ ...cadastroValido, nomeCompleto: 'n'.repeat(120) }).success,
    ).toBe(true)
  })

  it('exige oito caracteres de senha', () => {
    const curta = { ...cadastroValido, senha: '1234567', confirmacaoDeSenha: '1234567' }
    expect(erroDe(schemaDeCadastro.safeParse(curta), 'senha')).toBe(
      'A senha precisa de ao menos 8 caracteres',
    )
    const exata = { ...cadastroValido, senha: '12345678', confirmacaoDeSenha: '12345678' }
    expect(schemaDeCadastro.safeParse(exata).success).toBe(true)
  })

  it('reporta a divergência no campo de confirmação, e não no de senha', () => {
    const r = schemaDeCadastro.safeParse({ ...cadastroValido, confirmacaoDeSenha: 'outra-coisa' })
    expect(erroDe(r, 'confirmacaoDeSenha')).toBe('A confirmação não confere com a senha')
    expect(erroDe(r, 'senha')).toBeUndefined()
  })

  it('reporta a divergência mesmo com outro campo inválido', () => {
    const r = schemaDeCadastro.safeParse({
      ...cadastroValido,
      nomeCompleto: '',
      confirmacaoDeSenha: 'outra-coisa',
    })
    expect(erroDe(r, 'nomeCompleto')).toBe('Informe seu nome completo')
    expect(erroDe(r, 'confirmacaoDeSenha')).toBe('A confirmação não confere com a senha')
  })

  // Este é o efeito real do `when`, medido: com a senha curta, o erro da
  // confirmação é suprimido, porque o consultor vai reescrever o campo inteiro
  // de qualquer forma. Remover o `when` faz os dois erros aparecerem juntos.
  it('cala o erro de confirmação enquanto a própria senha for inválida', () => {
    const r = schemaDeCadastro.safeParse({
      ...cadastroValido,
      senha: 'curta',
      confirmacaoDeSenha: 'diferente',
    })
    expect(erroDe(r, 'senha')).toBe('A senha precisa de ao menos 8 caracteres')
    expect(erroDe(r, 'confirmacaoDeSenha')).toBeUndefined()
  })
})

describe('schemaDeRecuperacao', () => {
  it('aceita e normaliza o e-mail', () => {
    const r = schemaDeRecuperacao.safeParse({ email: ' Joana@Exemplo.com ' })
    expect(r.success && r.data.email).toBe('joana@exemplo.com')
  })

  it('recusa e-mail malformado', () => {
    expect(erroDe(schemaDeRecuperacao.safeParse({ email: 'x' }), 'email')).toBe(
      'Informe um e-mail válido',
    )
  })
})

describe('schemaDeNovaSenha', () => {
  it('aceita senha e confirmação iguais', () => {
    expect(
      schemaDeNovaSenha.safeParse({ senha: 'senha-nova-123', confirmacaoDeSenha: 'senha-nova-123' })
        .success,
    ).toBe(true)
  })

  it('reporta divergência no campo de confirmação', () => {
    const r = schemaDeNovaSenha.safeParse({ senha: 'senha-nova-123', confirmacaoDeSenha: 'outra' })
    expect(erroDe(r, 'confirmacaoDeSenha')).toBe('A confirmação não confere com a senha')
  })

  it('exige oito caracteres', () => {
    const r = schemaDeNovaSenha.safeParse({ senha: '1234567', confirmacaoDeSenha: '1234567' })
    expect(erroDe(r, 'senha')).toBe('A senha precisa de ao menos 8 caracteres')
  })
})

describe('schemaDePerfil', () => {
  it('reduz o telefone a dígitos, como o banco o guarda', () => {
    const r = schemaDePerfil.safeParse({ nomeCompleto: 'Joana', telefone: '(11) 98765-4321' })
    expect(r.success && r.data.telefone).toBe('11987654321')
  })

  it('converte telefone vazio em indefinido, para a coluna receber nulo', () => {
    const r = schemaDePerfil.safeParse({ nomeCompleto: 'Joana', telefone: '   ' })
    expect(r.success).toBe(true)
    expect(r.success && r.data.telefone).toBeUndefined()
  })

  it('recusa telefone com menos de 8 dígitos', () => {
    const r = schemaDePerfil.safeParse({ nomeCompleto: 'Joana', telefone: '1234567' })
    expect(erroDe(r, 'telefone')).toBe('O telefone precisa ter entre 8 e 20 dígitos')
  })

  it('recusa telefone com mais de 20 dígitos', () => {
    const r = schemaDePerfil.safeParse({ nomeCompleto: 'Joana', telefone: '9'.repeat(21) })
    expect(erroDe(r, 'telefone')).toBe('O telefone precisa ter entre 8 e 20 dígitos')
  })

  it('aceita perfil sem telefone', () => {
    expect(schemaDePerfil.safeParse({ nomeCompleto: 'Joana' }).success).toBe(true)
  })
})
