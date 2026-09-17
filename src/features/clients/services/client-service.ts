import { supabase } from '../../../lib/supabase'
import type { Database } from '../../../types/database.types'
import { padroesDeBusca } from '../busca'
import type { FiltrosDeClientes } from '../filtros'

export type Cliente = Database['public']['Tables']['clients']['Row']

/** Tamanho da página fixado pelo CLNT-07 AC1. */
export const POR_PAGINA = 20

/**
 * Chaves de consulta compartilhadas.
 *
 * Exportadas do serviço, como `CHAVE_DO_PERFIL`: é o que faz uma invalidação
 * alcançar todos os consumidores. `CHAVE_DE_CLIENTES` é prefixo da listagem e
 * das regiões, de modo que uma escrita invalida as duas de uma vez; a ficha
 * tem chave própria, invalidada por identificador.
 */
export const CHAVE_DE_CLIENTES = ['clients'] as const
export const CHAVE_DE_REGIOES = ['clients', 'regioes'] as const

export function chaveDaListagem(filtros: FiltrosDeClientes) {
  return ['clients', filtros] as const
}

export function chaveDoCliente(id: string) {
  return ['cliente', id] as const
}

export type PaginaDeClientes = { clientes: Cliente[]; total: number }

/**
 * Um valor dentro do `or=` do PostgREST precisa de aspas quando contém
 * vírgula, parêntese ou espaço, que são separadores da própria expressão —
 * sem elas, um termo como "(11) 98765" quebra a consulta e a busca por
 * telefone não devolve nada. A contrabarra e a aspa dentro do valor vão
 * escapadas. Medido contra a pilha local: o escape de curinga sobrevive às
 * aspas, com controle negativo (o padrão de `%` literal não casa onde não
 * existe `%`).
 */
function entreAspas(padrao: string): string {
  return `"${padrao.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Monta a consulta com busca e filtros, sem ordenação nem intervalo.
 *
 * Existe para que a contagem de recuperação e a consulta da página apliquem
 * exatamente os mesmos filtros: duas listas de filtros divergentes daria um
 * total que não corresponde às linhas.
 *
 * `owner_id` não aparece em filtro algum de propósito. A política de RLS já
 * restringe as linhas (AD-001); repetir a regra aqui daria a impressão falsa
 * de que é o filtro que protege, e um dia alguém o removeria por engano.
 */
function selecionarClientes(
  filtros: FiltrosDeClientes,
  opcoes: { count: 'exact'; head?: boolean },
) {
  let consulta = supabase.from('clients').select('*', opcoes)

  // A busca é um `ilike` sobre a coluna gerada `search_text`, coberta pelo
  // índice trigram. Um `.or()` de três colunas não usaria índice nenhum; o
  // segundo padrão, quando existe, é o do telefone sobre a MESMA coluna.
  const padroes = padroesDeBusca(filtros.busca)
  if (padroes.length === 1) {
    consulta = consulta.ilike('search_text', padroes[0])
  } else if (padroes.length > 1) {
    consulta = consulta.or(
      padroes.map((padrao) => `search_text.ilike.${entreAspas(padrao)}`).join(','),
    )
  }

  // E lógico com a busca, que é a leitura natural de "leads da Zona Sul".
  if (filtros.status !== null) consulta = consulta.eq('status', filtros.status)
  if (filtros.origem !== null) consulta = consulta.eq('source', filtros.origem)
  if (filtros.regiao !== null) consulta = consulta.eq('region', filtros.regiao)

  return consulta
}

/**
 * Lista a página corrente da carteira, com o total que satisfaz os filtros.
 *
 * Um único request no caminho normal: `count: 'exact'` junto do `.range()`
 * devolve linhas e total na mesma resposta, que é o que o CLNT-07 AC1 e AC11
 * pedem sem duas idas ao servidor.
 */
export async function listarClientes(filtros: FiltrosDeClientes): Promise<PaginaDeClientes> {
  const primeira = (filtros.page - 1) * POR_PAGINA

  const { data, error, count } = await selecionarClientes(filtros, { count: 'exact' })
    .order(filtros.sort, { ascending: filtros.order === 'asc' })
    .range(primeira, primeira + POR_PAGINA - 1)

  if (error) {
    // Medido contra a pilha local: quando o início do intervalo passa do total,
    // o PostgREST responde 416 com `PGRST103` e sem total. Uma URL com `page=5`
    // numa carteira de três é fácil de produzir, e derrubar a tela por isso
    // seria desproporcional — o edge case do spec pede a última página
    // existente, e para calculá-la a listagem precisa do total.
    if (error.code === 'PGRST103') {
      const contagem = await selecionarClientes(filtros, { count: 'exact', head: true })
      if (contagem.error) throw contagem.error
      return { clientes: [], total: contagem.count ?? 0 }
    }
    throw error
  }

  return { clientes: data, total: count ?? 0 }
}

/**
 * Lê um cliente pelo identificador.
 *
 * Propaga o erro em vez de devolver um cliente fabricado: a RLS filtra a linha
 * de outro dono, e o `.single()` falha. É a ficha que traduz isso em "cliente
 * não encontrado" (CLNT-14 AC2), sem revelar se o registro existe.
 */
export async function buscarCliente(id: string): Promise<Cliente> {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

/**
 * Regiões que o próprio consultor já usou, para alimentar o filtro (CLNT-04).
 *
 * Agrupadas por caixa: "Zona Sul" e "zona sul" são a mesma região (AD-009), e
 * apareceriam como duas opções idênticas ao olho. O empate dentro do grupo é
 * resolvido pela grafia com maiúscula, que é como um nome de região se
 * escreve — e por ser regra fixa, a opção não troca de forma a cada consulta
 * conforme a ordem em que as linhas voltaram.
 */
export async function listarRegioes(): Promise<string[]> {
  const { data, error } = await supabase.from('clients').select('region')
  if (error) throw error

  const porCaixa = new Map<string, string>()
  for (const { region } of data) {
    if (region === null) continue
    const chave = region.toLowerCase()
    const atual = porCaixa.get(chave)
    if (atual === undefined || region.localeCompare(atual, 'pt-BR', { caseFirst: 'upper' }) < 0) {
      porCaixa.set(chave, region)
    }
  }

  return [...porCaixa.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
