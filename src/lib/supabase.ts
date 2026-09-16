import { createClient } from '@supabase/supabase-js'

import type { Database } from '../types/database.types'
import { env } from './env'

/**
 * Instância única do cliente Supabase, tipada pelo schema gerado.
 *
 * Lê de `env`, nunca de `import.meta.env`: é o que impede contornar a
 * validação de FND-03. Toda feature importa daqui em vez de criar o próprio
 * cliente, para que exista uma única sessão a ser observada e limpa.
 *
 * A chave usada aqui é a publicável. A segurança não vem dela: vem das
 * políticas de RLS (AD-001).
 */
export const opcoesDoCliente = {
  auth: {
    /**
     * A sessão sobrevive ao recarregamento, gravada no armazenamento local.
     * É o que cumpre o AUTH-05: reabrir a aplicação não pede credenciais de novo.
     */
    persistSession: true,
    /**
     * O token é renovado em segundo plano enquanto o de atualização valer.
     * É o AUTH-12 AC5. Sem isto o consultor seria deslogado no meio do trabalho
     * quando o token de acesso expirasse, tipicamente em uma hora.
     */
    autoRefreshToken: true,
    /**
     * O token do link de recuperação é lido da URL na construção do cliente.
     * Desligar isto quebraria o fluxo de redefinição por completo.
     */
    detectSessionInUrl: true,
  },
} as const

/**
 * As opções acima são explícitas embora coincidam com os padrões da biblioteca.
 *
 * Implícitas, elas eram indetectáveis: a verificação independente desligou a
 * renovação automática de token e nenhum dos cinco gates reclamou. Explícitas,
 * viram contrato — e o teste ao lado falha se alguma delas mudar.
 */
export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  opcoesDoCliente,
)
