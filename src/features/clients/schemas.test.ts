import { describe, expect, it } from 'vitest'

import { ORIGENS, schemaDeCliente, STATUS, TIPOS_DE_RENDA } from './schemas'

const NOME = 'Joana Silva'

type Resultado = ReturnType<typeof schemaDeCliente.safeParse>

function analisar(campos: Record<string, unknown> = {}): Resultado {
  return schemaDeCliente.safeParse({ name: NOME, ...campos })
}

/** Mensagem do campo, que é o que a tela exibe abaixo dele (CLNT-18 AC5). */
function mensagemDe(resultado: Resultado, campo: string): string | undefined {
  if (resultado.success) return undefined
  return resultado.error.issues.find((problema) => problema.path[0] === campo)?.message
}

describe('nome', () => {
  // Premissa do spec: só o nome é obrigatório, e `status` cai para lead.
  it('aceita um cadastro com apenas o nome e aplica lead como status', () => {
    const resultado = analisar()

    expect(resultado.success).toBe(true)
    expect(resultado.data).toEqual({ name: NOME, status: 'lead' })
  })

  // CLNT-01 AC2: nome vazio ou com menos de 2 caracteres é erro de campo.
  it('recusa nome vazio ou de um caractere, com a mensagem do mínimo', () => {
    expect(mensagemDe(analisar({ name: '' }), 'name')).toBe(
      'O nome precisa de ao menos 2 caracteres',
    )
    expect(mensagemDe(analisar({ name: 'J' }), 'name')).toBe(
      'O nome precisa de ao menos 2 caracteres',
    )
  })

  it('aceita nome de dois caracteres, que é o limite do check', () => {
    expect(analisar({ name: 'Jo' }).success).toBe(true)
  })

  it('aceita 120 caracteres e recusa 121, como clients_name_length', () => {
    expect(analisar({ name: 'a'.repeat(120) }).success).toBe(true)
    expect(mensagemDe(analisar({ name: 'a'.repeat(121) }), 'name')).toBe(
      'O nome pode ter no máximo 120 caracteres',
    )
  })

  // O trigger `clients_normalize` apara e colapsa antes de o check rodar, então
  // " J " tem um caractere para a constraint. Medir o valor bruto aqui aceitaria
  // na tela o que a coluna recusa.
  it('apara e colapsa espaços antes de medir o limite', () => {
    expect(analisar({ name: '  Joana   Silva  ' }).data?.name).toBe('Joana Silva')
    expect(mensagemDe(analisar({ name: '  J  ' }), 'name')).toBe(
      'O nome precisa de ao menos 2 caracteres',
    )
  })
})

describe('e-mail', () => {
  // CLNT-01 AC3: e-mail vazio é cadastro válido.
  it('aceita e-mail vazio, gravando ausência em vez de string vazia', () => {
    const resultado = analisar({ email: '' })

    expect(resultado.success).toBe(true)
    expect(resultado.data?.email).toBeUndefined()
  })

  it('recusa formato inválido, como clients_email_format', () => {
    expect(mensagemDe(analisar({ email: 'joana' }), 'email')).toBe('Informe um e-mail válido')
    expect(mensagemDe(analisar({ email: 'joana@exemplo' }), 'email')).toBe(
      'Informe um e-mail válido',
    )
    expect(mensagemDe(analisar({ email: 'jo ana@exemplo.com' }), 'email')).toBe(
      'Informe um e-mail válido',
    )
  })

  // Baixar a caixa e aparar alinha o valor ao que o trigger gravaria.
  it('aceita e-mail válido, aparado e em minúsculas', () => {
    expect(analisar({ email: '  Joana@Exemplo.COM ' }).data?.email).toBe('joana@exemplo.com')
  })

  it('recusa e-mail acima de 254 caracteres, como clients_email_length', () => {
    const longo = `${'a'.repeat(250)}@x.com`

    expect(longo.length).toBeGreaterThan(254)
    expect(mensagemDe(analisar({ email: longo }), 'email')).toBe(
      'O e-mail pode ter no máximo 254 caracteres',
    )
  })
})

