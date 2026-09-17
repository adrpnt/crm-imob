import { useId, type ComponentProps } from 'react'

import { Campo } from './Campo'

type Props = Omit<ComponentProps<typeof Campo>, 'list'> & {
  /** Valores já usados pelo consultor, oferecidos como atalho. */
  sugestoes: readonly string[]
}

/**
 * Campo de texto que oferece valores já usados sem fechar a lista.
 *
 * É o campo de região (CLNT-04). O AD-009 decidiu que região é texto livre: as
 * regiões de um corretor são hiperlocais e mudam com a carteira, então a lista
 * é um atalho para o que ele já cadastrou, nunca um conjunto fechado. Digitar
 * uma região nova precisa continuar funcionando, e é isso que separa este
 * campo de uma `Selecao`.
 *
 * O controle é um `input` com `datalist` nativo: já vem operável por teclado,
 * anunciado pelo leitor de tela, e aceita valor fora da lista por definição.
 * Uma lista construída à mão teria de reimplementar as três coisas.
 */
export function CampoComSugestoes({ sugestoes, ...props }: Props) {
  const idDaLista = `${useId()}-sugestoes`

  return (
    <>
      <Campo list={idDaLista} {...props} />
      <datalist id={idDaLista}>
        {sugestoes.map((sugestao) => (
          <option key={sugestao} value={sugestao} />
        ))}
      </datalist>
    </>
  )
}
