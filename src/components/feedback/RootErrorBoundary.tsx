import { Component, type ErrorInfo, type ReactNode } from 'react'

import { registrarErroDoCliente } from '../../lib/error-log'
import { TelaDeErro } from './TelaDeErro'

type Props = { children: ReactNode }
type State = { falhou: boolean }

/**
 * Fronteira de erro acima do roteador.
 *
 * Cobre o que quebra fora das rotas: provedores, o próprio RouterProvider, o
 * carregamento inicial. Erros lançados dentro de uma rota não chegam aqui — a
 * fronteira padrão do React Router os captura antes. Quem cobre aquele caso é
 * `ErroDeRota`, registrada como `ErrorBoundary` na árvore de rotas.
 *
 * O registro é disparado sem `await` e sem `catch` porque
 * `registrarErroDoCliente` nunca lança: a tela de erro não pode depender do
 * sucesso da gravação do log (FND-16).
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { falhou: false }

  static getDerivedStateFromError(): State {
    return { falhou: true }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    void registrarErroDoCliente(erro, globalThis.location?.pathname ?? '')
    console.error('[erro não tratado]', erro, info.componentStack)
  }

  render() {
    return this.state.falhou ? <TelaDeErro /> : this.props.children
  }
}
