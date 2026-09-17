import type { ChangeEvent } from 'react'
import { useSearchParams } from 'react-router'

import { Botao } from '../../../components/ui/Botao'
import { Selecao } from '../../../components/ui/Selecao'
import { PADROES, escreverFiltros, lerFiltros, type FiltrosDeClientes } from '../filtros'
import { useRegioes } from '../hooks/leitura'
import { ORIGENS, STATUS } from '../schemas'

/**
 * Lê os filtros da URL e devolve a função que os altera navegando.
 *
 * Não é exportado: o arquivo publica componentes, e é assim que o recarregamento
 * rápido do Vite continua funcionando. Os dois componentes daqui compartilham a
 * mesma leitura porque os dois escrevem na mesma fonte única (AD-015).
 *
 * Toda alteração volta para a primeira página (AC8). Manter a página 3 ao
 * filtrar costuma render uma lista vazia sem explicação aparente.
 */
function useFiltrosDaUrl() {
  const [parametros, definirParametros] = useSearchParams()

  function aplicar(mudanca: Partial<FiltrosDeClientes>) {
    definirParametros((anteriores) =>
      escreverFiltros({ ...lerFiltros(anteriores), ...mudanca, page: PADROES.page }),
    )
  }

  return { filtros: lerFiltros(parametros), aplicar }
}

/** A opção vazia significa "sem este filtro", e o filtro ausente é nulo. */
function escolhido(evento: ChangeEvent<HTMLSelectElement>): string | null {
  return evento.target.value === '' ? null : evento.target.value
}

/**
 * Limpa busca e filtros, preservando a ordenação escolhida.
 *
 * É componente, e não função exportada, porque o estado de busca sem resultado
 * (CLNT-13 AC14) precisa oferecer a mesma ação que o painel — e um arquivo de
 * componentes que exporta função quebra o recarregamento rápido.
 *
 * A ordenação fica: ela não é um filtro, e desfazê-la junto obrigaria o
 * consultor a reescolher "por nome" toda vez que uma busca não achasse nada.
 */
export function BotaoDeLimparFiltros() {
  const { aplicar } = useFiltrosDaUrl()

  return (
    <Botao
      variante="secundaria"
      onClick={() => aplicar({ busca: '', status: null, origem: null, regiao: null })}
    >
      Limpar filtros
    </Botao>
  )
}

/**
 * Filtros de status, origem e região da listagem (CLNT-09, CLNT-04).
 *
 * As três seleções são controladas pela URL, sem estado local: o valor exibido
 * é o que `lerFiltros` devolveu, e mudar uma delas é navegar (AD-015). Os três
 * combinam entre si e com a busca por E lógico, que é o que o serviço monta.
 *
 * As regiões são as que o próprio consultor já cadastrou (AC5); a ordenação
 * alfabética vem de `listarRegioes`, que agrupa as variações de caixa.
 *
 * O painel não se esconde em tela estreita: `flex-wrap` deixa as seleções
 * caírem para a linha de baixo em vez de sumirem (AC10).
 */
export function PainelDeFiltros() {
  const { filtros, aplicar } = useFiltrosDaUrl()
  const regioes = useRegioes()

  return (
    <div role="group" aria-label="Filtros" className="flex flex-wrap items-end gap-3">
      <Selecao
        rotulo="Status"
        opcoes={STATUS}
        opcaoVazia="Todos"
        value={filtros.status ?? ''}
        onChange={(evento) => aplicar({ status: escolhido(evento) })}
      />

      <Selecao
        rotulo="Origem"
        opcoes={ORIGENS}
        opcaoVazia="Todas"
        value={filtros.origem ?? ''}
        onChange={(evento) => aplicar({ origem: escolhido(evento) })}
      />

      <Selecao
        rotulo="Região"
        opcoes={(regioes.data ?? []).map((regiao) => ({ valor: regiao, rotulo: regiao }))}
        opcaoVazia="Todas"
        value={filtros.regiao ?? ''}
        onChange={(evento) => aplicar({ regiao: escolhido(evento) })}
      />

      <BotaoDeLimparFiltros />
    </div>
  )
}
