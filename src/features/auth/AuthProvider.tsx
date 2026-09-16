import { useEffect, useState, type ReactNode } from 'react'

import { queryClient } from '../../lib/query-client'
import { supabase } from '../../lib/supabase'
import { ContextoDeAutenticacao } from './auth-context'
import { ANONIMO, CARREGANDO, autenticado, type EstadoDeAutenticacao } from './estado'

/**
 * Se `INITIAL_SESSION` não chegar neste prazo, o estado resolve para anônimo.
 *
 * O evento lê o armazenamento local e é praticamente instantâneo. Ele só não
 * chega quando o armazenamento está bloqueado — e sem este limite a guarda
 * ficaria presa em `carregando` para sempre, com a tela em branco.
 */
const LIMITE_DA_SESSAO_INICIAL_MS = 5_000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoDeAutenticacao>(CARREGANDO)

  useEffect(() => {
    // O `clearTimeout` no topo do callback é o que impede este limite de
    // sobrescrever um estado já resolvido. Uma guarda adicional sobre o estado
    // atual seria redundância morta: com o cancelamento presente ela nunca
    // seria alcançada, e remover uma das duas passaria despercebido.
    const limite = setTimeout(() => setEstado(ANONIMO), LIMITE_DA_SESSAO_INICIAL_MS)

    // ATENÇÃO: este callback é deliberadamente síncrono.
    //
    // Uma chamada assíncrona aqui dentro pode travar o cliente inteiro: o
    // supabase-js aguarda os handlers em ordem, e um guia de troubleshooting
    // oficial descreve deadlock em que todas as chamadas seguintes deixam de
    // retornar. A documentação da API diz o contrário, então adotamos a leitura
    // conservadora. Buscar perfil ou qualquer dado é trabalho do TanStack
    // Query, disparado pela mudança de estado — nunca daqui.
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      clearTimeout(limite)

      if (evento === 'SIGNED_OUT' || !sessao) {
        queryClient.clear()
        setEstado(ANONIMO)
        return
      }

      if (evento === 'PASSWORD_RECOVERY') {
        setEstado(autenticado(sessao, true))
        return
      }

      // updateUser concluído: se veio de uma redefinição, a marca de
      // recuperação perde a razão de existir.
      if (evento === 'USER_UPDATED') {
        setEstado(autenticado(sessao, false))
        return
      }

      // INITIAL_SESSION, SIGNED_IN e TOKEN_REFRESHED preservam a marca: durante
      // a recuperação o token é renovado, e perdê-la expulsaria o consultor da
      // tela de redefinir senha.
      setEstado((atual) => autenticado(sessao, atual.emRecuperacao))
    })

    return () => {
      clearTimeout(limite)
      data.subscription.unsubscribe()
    }
  }, [])

  return (
    <ContextoDeAutenticacao.Provider value={estado}>{children}</ContextoDeAutenticacao.Provider>
  )
}
