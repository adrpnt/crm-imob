/**
 * Apresentação de renda, telefone e data.
 *
 * Módulo puro porque três telas o consomem — listagem, ficha e formulário — e
 * porque formato é a classe de lógica que mais silenciosamente quebra: um erro
 * aqui não derruba nada, só exibe o número errado.
 */

/**
 * O que a tela mostra onde não há valor.
 *
 * Existe como constante porque ausência de renda e renda zero significam
 * coisas diferentes: `R$ 0,00` afirma que o consultor apurou a renda e ela é
 * zero; o traço diz que ninguém perguntou.
 */
export const SEM_VALOR = '—'

/** Renda em BRL, com separador de milhar e duas casas (premissa do spec). */
export function formatarRenda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return SEM_VALOR
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Converte o que foi digitado no campo de renda em número para o schema.
 *
 * O ponto é lido como separador de milhar e a vírgula como decimal, que é a
 * convenção brasileira do campo. Texto sem número algum devolve `NaN` de
 * propósito: o schema o recusa com "Informe a renda em números", em vez de
 * tratar rabisco como renda não informada. O sinal negativo é preservado para
 * que o erro do CLNT-01 AC4 apareça no campo, e não sumir daqui.
 */
export function rendaParaNumero(texto: string): number | undefined {
  const limpo = texto.trim()
  if (limpo === '') return undefined

  const numerico = limpo
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  return numerico === '' || numerico === '-' ? Number.NaN : Number(numerico)
}

/**
 * Telefone com máscara a partir dos dígitos que o banco guarda.
 *
 * Comprimento fora de 10 e 11 é exibido como está: a coluna aceita de 8 a 20
 * dígitos, e inventar máscara para um número internacional exibiria algo que
 * ninguém digitou.
 */
export function formatarTelefone(digitos: string | null | undefined): string {
  if (!digitos) return SEM_VALOR

  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  }

  return digitos
}

/** Data em formato brasileiro, para `created_at` e `updated_at` (CLNT-14 AC1). */
export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
