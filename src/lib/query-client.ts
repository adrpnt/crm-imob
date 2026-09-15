import { QueryClient } from '@tanstack/react-query'

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
