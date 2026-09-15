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
export const supabase = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
