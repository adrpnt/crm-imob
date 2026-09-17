/**
 * Tradução entre a query string e os filtros da listagem, nas duas direções.
 *
 * A URL é a fonte única desse estado (AD-015). Manter a tradução num módulo
 * puro é o que permite testar CLNT-10 — refletir e restaurar o estado — sem
 * montar React, e é o que impede que um `useState` espelhe filtro em efeito.
 *
 * Os nomes dos parâmetros ficam em inglês porque são termos de API, alinhados
 * às colunas de `clients`; os campos do objeto ficam em português, como o
 * resto do domínio.
 */

export type OrdenacaoDeClientes = 'name' | 'created_at'

export type FiltrosDeClientes = {
  busca: string
  status: string | null
  origem: string | null
  regiao: string | null
  sort: OrdenacaoDeClientes
  order: 'asc' | 'desc'
  page: number
}

/** Mais recentes primeiro, primeira página (AD-015 e premissa de ordenação do spec). */
export const PADROES: FiltrosDeClientes = {
  busca: '',
  status: null,
  origem: null,
  regiao: null,
  sort: 'created_at',
  order: 'desc',
  page: 1,
}

const ORDENACOES: readonly string[] = ['name', 'created_at']
const DIRECOES: readonly string[] = ['asc', 'desc']

function ehOrdenacao(valor: string | null): valor is OrdenacaoDeClientes {
  return valor !== null && ORDENACOES.includes(valor)
}

function ehDirecao(valor: string | null): valor is 'asc' | 'desc' {
  return valor !== null && DIRECOES.includes(valor)
}

/** Texto aparado; vazio vira nulo, para que "sem filtro" tenha uma só forma. */
function textoOuNulo(bruto: string | null): string | null {
  const texto = (bruto ?? '').trim()
  return texto === '' ? null : texto
}

/**
 * Página inteira e maior ou igual a 1.
 *
 * Fracionária, negativa ou não numérica cai para 1 em vez de chegar ao
 * `.range()` da consulta, onde produziria erro do PostgREST por um valor que
 * qualquer pessoa consegue digitar na barra de endereço.
 */
function lerPagina(bruto: string | null): number {
  const numero = Number(bruto)
  if (!Number.isInteger(numero) || numero < 1) return PADROES.page
  return numero
}

/**
 * Lê a query string em filtros tipados.
 *
 * `sort` e `order` fora do conjunto conhecido caem no padrão: sem isso, um
 * valor inventado na URL viraria nome de coluna dentro do `.order()`.
 */
export function lerFiltros(sp: URLSearchParams): FiltrosDeClientes {
  const sort = sp.get('sort')
  const order = sp.get('order')

  return {
    // Termo só com espaços é busca vazia (edge case do spec): filtrar por ele
    // devolveria a lista inteira e o consultor veria "sem resultado" logo
    // depois de apagar o que digitou.
    busca: (sp.get('search') ?? '').trim(),
    status: textoOuNulo(sp.get('status')),
    origem: textoOuNulo(sp.get('source')),
    regiao: textoOuNulo(sp.get('region')),
    sort: ehOrdenacao(sort) ? sort : PADROES.sort,
    order: ehDirecao(order) ? order : PADROES.order,
    page: lerPagina(sp.get('page')),
  }
}

/**
 * Escreve os filtros de volta na query string, omitindo tudo que é padrão.
 *
 * Sem a omissão, abrir `/clients` sem filtro nenhum produziria uma URL com
 * sete parâmetros repetindo o padrão — ruim de ler e de compartilhar.
 */
export function escreverFiltros(f: FiltrosDeClientes): URLSearchParams {
  const sp = new URLSearchParams()
  const busca = f.busca.trim()

  if (busca !== '') sp.set('search', busca)
  if (f.status !== null) sp.set('status', f.status)
  if (f.origem !== null) sp.set('source', f.origem)
  if (f.regiao !== null) sp.set('region', f.regiao)
  if (f.sort !== PADROES.sort) sp.set('sort', f.sort)
  if (f.order !== PADROES.order) sp.set('order', f.order)
  if (f.page !== PADROES.page) sp.set('page', String(f.page))

  return sp
}
