import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { Botao } from '../../../components/ui/Botao'
import { buscarPerfil, CHAVE_DO_PERFIL } from '../services/profile-service'
import { sair } from '../services/auth-service'

/**
 * Identificação do consultor e ação de sair, no espaço que o `AppLayout`
 * reserva no cabeçalho.
 *
 * Lê o perfil pela mesma chave de consulta que a tela de perfil usa. É o que
 * faz a correção do nome aparecer aqui sem recarregar a página: a tela
 * invalida a chave, e este componente refaz a leitura (AUTH-14 AC5).
 *
 * Sair não navega. Encerrar a sessão emite `SIGNED_OUT`, o provedor limpa o
 * cache e move o estado, e a guarda das rotas privadas leva ao login. Navegar
 * daqui faria a guarda pública devolver o consultor ao CRM no instante entre a
 * navegação e a chegada do evento.
 */
export function MenuDoUsuario() {
  const { data: perfil } = useQuery({ queryKey: CHAVE_DO_PERFIL, queryFn: buscarPerfil })

  return (
    <div className="flex items-center gap-3">
      {perfil ? (
        <Link to="/profile" className="text-sm font-medium text-ink">
          {perfil.full_name}
        </Link>
      ) : null}

      <Botao variante="secundaria" onClick={() => void sair()}>
        Sair
      </Botao>
    </div>
  )
}
