import { supabase } from '../../../lib/supabase'

/**
 * Resultado das operações de autenticação.
 *
 * União discriminada em vez de exceção: obriga a tela a tratar a falha, e a
 * mensagem já chega pronta para exibição.
 */
export type Resultado = { ok: true } | { ok: false; mensagem: string }

const MENSAGEM_GENERICA = 'Não foi possível concluir agora. Tente de novo em instantes.'
const MENSAGEM_REDE = 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'
const MENSAGEM_CREDENCIAL = 'E-mail ou senha inválidos'

type ErroDeAutenticacao = { code?: string; status?: number; message?: string } | null

/**
 * Traduz o erro do Supabase para a frase que o consultor lê.
 *
 * Ponto único de propósito. Espalhar essa decisão pelas telas garante que uma
 * delas acabe revelando mais do que deve.
 *
 * O erro original vai para o console antes da tradução: sem isso, um projeto
 * Supabase mal configurado pareceria apenas "senha errada", e o diagnóstico
 * ficaria impossível.
 */
export function traduzirErro(erro: ErroDeAutenticacao): string {
  console.error('[falha de autenticação]', erro)

  if (!erro) return MENSAGEM_GENERICA

  // Ausência de status indica que a requisição nem chegou ao servidor.
  if (erro.status === undefined) return MENSAGEM_REDE

  switch (erro.code) {
    case 'invalid_credentials':
      // O Supabase devolve este mesmo código para senha errada e para e-mail
      // sem conta. Distinguir os dois aqui transformaria a tela de login num
      // oráculo que confirma quais e-mails existem.
      return MENSAGEM_CREDENCIAL
    case 'user_already_exists':
    case 'email_exists':
      return 'Este e-mail já possui conta. Entre ou recupere sua senha.'
    case 'weak_password':
      return 'A senha precisa de ao menos 8 caracteres'
    case 'validation_failed':
      return 'Informe um e-mail válido'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.'
    case 'otp_expired':
    case 'invalid_token':
      return 'Este link expirou ou já foi usado. Solicite um novo.'
    case 'same_password':
      return 'A nova senha precisa ser diferente da atual'
    default:
      if (erro.status === 429) {
        return 'Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.'
      }
      return MENSAGEM_GENERICA
  }
}

export async function entrar(credenciais: { email: string; senha: string }): Promise<Resultado> {
  const { error } = await supabase.auth.signInWithPassword({
    email: credenciais.email,
    password: credenciais.senha,
  })
  return error ? { ok: false, mensagem: traduzirErro(error) } : { ok: true }
}

/**
 * Cria a conta. `nomeCompleto` vai para os metadados porque é de lá que o
 * trigger `handle_new_user` o lê para montar o perfil (AD-005) — o frontend
 * não insere em `profiles`.
 */
export async function cadastrar(dados: {
  nomeCompleto: string
  email: string
  senha: string
}): Promise<Resultado> {
  const { error } = await supabase.auth.signUp({
    email: dados.email,
    password: dados.senha,
    options: { data: { full_name: dados.nomeCompleto } },
  })
  return error ? { ok: false, mensagem: traduzirErro(error) } : { ok: true }
}

export async function sair(): Promise<void> {
  await supabase.auth.signOut()
}

/**
 * Pede o link de redefinição.
 *
 * A resposta é a mesma com ou sem conta: o Supabase já não distingue, e o que
 * cabe aqui é não desfazer essa discrição. Só falha de transporte e limite de
 * envio chegam ao consultor como erro — essas ele precisa saber, porque valem
 * uma nova tentativa.
 */
export async function pedirRecuperacao(email: string, urlDeRetorno: string): Promise<Resultado> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: urlDeRetorno,
  })

  if (!error) return { ok: true }
  if (error.status === undefined || error.status === 429) {
    return { ok: false, mensagem: traduzirErro(error) }
  }

  // Qualquer outra recusa é silenciada de propósito: revelá-la diria ao
  // visitante se aquele e-mail tem conta.
  console.error('[recuperação recusada, silenciada por discrição]', error)
  return { ok: true }
}

export async function redefinirSenha(novaSenha: string): Promise<Resultado> {
  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  return error ? { ok: false, mensagem: traduzirErro(error) } : { ok: true }
}
