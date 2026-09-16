import { z } from 'zod'

/**
 * Schemas das entradas de formulário de autenticação.
 *
 * As mensagens vivem aqui, e não nas telas: é o que garante que o mesmo erro
 * seja dito do mesmo jeito em todo lugar.
 */

const MIN_SENHA = 8
const MAX_NOME = 120

/** E-mail é aparado e convertido para minúsculas ANTES de validar o formato. */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Informe um e-mail válido' }))

const senhaNova = z
  .string()
  .min(MIN_SENHA, { error: `A senha precisa de ao menos ${MIN_SENHA} caracteres` })

/**
 * Nome aparado e com espaços internos colapsados.
 *
 * O colapso alinha `profiles.full_name` ao que o banco já faz com
 * `clients.name` pelo trigger de normalização. Sem ele, "Joana   Silva"
 * chegaria ao perfil com os três espaços, e o mesmo consultor apareceria
 * grafado de dois jeitos dependendo da tela que o cadastrou.
 */
const nomeCompleto = z
  .string()
  .transform((valor) => valor.trim().replace(/\s+/g, ' '))
  .refine((valor) => valor.length >= 1, { error: 'Informe seu nome completo' })
  .refine((valor) => valor.length <= MAX_NOME, {
    error: `O nome pode ter no máximo ${MAX_NOME} caracteres`,
  })

/**
 * Telefone entra com máscara e sai só com dígitos, porque é assim que o banco
 * o guarda e é o que faz a busca por telefone funcionar. Vazio vira indefinido
 * em vez de string vazia, para que a coluna receba nulo.
 */
const telefone = z
  .string()
  .transform((valor) => valor.replace(/\D/g, ''))
  .refine((digitos) => digitos === '' || (digitos.length >= 8 && digitos.length <= 20), {
    error: 'O telefone precisa ter entre 8 e 20 dígitos',
  })
  .transform((digitos) => (digitos === '' ? undefined : digitos))

/**
 * Opções do refinamento que compara senha e confirmação.
 *
 * Compartilhadas como objeto em vez de embrulhadas numa função genérica: uma
 * função que recebesse `z.ZodType<T>` apagaria o tipo de ENTRADA do schema,
 * porque aquele parâmetro só descreve a saída. O React Hook Form precisa dos
 * dois tipos, e sem o de entrada os campos do formulário ficam sem tipagem.
 *
 * O `when` suprime a checagem enquanto a própria senha for inválida. Medido:
 * sem ele, uma senha curta e divergente produz os dois erros ao mesmo tempo —
 * "senha curta" e "confirmação não confere" —, ruído sobre um campo que o
 * consultor vai reescrever inteiro de qualquer forma.
 *
 * A documentação do Zod justifica o `when` por outro caso: erro de TIPO em
 * campo não relacionado impedindo o refinamento de rodar. Esse caso não ocorre
 * aqui, porque o React Hook Form sempre entrega strings.
 */
const OPCOES_DA_CONFIRMACAO = {
  error: 'A confirmação não confere com a senha',
  path: ['confirmacaoDeSenha'] as PropertyKey[],
  when: (carga: { issues: { path?: PropertyKey[] }[] }) =>
    carga.issues.every((problema) => {
      const campo = problema.path?.[0]
      return campo !== 'senha' && campo !== 'confirmacaoDeSenha'
    }),
}

const senhasCoincidem = (dados: { senha: string; confirmacaoDeSenha: string }) =>
  dados.senha === dados.confirmacaoDeSenha

/**
 * No login a senha só precisa existir.
 *
 * Exigir o mínimo de caracteres aqui rejeitaria uma senha legítima criada antes
 * de a regra mudar, e informaria a política de senha a quem ainda não tem conta.
 */
export const schemaDeLogin = z.object({
  email,
  senha: z.string().min(1, { error: 'Informe sua senha' }),
})

export const schemaDeCadastro = z
  .object({
    nomeCompleto,
    email,
    senha: senhaNova,
    confirmacaoDeSenha: z.string(),
  })
  .refine(senhasCoincidem, OPCOES_DA_CONFIRMACAO)

export const schemaDeRecuperacao = z.object({ email })

export const schemaDeNovaSenha = z
  .object({
    senha: senhaNova,
    confirmacaoDeSenha: z.string(),
  })
  .refine(senhasCoincidem, OPCOES_DA_CONFIRMACAO)

export const schemaDePerfil = z.object({
  nomeCompleto,
  telefone: telefone.optional(),
})

/**
 * Entrada e saída são tipos distintos onde há transformação ou refinamento.
 *
 * O campo de telefone entra como string com máscara e sai como dígitos ou
 * indefinido; a confirmação de senha existe na entrada e some do que interessa
 * ao serviço. O React Hook Form precisa dos dois: ele governa o formulário com
 * o tipo de entrada e entrega ao envio o tipo de saída.
 */
export type EntradaDeLogin = z.input<typeof schemaDeLogin>
export type EntradaDeCadastro = z.input<typeof schemaDeCadastro>
export type EntradaDeRecuperacao = z.input<typeof schemaDeRecuperacao>
export type EntradaDeNovaSenha = z.input<typeof schemaDeNovaSenha>
export type EntradaDePerfil = z.input<typeof schemaDePerfil>

export type DadosDeLogin = z.output<typeof schemaDeLogin>
export type DadosDeCadastro = z.output<typeof schemaDeCadastro>
export type DadosDeRecuperacao = z.output<typeof schemaDeRecuperacao>
export type DadosDeNovaSenha = z.output<typeof schemaDeNovaSenha>
export type DadosDePerfil = z.output<typeof schemaDePerfil>
