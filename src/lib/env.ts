import { z } from 'zod'

/**
 * Validação das variáveis de ambiente do frontend.
 *
 * Só valores públicos do Supabase entram aqui: tudo que começa com VITE_ vai
 * para o bundle (PLAN §12). A chave de serviço nunca deve aparecer neste arquivo.
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
})

export type Env = z.infer<typeof envSchema>

/**
 * Valida a origem das variáveis e devolve o objeto tipado.
 *
 * A mensagem de erro é montada a partir do `path` de cada issue porque a
 * mensagem padrão do Zod descreve o problema sem nomear a variável — e é
 * justamente o nome que o desenvolvedor precisa ler para corrigir (FND-03).
 */
export function parseEnv(source: unknown): Env {
  const result = envSchema.safeParse(source)
  if (result.success) return result.data

  const details = result.error.issues
    .map((issue) => `${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
    .join('; ')

  throw new Error(
    `Variáveis de ambiente inválidas — ${details}. ` +
      `Copie .env.example para .env.local e preencha os valores do seu projeto Supabase.`,
  )
}

export const env = parseEnv(import.meta.env)
