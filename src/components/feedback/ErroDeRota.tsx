import { useEffect } from 'react'
import { useRouteError } from 'react-router'

import { registrarErroDoCliente } from '../../lib/error-log'
import { TelaDeErro } from './TelaDeErro'

function comoErro(valor: unknown): Error {
  if (valor instanceof Error) return valor
  return new Error(typeof valor === 'string' ? valor : JSON.stringify(valor))
}

/**
 * Fronteira de erro das rotas.
 *
 * Sem ela, uma exceção dentro de uma rota é capturada pela fronteira padrão do
 * React Router, que mostra a tela genérica da biblioteca e não registra nada.
 * Como quase todo erro do produto vai acontecer dentro de uma rota, é aqui que
 * o FND-16 realmente se cumpre.
 */
export function ErroDeRota() {
  const erro = useRouteError()

  useEffect(() => {
    void registrarErroDoCliente(comoErro(erro), globalThis.location?.pathname ?? '')
  }, [erro])

  return <TelaDeErro />
}
