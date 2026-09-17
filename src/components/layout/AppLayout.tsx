import type { ReactNode } from 'react'
import { Outlet } from 'react-router'

/**
 * Moldura das rotas privadas.
 *
 * O cabeçalho reserva um espaço para a identificação do consultor e a ação de
 * sair, que a feature `auth` preenche em AUTH-15. A prop existe em vez de um
 * contexto porque rotas em data mode aceitam `element` com JSX, o que deixa a
 * composição explícita no arquivo de rotas.
 */
export function AppLayout({ acoesDoUsuario }: { acoesDoUsuario?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-graphite-900 text-cloud-50">
      <header className="border-b border-graphite-700 bg-graphite-800">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <span className="text-base font-semibold">CRM Imobiliário</span>
          <div data-testid="acoes-do-usuario" className="flex items-center gap-2">
            {acoesDoUsuario}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
