import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

import type { Database } from '../../src/types/database.types.ts'

/**
 * Credenciais do Supabase local.
 *
 * Não são segredos: o CLI deriva estas chaves de um segredo JWT fixo e
 * documentado, então elas são idênticas em toda máquina que roda
 * `supabase start`. A chave de serviço existe apenas aqui, no ambiente de
 * teste, e jamais em uma variável `VITE_*` — essas vão para o bundle.
 */
const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const SENHA = 'senha-de-teste-123'

export type Cliente = SupabaseClient<Database>

/**
 * Cliente com a chave de serviço, usado só para semear dados.
 *
 * Nunca chame métodos de `auth` nele além de `auth.admin`: um `signIn` anexaria
 * a sessão do usuário e o cliente deixaria de agir como serviço.
 */
export const admin: Cliente = createClient<Database>(URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/**
 * Falha com uma mensagem acionável quando a pilha local não responde.
 *
 * Sem isto, a suíte quebraria com um erro de rede cru, e a causa real — o
 * Supabase local não estar no ar — ficaria escondida.
 */
export async function exigirSupabaseLocal(): Promise<void> {
  try {
    const resposta = await fetch(`${URL}/auth/v1/health`, {
      headers: { apikey: ANON_KEY },
      signal: AbortSignal.timeout(3000),
    })
    if (!resposta.ok) {
      throw new Error(`respondeu ${resposta.status}`)
    }
  } catch (causa) {
    throw new Error(
      `Supabase local não respondeu em ${URL}. ` +
        `Rode 'npx supabase start' antes de 'npm run test:rls'.`,
      { cause: causa },
    )
  }
}

export type Usuario = { id: string; email: string }

/**
 * Cria um usuário confirmado com identificador único a esta execução.
 *
 * `nome` vai para os metadados do cadastro, de onde o trigger
 * handle_new_user o lê para montar o perfil. Omitir faz o nome cair para a
 * parte do e-mail antes do @, que é o outro caminho coberto pelo pgTAP.
 */
export async function criarUsuario(rotulo: string, nome?: string): Promise<Usuario> {
  const id = randomUUID()
  const email = `${rotulo}-${id}@teste.local`
  const { error } = await admin.auth.admin.createUser({
    id,
    email,
    password: SENHA,
    email_confirm: true,
    user_metadata: nome ? { full_name: nome } : undefined,
  })
  if (error) throw new Error(`falha ao criar o usuário ${rotulo}: ${error.message}`)
  return { id, email }
}

/**
 * Um cliente novo, autenticado como o usuário dado.
 *
 * Instância separada por usuário de propósito: compartilhar uma só faria a
 * sessão de um vazar para o teste do outro.
 */
export async function clienteDe(usuario: Usuario): Promise<Cliente> {
  const cliente = createClient<Database>(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await cliente.auth.signInWithPassword({ email: usuario.email, password: SENHA })
  if (error) throw new Error(`falha ao autenticar ${usuario.email}: ${error.message}`)
  return cliente
}

/** Remove os usuários criados; a cascata leva clientes, notas e logs junto. */
export async function removerUsuarios(...usuarios: Usuario[]): Promise<void> {
  for (const u of usuarios) {
    await admin.auth.admin.deleteUser(u.id)
  }
}
