import { Navigate, Outlet, useLocation } from 'react-router'

import { Carregando } from '../../../components/feedback/Carregando'
import { useAuth } from '../use-auth'

/** Única rota pública que uma sessão de recuperação ainda pode acessar. */
const ROTA_DE_REDEFINICAO = '/reset-password'

/**
 * Guarda das rotas sem sessão, simétrica à das privadas.
 *
 * A exceção da redefinição existe porque o link de recuperação **autentica** o
 * usuário: o supabase-js lê o token da URL e estabelece sessão. Sem a exceção,
 * a regra de "autenticado sai das rotas públicas" expulsaria o consultor da
 * própria tela de redefinir senha, um instante depois de ele clicar no link.
 *
 * A exceção é restrita a essa rota e a essa marca. Uma sessão de recuperação
 * não devolve acesso ao cadastro nem ao login, e uma sessão normal não abre a
 * tela de redefinição — quem já entrou não chegou ali por um link de e-mail.
 */
export function RotaPublica() {
  const { estado, emRecuperacao } = useAuth()
  const local = useLocation()

  if (estado === 'carregando') {
    return <Carregando rotulo="Verificando sua sessão" />
  }

  if (estado === 'autenticado') {
    const redefinindoSenha = emRecuperacao && local.pathname === ROTA_DE_REDEFINICAO
    if (!redefinindoSenha) {
      return <Navigate to="/clients" replace />
    }
  }

  return <Outlet />
}
