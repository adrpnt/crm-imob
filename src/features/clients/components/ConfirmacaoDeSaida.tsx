import { useBlocker } from 'react-router'

import { Botao } from '../../../components/ui/Botao'
import { Dialogo } from '../../../components/ui/Dialogo'

type Props = {
  /**
   * Há alterações pendentes?
   *
   * É função, e não booleano, porque a resposta é lida no instante da
   * navegação. Salvar termina com um `navigate` no mesmo passo em que a tela
   * marca que concluiu, e um booleano ainda traria o valor do render anterior —
   * o consultor veria "sair sem salvar?" logo depois de salvar com sucesso.
   */
  temAlteracoes: () => boolean
}

/**
 * Pede confirmação antes de descartar alterações não salvas (CLNT-06).
 *
 * Liga o `useBlocker` do React Router ao `Dialogo`: o hook segura a navegação e
 * devolve `proceed()` e `reset()`, e o diálogo faz a pergunta com foco
 * confinado. Cancelar é o foco padrão, aqui como na exclusão — a opção segura é
 * a que está sob o dedo quando o diálogo abre.
 *
 * **Limite medido na fase Design**: `useBlocker` intercepta apenas navegação
 * dentro da aplicação. Recarregar a página e fechar a aba passam direto, e o
 * spec registra isso como limite conhecido. Fechar a lacuna exigiria um
 * `beforeunload`, que atrapalha o teste ponta a ponta e não foi pedido.
 */
export function ConfirmacaoDeSaida({ temAlteracoes }: Props) {
  const bloqueio = useBlocker(temAlteracoes)

  return (
    <Dialogo
      aberto={bloqueio.state === 'blocked'}
      titulo="Sair sem salvar?"
      descricao="As alterações feitas neste formulário serão perdidas."
      rotuloDeCancelar="Continuar editando"
      aoFechar={() => bloqueio.reset?.()}
    >
      <Botao variante="destrutiva" onClick={() => bloqueio.proceed?.()}>
        Descartar alterações
      </Botao>
    </Dialogo>
  )
}
