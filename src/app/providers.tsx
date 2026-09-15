import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { queryClient } from '../lib/query-client'

/**
 * Provedores globais, compostos em uma ordem única e explícita.
 *
 * A feature `auth` insere o provedor de sessão aqui dentro, por dentro do
 * QueryClientProvider: a limpeza de cache na expiração de sessão precisa
 * alcançar o cliente de query (AUTH-12).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
