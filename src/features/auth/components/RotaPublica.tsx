import { Navigate, Outlet, useLocation } from 'react-router'

import { Carregando } from '../../../components/feedback/Carregando'
import { destinoSeguro } from '../destino'
import { useAuth } from '../use-auth'

/** Única rota pública que uma sessão de recuperação ainda pode acessar. */
const ROTA_DE_REDEFINICAO = '/reset-password'

/**
 * Guarda das rotas sem sessão, simétrica à das privadas.
 *
 * `/reset-password` é exceção total: esta guarda nunca a redireciona, qualquer
 * que seja o estado. Duas razões, e a segunda só apareceu no teste de ponta a
 * ponta.
 *
 * A primeira é o spec. O AUTH-08 AC7 manda exibir a orientação de pedir um link
 * a quem chega ali "sem sessão de recuperação" — o que inclui uma sessão comum.
 * Redirecionar esse caso contrariaria o critério; quem decide o que mostrar é a
 * própria tela, que distingue os três estados.
 *
 * A segunda é uma corrida. O link de recuperação autentica o usuário, e o
 * supabase-js emite `INITIAL_SESSION` com a sessão do link ANTES de
 * `PASSWORD_RECOVERY`. Uma guarda que decidisse pela marca veria "autenticado
 * sem marca" nesse intervalo e expulsaria o consultor da tela um instante
 * depois de ele clicar no link do e-mail.
 */
export function RotaPublica() {
  const { estado } = useAuth()
  const local = useLocation()

  if (estado === 'carregando') {
    return <Carregando rotulo="Verificando sua sessão" />
  }

  if (estado === 'autenticado' && local.pathname !== ROTA_DE_REDEFINICAO) {
    {
      // O destino pretendido precisa ser respeitado AQUI, e não só pela tela de
      // login. Quando a autenticação conclui, o evento de sessão chega antes de
      // a tela navegar, e esta guarda redireciona primeiro: sem ler o parâmetro,
      // ela mandaria para o CRM e descartaria a rota que o consultor pediu.
      const destino = destinoSeguro(new URLSearchParams(local.search).get('redirect'))
      return <Navigate to={destino} replace />
    }
  }

  return <Outlet />
}
