import { useEffect } from 'react'
import { useSearchParams } from 'react-router'

import { Botao } from '../../../components/ui/Botao'
import { escreverFiltros, lerFiltros } from '../filtros'
import { POR_PAGINA } from '../services/client-service'

type Props = {
  /** Quantos clientes satisfazem os filtros correntes (CLNT-07 AC11). */
  total: number
}

/**
 * Total, página corrente e navegação entre páginas (CLNT-07, CLNT-10).
 *
 * A página vive na URL como o resto do estado da listagem (AD-015), então
 * avançar e voltar são navegações — o botão de voltar do navegador desfaz uma
 * paginada sem código dedicado.
 *
 * Nos limites os controles ficam inativos em vez de produzirem página
 * inválida: pedir a página 0 ou a página seguinte à última devolveria erro do
 * PostgREST por um gesto que a tela ofereceu.
 */
export function Paginacao({ total }: Props) {
  const [parametros, definirParametros] = useSearchParams()
  const pagina = lerFiltros(parametros).page
  const paginas = Math.ceil(total / POR_PAGINA)

  useEffect(() => {
    // Edge case do spec: a URL pode pedir uma página além do total, e
    // `lerFiltros` não tem como saber disso — o total só chega com a resposta.
    // A troca é `replace` para que a URL inválida não fique no histórico.
    if (total > 0 && pagina > paginas) {
      definirParametros(
        (anteriores) => escreverFiltros({ ...lerFiltros(anteriores), page: paginas }),
        { replace: true },
      )
    }
  }, [definirParametros, pagina, paginas, total])

  function irPara(destino: number) {
    definirParametros((anteriores) => escreverFiltros({ ...lerFiltros(anteriores), page: destino }))
  }

  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-silver-600">
        {total === 1 ? '1 cliente' : `${total} clientes`}
        {paginas > 1 ? ` · página ${pagina} de ${paginas}` : ''}
      </p>

      <div className="flex gap-2">
        <Botao variante="secundaria" inativo={pagina <= 1} onClick={() => irPara(pagina - 1)}>
          Anterior
        </Botao>
        <Botao variante="secundaria" inativo={pagina >= paginas} onClick={() => irPara(pagina + 1)}>
          Próxima
        </Botao>
      </div>
    </nav>
  )
}
