import type { PostgrestError } from '@supabase/supabase-js'

import { supabase } from '../../../lib/supabase'
import type { Database } from '../../../types/database.types'
import { padroesDeBusca } from '../busca'
import type { FiltrosDeClientes } from '../filtros'
import type { DadosDeCliente } from '../schemas'

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

export type ResultadoDeEscrita = { ok: true; cliente: Cliente } | { ok: false; mensagem: string }

const MENSAGEM_GENERICA = 'Não foi possível salvar agora. Tente de novo em instantes.'

/**
 * Traduz o erro do banco em frase para o consultor, em um ponto único.
 *
 * Espalhar a tradução pelas telas é o padrão de falha que o `auth-service` já
 * evita: uma delas acabaria revelando detalhe de banco, e a mesma causa seria
 * dita de dois jeitos. As escritas devolvem a frase pronta em vez de lançar,
 * de modo que o formulário exibe o erro sem perder o que foi digitado
 * (CLNT-05 AC10).
 */
function traduzirErro(erro: PostgrestError): string {
  console.error('[falha ao escrever cliente]', erro)

  switch (erro.code) {
    case '42501':
      // Não é sessão expirada: `ehSessaoExpirada` é estreita de propósito, e
      // este código significa "esta linha não é sua" com sessão válida.
      return 'Você não tem permissão para esta alteração.'
    case '23514':
      return 'Algum valor não é aceito pelo cadastro. Revise os campos.'
    case 'PGRST116':
      // Zero linhas no retorno: ou o cliente foi excluído em outra aba, ou a
      // política filtrou a linha de outro dono. As duas leituras levam à mesma
      // frase, que é o que o spec pede ao não revelar se o registro existe.
      return 'Este cliente não existe mais. Ele pode ter sido excluído em outra aba.'
    default:
      return MENSAGEM_GENERICA
  }
}

/**
 * As oito colunas do grant de update (AD-014).
 *
 * `owner_id`, `created_at` e `updated_at` ficam fora porque estão fora do
 * grant: incluir qualquer uma faria TODO salvamento falhar com `42501`, e o
 * consultor veria "não foi possível salvar" para sempre. Campo apagado vira
 * nulo, e não string vazia, para a coluna aceitar.
 */
function colunasEditaveis(dados: DadosDeCliente) {
  return {
    name: dados.name,
    email: dados.email ?? null,
    phone: dados.phone ?? null,
    status: dados.status,
    source: dados.source ?? null,
    region: dados.region ?? null,
    income: dados.income ?? null,
    income_type: dados.income_type ?? null,
  }
}

/**
 * Cria o cliente com o `owner_id` do consultor autenticado.
 *
 * A política de insert exige `owner_id = auth.uid()` no `with check`, então o
 * valor vai no payload — é a única escrita em que ele aparece. Sem sessão a
 * operação nem é tentada: o erro do banco seria o mesmo `42501` de "linha de
 * outro dono", e a frase resultante confundiria a causa.
 */
export async function criarCliente(dados: DadosDeCliente): Promise<ResultadoDeEscrita> {
  const { data: sessao } = await supabase.auth.getSession()
  const dono = sessao.session?.user.id
  if (dono === undefined) {
    return { ok: false, mensagem: 'Sua sessão expirou. Entre de novo para continuar.' }
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({ ...colunasEditaveis(dados), owner_id: dono })
    .select('*')
    .single()

  if (error) return { ok: false, mensagem: traduzirErro(error) }
  return { ok: true, cliente: data }
}

/** Atualiza somente as colunas do grant; a política restringe a linha. */
export async function atualizarCliente(
  id: string,
  dados: DadosDeCliente,
): Promise<ResultadoDeEscrita> {
  const { data, error } = await supabase
    .from('clients')
    .update(colunasEditaveis(dados))
    .eq('id', id)
    .select('*')
    .single()

  if (error) return { ok: false, mensagem: traduzirErro(error) }
  return { ok: true, cliente: data }
}

/**
 * Exclui o cliente. As notas vão por cascata, pela chave estrangeira de
 * `notes` (CLNT-17 AC3) — a aplicação não as apaga uma a uma.
 *
 * O `.select().single()` devolve a linha excluída: sem ele, tentar excluir o
 * cliente de outro consultor devolveria sucesso silencioso, porque a política
 * filtra a linha e o delete não encontra alvo.
 */
export async function excluirCliente(id: string): Promise<ResultadoDeEscrita> {
  const { data, error } = await supabase.from('clients').delete().eq('id', id).select('*').single()

  if (error) return { ok: false, mensagem: traduzirErro(error) }
  return { ok: true, cliente: data }
}
