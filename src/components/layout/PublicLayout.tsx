import { Outlet } from 'react-router'

/**
 * Moldura das rotas sem sessão.
 *
 * Hoje abriga apenas a página de não encontrado. A feature `auth` acrescenta
 * login, cadastro e redefinição de senha por baixo dela.
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-graphite-950 px-4 py-10 text-cloud-50">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}
