import { supabase } from './supabase'

/** Limites das check constraints de public.error_logs. */
const LIMITE_MENSAGEM = 2000
const LIMITE_STACK = 10_000
const LIMITE_ROTA = 500
const LIMITE_USER_AGENT = 500

export type ResultadoDoRegistro = 'gravado' | 'sem-sessao' | 'falhou'

function truncar(valor: string | null | undefined, limite: number): string | null {
  if (!valor) return null
  return valor.length <= limite ? valor : valor.slice(0, limite)
}

/**
 * Registra uma falha capturada pelo error boundary.
 *
 * Nunca lança. Um erro aqui aconteceria dentro do tratamento de outro erro, e
 * derrubaria a própria tela que existe para explicar a falha (FND-16).
 *
 * Sem sessão autenticada não há tentativa de escrita: `error_logs` não concede
 * privilégio ao papel anônimo, e abrir esse caminho tornaria a tabela gravável
 * por qualquer um, já que a chave publicável está no bundle (AD-011).
 *
 * Os valores são truncados aos limites das constraints. Sem isso, um stack
 * longo faria o insert ser recusado e o registro se perderia justamente no
 * caso mais interessante de diagnosticar.
 */
export async function registrarErroDoCliente(
  erro: Error,
  rota: string,
): Promise<ResultadoDoRegistro> {
  try {
    const { data } = await supabase.auth.getSession()
    const idDoUsuario = data.session?.user.id

    if (!idDoUsuario) {
      console.error('[erro sem sessão, não persistido]', erro)
      return 'sem-sessao'
    }

    const { error } = await supabase.from('error_logs').insert({
      owner_id: idDoUsuario,
      message: truncar(erro.message, LIMITE_MENSAGEM) ?? 'erro sem mensagem',
      stack: truncar(erro.stack, LIMITE_STACK),
      route: truncar(rota, LIMITE_ROTA),
      user_agent: truncar(globalThis.navigator?.userAgent, LIMITE_USER_AGENT),
    })

    if (error) {
      console.error('[falha ao registrar erro]', error)
      return 'falhou'
    }
    return 'gravado'
  } catch (causa) {
    console.error('[falha ao registrar erro]', causa)
    return 'falhou'
  }
}
