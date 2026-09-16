/** Rota padrão após entrar, quando não há destino pretendido. */
export const DESTINO_PADRAO = '/clients'

/**
 * Valida o destino recebido em `?redirect=`.
 *
 * Sem esta checagem o parâmetro seria um redirecionamento aberto: bastaria
 * enviar `/login?redirect=https://site-falso.com` para que o consultor, após
 * digitar a senha corretamente, fosse levado a uma cópia da tela de login.
 * Como o endereço de origem é legítimo, o golpe é difícil de perceber.
 *
 * Só caminhos internos passam. `//outro.com` é recusado porque o navegador o
 * trata como endereço absoluto com o mesmo protocolo.
 */
export function destinoSeguro(pretendido: string | null): string {
  if (!pretendido) return DESTINO_PADRAO
  if (!pretendido.startsWith('/')) return DESTINO_PADRAO
  if (pretendido.startsWith('//')) return DESTINO_PADRAO
  if (pretendido.startsWith('/\\')) return DESTINO_PADRAO
  return pretendido
}
