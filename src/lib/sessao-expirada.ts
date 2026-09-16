/**
 * Sinalizador de "a sessão expirou", consumido uma única vez.
 *
 * Existe porque a guarda de rota não sabe distinguir um visitante que nunca
 * entrou de um consultor que foi desconectado no meio do trabalho — os dois
 * chegam ao login sem sessão. Sem este sinal, o segundo veria a tela de login
 * sem explicação nenhuma.
 *
 * Leitura destrutiva de propósito: a mensagem aparece uma vez e não reaparece
 * se o consultor recarregar a página de login.
 */
let expirou = false

export function marcarSessaoExpirada(): void {
  expirou = true
}

export function consumirSessaoExpirada(): boolean {
  const valor = expirou
  expirou = false
  return valor
}
