import { createContext } from 'react'

import type { EstadoDeAutenticacao } from './estado'

/**
 * Separado do provedor porque o Fast Refresh do Vite exige que um módulo de
 * componente exporte apenas componentes.
 */
export const ContextoDeAutenticacao = createContext<EstadoDeAutenticacao | null>(null)
