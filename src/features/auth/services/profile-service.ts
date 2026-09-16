import { supabase } from '../../../lib/supabase'
import type { Database } from '../../../types/database.types'

export type Perfil = Database['public']['Tables']['profiles']['Row']

/**
 * Chave de consulta do perfil.
 *
 * Compartilhada entre a tela de perfil e o cabeçalho de propósito: é o que faz
 * a correção do nome aparecer no cabeçalho sem recarregar a página, porque uma
 * invalidação alcança os dois (AUTH-14 AC5).
 */
export const CHAVE_DO_PERFIL = ['perfil'] as const

/**
 * Busca o perfil do consultor autenticado.
 *
 * Sem filtro por identificador: a política de RLS já restringe a leitura ao
 * próprio registro (AD-014). Filtrar aqui repetiria no cliente uma regra que o
 * banco impõe, e daria a impressão falsa de que é o filtro que protege.
 */
export async function buscarPerfil(): Promise<Perfil> {
  const { data, error } = await supabase.from('profiles').select('*').single()
  if (error) throw error
  return data
}

export type ResultadoDaAtualizacao = { ok: true; perfil: Perfil } | { ok: false; mensagem: string }

/**
 * Atualiza nome e telefone.
 *
 * `email` não entra: a coluna está fora do grant de update (AD-008), e tentar
 * escrevê-la devolveria erro de privilégio.
 */
export async function atualizarPerfil(dados: {
  id: string
  nomeCompleto: string
  telefone?: string
}): Promise<ResultadoDaAtualizacao> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: dados.nomeCompleto, phone: dados.telefone ?? null })
    .eq('id', dados.id)
    .select('*')
    .single()

  if (error) {
    console.error('[falha ao atualizar perfil]', error)
    return { ok: false, mensagem: 'Não foi possível salvar agora. Tente de novo em instantes.' }
  }

  return { ok: true, perfil: data }
}
