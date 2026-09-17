import { z } from 'zod'

/**
 * Validação do formulário de cliente.
 *
 * Cada limite daqui tem contraparte em uma constraint de
 * `supabase/migrations/20260915175043_clients.sql`: o banco é a autoridade
 * final (AD-001), e o schema existe para que o consultor veja o erro no campo
 * em vez de receber uma recusa crua do PostgREST.
 *
 * Os nomes dos campos são os das colunas de `clients` porque são termos de
 * schema, e é o que permite ao serviço enviar o payload sem uma camada de
 * tradução no meio.
 */

const MIN_NOME = 2
const MAX_NOME = 120
const MAX_EMAIL = 254
const MIN_DIGITOS = 8
const MAX_DIGITOS = 20
const MAX_REGIAO = 80
const MAX_RENDA = 99999999.99

/**
 * Mesma forma do check `clients_email_format`: sem espaços, um arroba e ponto
 * no domínio. Deliberadamente igual ao banco, e não mais estrita — recusar na
 * tela um e-mail que a coluna aceitaria confundiria mais do que ajudaria.
 */
const FORMATO_DE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const VALORES_DE_STATUS = ['lead', 'contacted', 'qualified', 'client', 'inactive'] as const
const VALORES_DE_ORIGEM = [
  'indication',
  'instagram',
  'website',
  'whatsapp',
  'portal',
  'other',
] as const
const VALORES_DE_TIPO_DE_RENDA = ['formal', 'informal', 'mixed'] as const

type ValorDeStatus = (typeof VALORES_DE_STATUS)[number]
type ValorDeOrigem = (typeof VALORES_DE_ORIGEM)[number]
type ValorDeTipoDeRenda = (typeof VALORES_DE_TIPO_DE_RENDA)[number]

const ROTULOS_DE_STATUS: Record<ValorDeStatus, string> = {
  lead: 'Lead',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  client: 'Cliente',
  inactive: 'Inativo',
}

const ROTULOS_DE_ORIGEM: Record<ValorDeOrigem, string> = {
  indication: 'Indicação',
  instagram: 'Instagram',
  website: 'Site',
  whatsapp: 'WhatsApp',
  portal: 'Portal',
  other: 'Outro',
}

const ROTULOS_DE_TIPO_DE_RENDA: Record<ValorDeTipoDeRenda, string> = {
  formal: 'Formal',
  informal: 'Informal',
  mixed: 'Mista',
}

/**
 * Pares de valor e rótulo das três seleções (CLNT-03).
 *
 * O valor é o que o check do banco aceita; o rótulo é o que o consultor lê.
 * Derivados da mesma lista que alimenta o schema, para que acrescentar uma
 * origem não exija editar dois lugares e arriscar a divergência.
 */
export const STATUS = VALORES_DE_STATUS.map((valor) => ({
  valor,
  rotulo: ROTULOS_DE_STATUS[valor],
}))

export const ORIGENS = VALORES_DE_ORIGEM.map((valor) => ({
  valor,
  rotulo: ROTULOS_DE_ORIGEM[valor],
}))

export const TIPOS_DE_RENDA = VALORES_DE_TIPO_DE_RENDA.map((valor) => ({
  valor,
  rotulo: ROTULOS_DE_TIPO_DE_RENDA[valor],
}))

/**
 * Nome aparado e com espaços internos colapsados antes de medir o limite.
 *
 * O trigger `clients_normalize` faz isso no banco antes de o check rodar, de
 * modo que `" a "` tem um caractere para a constraint. Medir o valor bruto
 * aqui aceitaria na tela o que a coluna recusa.
 */
const nome = z
  .string()
  .transform((valor) => valor.trim().replace(/\s+/g, ' '))
  .refine((valor) => valor.length >= MIN_NOME, {
    error: `O nome precisa de ao menos ${MIN_NOME} caracteres`,
  })
  .refine((valor) => valor.length <= MAX_NOME, {
    error: `O nome pode ter no máximo ${MAX_NOME} caracteres`,
  })

/** Vazio vira indefinido, para que a coluna receba nulo em vez de string vazia. */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .refine((valor) => valor === '' || FORMATO_DE_EMAIL.test(valor), {
    error: 'Informe um e-mail válido',
  })
  .refine((valor) => valor.length <= MAX_EMAIL, {
    error: `O e-mail pode ter no máximo ${MAX_EMAIL} caracteres`,
  })
  .transform((valor) => (valor === '' ? undefined : valor))

/** Entra com máscara, sai só com dígitos: é assim que a coluna guarda. */
const telefone = z
  .string()
  .transform((valor) => valor.replace(/\D/g, ''))
  .refine(
    (digitos) => digitos === '' || (digitos.length >= MIN_DIGITOS && digitos.length <= MAX_DIGITOS),
    {
      error: `O telefone precisa ter entre ${MIN_DIGITOS} e ${MAX_DIGITOS} dígitos`,
    },
  )
  .transform((digitos) => (digitos === '' ? undefined : digitos))

const regiao = z
  .string()
  .transform((valor) => valor.trim().replace(/\s+/g, ' '))
  .refine((valor) => valor.length <= MAX_REGIAO, {
    error: `A região pode ter no máximo ${MAX_REGIAO} caracteres`,
  })
  .transform((valor) => (valor === '' ? undefined : valor))

/**
 * Renda chega como número: a conversão do texto digitado acontece antes, em
 * `formato.ts`. Os limites são os do check `clients_income_range`.
 */
const renda = z
  .number({ error: 'Informe a renda em números' })
  .min(0, { error: 'A renda não pode ser negativa' })
  .max(MAX_RENDA, { error: 'A renda pode ser no máximo 99.999.999,99' })

export const schemaDeCliente = z.object({
  name: nome,
  email: email.optional(),
  phone: telefone.optional(),
  // `lead` pré-selecionado (CLNT-03 AC5): um lead novo é o caso comum.
  status: z.enum(VALORES_DE_STATUS, { error: 'Escolha um status da lista' }).default('lead'),
  source: z.enum(VALORES_DE_ORIGEM, { error: 'Escolha uma origem da lista' }).optional(),
  region: regiao.optional(),
  income: renda.optional(),
  income_type: z
    .enum(VALORES_DE_TIPO_DE_RENDA, { error: 'Escolha um tipo de renda da lista' })
    .optional(),
})

/**
 * Entrada e saída são tipos distintos onde há transformação: o telefone entra
 * com máscara e sai só com dígitos, e `status` pode faltar na entrada porque
 * tem padrão. O React Hook Form governa o formulário com o tipo de entrada e
 * entrega ao serviço o tipo de saída.
 */
export type EntradaDeCliente = z.input<typeof schemaDeCliente>
export type DadosDeCliente = z.output<typeof schemaDeCliente>
