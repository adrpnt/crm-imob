import { QueryCache, QueryClient } from '@tanstack/react-query'

import { marcarSessaoExpirada } from './sessao-expirada'
import { supabase } from './supabase'

/** Número de tentativas extras após a primeira falha. */
const TENTATIVAS_EXTRAS = 2

/**
 * Reconhece uma falha de autorização vinda do Supabase.
 *
 * Duas formas chegam até aqui: o PostgREST recusa uma operação barrada por
 * política ou por falta de privilégio com o SQLSTATE `42501`, e o supabase-js
 * sinaliza sessão inválida com status HTTP 401 ou 403.
 */
export function ehErroDeAutorizacao(erro: unknown): boolean {
  if (typeof erro !== 'object' || erro === null) return false

  const candidato = erro as { code?: unknown; status?: unknown }
  if (candidato.code === '42501') return true
  return candidato.status === 401 || candidato.status === 403
}

/**
 * Reconhece que a sessão deixou de valer.
 *
 * Deliberadamente mais estreita que `ehErroDeAutorizacao`: o `42501` do
 * PostgREST significa "esta linha não é sua", com sessão perfeitamente válida.
 * Inserir um cliente com `owner_id` alheio produz esse código e é comportamento
 * esperado, já coberto por teste na fundação. Tratá-lo como expiração
 * derrubaria o consultor para o login por um erro legítimo.
 *
 * Repetir a tentativa e encerrar a sessão são decisões diferentes sobre o mesmo
 * erro, e por isso são duas funções.
 */
export function ehSessaoExpirada(erro: unknown): boolean {
  if (typeof erro !== 'object' || erro === null) return false
  const candidato = erro as { status?: unknown }
  return candidato.status === 401 || candidato.status === 403
}

/**
 * Reage à falha de uma consulta.
 *
 * Exportada para ser testável diretamente, sem precisar provocar uma consulta
 * real só para observar o efeito.
 */
export function aoFalharConsulta(erro: unknown): void {
  if (!ehSessaoExpirada(erro)) return
  marcarSessaoExpirada()
  // Encerrar a sessão emite SIGNED_OUT, e é o provedor quem limpa o cache e
  // move o estado. Daqui não se mexe em estado de React.
  void supabase.auth.signOut()
}

/**
 * Decide se vale repetir uma consulta que falhou.
 *
 * Repetir uma falha de autorização é sempre inútil: a resposta não vai mudar
 * sozinha. Pior, atrasa em três tentativas a mensagem de sessão expirada que o
 * consultor precisa ver (AUTH-12).
 */
export function deveTentarDeNovo(tentativasFalhas: number, erro: unknown): boolean {
  if (ehErroDeAutorizacao(erro)) return false
  return tentativasFalhas < TENTATIVAS_EXTRAS
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: aoFalharConsulta }),
  defaultOptions: {
    queries: {
      retry: deveTentarDeNovo,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})
