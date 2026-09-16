/**
 * Lê o erro que o Supabase devolve no fragmento da URL.
 *
 * Quando o link de recuperação está expirado ou já foi usado, o Supabase não
 * estabelece sessão: ele redireciona para a rota de retorno com o erro no
 * fragmento, na forma `#error=access_denied&error_code=otp_expired`.
 *
 * Sem ler isso, a tela não distinguiria "cheguei por um link que não vale mais"
 * de "cheguei aqui digitando o endereço" — os dois casos chegam sem sessão de
 * recuperação, e o spec pede mensagens diferentes para cada um.
 */
export type ErroDoFragmento = { codigo: string; descricao: string } | null

export function lerErroDoFragmento(fragmento: string): ErroDoFragmento {
  const limpo = fragmento.startsWith('#') ? fragmento.slice(1) : fragmento
  if (!limpo) return null

  const parametros = new URLSearchParams(limpo)
  const codigo = parametros.get('error_code')
  if (!codigo) return null

  return {
    codigo,
    descricao: parametros.get('error_description')?.replaceAll('+', ' ') ?? '',
  }
}

/** Traduz o erro do fragmento para a frase que o consultor lê. */
export function traduzirErroDoFragmento(erro: ErroDoFragmento): string | null {
  if (!erro) return null

  switch (erro.codigo) {
    case 'otp_expired':
      return 'Este link expirou. Solicite um novo para redefinir sua senha.'
    case 'access_denied':
      return 'Este link não é mais válido. Solicite um novo para redefinir sua senha.'
    default:
      return 'Não foi possível usar este link. Solicite um novo para redefinir sua senha.'
  }
}
