import { useContext } from 'react'

import { ContextoDeAutenticacao } from './auth-context'
import type { EstadoDeAutenticacao } from './estado'

/** Acesso ao estado de sessão. Falha alto fora do provedor, em vez de devolver nulo. */
export function useAuth(): EstadoDeAutenticacao {
  const estado = useContext(ContextoDeAutenticacao)
  if (estado === null) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  }
  return estado
}
