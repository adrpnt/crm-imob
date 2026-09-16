import { Navigate, Outlet, useLocation } from 'react-router'

import { Carregando } from '../../../components/feedback/Carregando'
import { useAuth } from '../use-auth'

/**
 * Guarda das rotas que exigem sessão.
 *
 * Três estados, e o do meio é o que costuma ser esquecido: enquanto a sessão
 * está sendo resolvida, a guarda não renderiza nem o conteúdo privado nem o
 * login. Mandar para o login nesse instante faria a tela piscar a cada
 * recarregamento de quem já está autenticado — o comportamento que o PLAN §6
 * proíbe explicitamente.
 *
 * A rota pretendida é preservada inteira, com parâmetros de consulta e
 * fragmento: perder a query significaria devolver o consultor a uma listagem
 * sem os filtros que ele tinha.
 */
export function RotaProtegida() {
  const { estado } = useAuth()
  const local = useLocation()

  if (estado === 'carregando') {
    return <Carregando rotulo="Verificando sua sessão" />
  }

  if (estado === 'anonimo') {
    const pretendida = `${local.pathname}${local.search}${local.hash}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(pretendida)}`} replace />
  }

  return <Outlet />
}
