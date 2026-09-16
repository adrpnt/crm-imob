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

const nomeCompleto = z
  .string()
  .trim()
  .min(1, { error: 'Informe seu nome completo' })
  .max(MAX_NOME, { error: `O nome pode ter no máximo ${MAX_NOME} caracteres` })

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
 * Confere se as duas senhas coincidem, reportando no campo de confirmação.
 *
 * O `when` suprime a checagem enquanto a própria senha for inválida. Medido:
 * sem ele, uma senha curta e divergente produz os dois erros ao mesmo tempo —
 * "senha curta" e "confirmação não confere" —, ruído sobre um campo que o
 * consultor vai reescrever inteiro de qualquer forma. Com ele, o erro da senha
 * aparece primeiro e o da confirmação só depois de a senha ficar válida.
 *
 * A documentação do Zod justifica o `when` por outro caso: erro de TIPO em
 * campo não relacionado impedindo o refinamento de rodar. Esse caso não ocorre
 * aqui, porque o React Hook Form sempre entrega strings. Erro de validação em
 * outro campo, ao contrário do que se poderia supor, não bloqueia nada.
 */
function confirmacaoCoincide<T extends { senha: string; confirmacaoDeSenha: string }>(
  schema: z.ZodType<T>,
) {
  return schema.refine((dados) => dados.senha === dados.confirmacaoDeSenha, {
    error: 'A confirmação não confere com a senha',
    path: ['confirmacaoDeSenha'],
    when: (carga) =>
      carga.issues.every((problema) => {
        const campo = problema.path?.[0]
        return campo !== 'senha' && campo !== 'confirmacaoDeSenha'
      }),
  })
}

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

export const schemaDeCadastro = confirmacaoCoincide(
  z.object({
    nomeCompleto,
    email,
    senha: senhaNova,
    confirmacaoDeSenha: z.string(),
  }),
)

export const schemaDeRecuperacao = z.object({ email })

export const schemaDeNovaSenha = confirmacaoCoincide(
  z.object({
    senha: senhaNova,
    confirmacaoDeSenha: z.string(),
  }),
)

export const schemaDePerfil = z.object({
  nomeCompleto,
  telefone: telefone.optional(),
})

export type DadosDeLogin = z.output<typeof schemaDeLogin>
export type DadosDeCadastro = z.output<typeof schemaDeCadastro>
export type DadosDeRecuperacao = z.output<typeof schemaDeRecuperacao>
export type DadosDeNovaSenha = z.output<typeof schemaDeNovaSenha>
export type DadosDePerfil = z.output<typeof schemaDePerfil>
