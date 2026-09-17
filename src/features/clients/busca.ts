/**
 * Transforma o que o consultor digitou no padrão que vai ao `ilike`.
 *
 * O alvo é a coluna gerada `clients.search_text`, que já concatena nome,
 * e-mail e telefone em minúsculas e sem acento, e é a única coberta pelo
 * índice trigram. Por isso a busca do CLNT-08 é um `ilike` sobre ela, e não
 * um `.or()` de três colunas — que não usaria índice nenhum.
 *
 * Três comportamentos foram medidos contra a pilha local na fase Design e
 * ficam presos por teste aqui: a ordem do escape, o `*` que continua curinga
 * e a concordância entre `NFD` e `immutable_unaccent` em português.
 */

/**
 * Apara, colapsa espaços internos, remove acentos e baixa a caixa.
 *
 * Tem que produzir o mesmo que `immutable_unaccent(lower(...))` produziu na
 * geração de `search_text`: se as duas normalizações divergirem, o termo
 * digitado deixa de casar com o dado armazenado.
 */
export function normalizarTermo(bruto: string): string {
  return bruto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/**
 * Escapa `\`, `%` e `_`, **nessa ordem**.
 *
 * A contrabarra vem primeiro porque ela é o próprio caractere de escape: se
 * `%` fosse tratado antes, a contrabarra recém-inserida seria escapada na
 * passada seguinte e o padrão passaria a procurar uma contrabarra literal.
 *
 * O `*` fica de fora de propósito: medido na fase Design, o PostgREST o
 * traduz para `%` antes do SQL, de modo que `\*` significa "porcentagem
 * literal". Um asterisco literal é inexpressável por `ilike`, e o spec
 * registra isso como limite conhecido.
 */
export function escaparCuringas(termo: string): string {
  return termo.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/** Só os dígitos, para casar contra `phone`, que o banco guarda sem máscara. */
export function soDigitos(termo: string): string {
  return termo.replace(/\D/g, '')
}

/**
 * Padrões de `ilike` para o termo digitado.
 *
 * Devolve o padrão de texto e, quando o termo tem dígitos, um segundo só com
 * eles — é o CLNT-08 AC3: "(11) 98765" tem que achar o telefone gravado como
 * `11987654321`, e o padrão com máscara nunca casaria.
 *
 * Termo vazio ou só com espaços devolve lista vazia: filtrar por ele traria a
 * carteira inteira sob a aparência de uma busca.
 */
export function padroesDeBusca(bruto: string): string[] {
  const termo = normalizarTermo(bruto)
  if (termo === '') return []

  const padroes = [`%${escaparCuringas(termo)}%`]
  const digitos = soDigitos(termo)

  // A comparação com o termo evita repetir o mesmo padrão quando o consultor
  // digitou só dígitos: aí o padrão de texto já é o do telefone.
  if (digitos !== '' && digitos !== termo) padroes.push(`%${digitos}%`)

  return padroes
}