describe('telefone', () => {
  // A coluna guarda só dígitos, e é isso que faz a busca por telefone casar.
  it('aceita telefone com máscara e devolve só os dígitos', () => {
    expect(analisar({ phone: '(11) 98765-4321' }).data?.phone).toBe('11987654321')
  })

  it('recusa menos de 8 dígitos, como clients_phone_digits', () => {
    expect(mensagemDe(analisar({ phone: '1234567' }), 'phone')).toBe(
      'O telefone precisa ter entre 8 e 20 dígitos',
    )
  })

  it('aceita 20 dígitos e recusa 21', () => {
    expect(analisar({ phone: '1'.repeat(20) }).success).toBe(true)
    expect(mensagemDe(analisar({ phone: '1'.repeat(21) }), 'phone')).toBe(
      'O telefone precisa ter entre 8 e 20 dígitos',
    )
  })

  it('aceita telefone vazio, gravando ausência', () => {
    expect(analisar({ phone: '' }).data?.phone).toBeUndefined()
  })
})

describe('renda', () => {
  // CLNT-01 AC4.
  it('recusa renda negativa', () => {
    expect(mensagemDe(analisar({ income: -1 }), 'income')).toBe('A renda não pode ser negativa')
  })

  it('aceita a renda máxima do check e recusa acima dela', () => {
    expect(analisar({ income: 99999999.99 }).success).toBe(true)
    expect(mensagemDe(analisar({ income: 100000000 }), 'income')).toBe(
      'A renda pode ser no máximo 99.999.999,99',
    )
  })

  // Edge case do spec: renda e tipo de renda são opcionais e independentes.
  it('aceita renda vazia com tipo de renda preenchido', () => {
    const resultado = analisar({ income_type: 'formal' })

    expect(resultado.success).toBe(true)
    expect(resultado.data?.income).toBeUndefined()
    expect(resultado.data?.income_type).toBe('formal')
  })
})

describe('região', () => {
  it('aceita 80 caracteres e recusa 81, como clients_region_length', () => {
    expect(analisar({ region: 'a'.repeat(80) }).success).toBe(true)
    expect(mensagemDe(analisar({ region: 'a'.repeat(81) }), 'region')).toBe(
      'A região pode ter no máximo 80 caracteres',
    )
  })
})

describe('domínios de status, origem e tipo de renda', () => {
  it('recusa valor fora do check, com mensagem no campo correspondente', () => {
    expect(mensagemDe(analisar({ status: 'morto' }), 'status')).toBe('Escolha um status da lista')
    expect(mensagemDe(analisar({ source: 'tiktok' }), 'source')).toBe('Escolha uma origem da lista')
    expect(mensagemDe(analisar({ income_type: 'herança' }), 'income_type')).toBe(
      'Escolha um tipo de renda da lista',
    )
  })

  // Os valores são os dos checks clients_status_allowed, clients_source_allowed
  // e clients_income_type_allowed. Divergir daqui produz erro só em runtime.
  it('aceita todos os valores das três listas, e são exatamente os dos checks', () => {
    for (const { valor } of STATUS) expect(analisar({ status: valor }).success).toBe(true)
    for (const { valor } of ORIGENS) expect(analisar({ source: valor }).success).toBe(true)
    for (const { valor } of TIPOS_DE_RENDA) {
      expect(analisar({ income_type: valor }).success).toBe(true)
    }

    expect(STATUS.map((o) => o.valor)).toEqual([
      'lead',
      'contacted',
      'qualified',
      'client',
      'inactive',
    ])
    expect(ORIGENS.map((o) => o.valor)).toEqual([
      'indication',
      'instagram',
      'website',
      'whatsapp',
      'portal',
      'other',
    ])
    expect(TIPOS_DE_RENDA.map((o) => o.valor)).toEqual(['formal', 'informal', 'mixed'])
  })

  // CLNT-03 AC5, AC6 e AC7 nomeiam os rótulos em português que o consultor lê.
  it('rotula as três listas em português', () => {
    expect(STATUS.map((o) => o.rotulo)).toEqual([
      'Lead',
      'Contatado',
      'Qualificado',
      'Cliente',
      'Inativo',
    ])
    expect(ORIGENS.map((o) => o.rotulo)).toEqual([
      'Indicação',
      'Instagram',
      'Site',
      'WhatsApp',
      'Portal',
      'Outro',
    ])
    expect(TIPOS_DE_RENDA.map((o) => o.rotulo)).toEqual(['Formal', 'Informal', 'Mista'])
  })
})
