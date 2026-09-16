import type { Session } from '@supabase/supabase-js'

/**
 * Estado de autenticação como união discriminada.
 *
 * A forma importa mais do que parece: em `carregando` a sessão é `null` pelo
 * tipo, então o compilador recusa `sessao.user` sem antes estreitar o estado.
 * Esse é justamente o erro capaz de produzir o redirecionamento prematuro que
 * o PLAN §6 proíbe — aqui ele deixa de ser possível em vez de ficar sob
 * disciplina de quem escreve a tela.
 */
export type EstadoDeAutenticacao =
  | { estado: 'carregando'; sessao: null; emRecuperacao: false }
  | { estado: 'anonimo'; sessao: null; emRecuperacao: false }
  | { estado: 'autenticado'; sessao: Session; emRecuperacao: boolean }

export const CARREGANDO: EstadoDeAutenticacao = {
  estado: 'carregando',
  sessao: null,
  emRecuperacao: false,
}

export const ANONIMO: EstadoDeAutenticacao = {
  estado: 'anonimo',
  sessao: null,
  emRecuperacao: false,
}

export function autenticado(sessao: Session, emRecuperacao = false): EstadoDeAutenticacao {
  return { estado: 'autenticado', sessao, emRecuperacao }
}
