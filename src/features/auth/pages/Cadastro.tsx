import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'

import { Alerta } from '../../../components/ui/Alerta'
import { Botao } from '../../../components/ui/Botao'
import { Campo } from '../../../components/ui/Campo'
import { DESTINO_PADRAO } from '../destino'
import { schemaDeCadastro, type DadosDeCadastro, type EntradaDeCadastro } from '../schemas'
import { cadastrar } from '../services/auth-service'

/**
 * Criação de conta.
 *
 * Entra direto no CRM após o cadastro, sem tela intermediária de confirmação:
 * o AD-007 desligou a confirmação de e-mail, então o Supabase já devolve sessão
 * no `signUp`.
 *
 * O perfil correspondente não é verificado aqui. Ele nasce do trigger na mesma
 * transação que o usuário (AD-005), e o próprio spec manda exibir o CRM mesmo
 * que a leitura do perfil falhe. Checar aqui adicionaria uma ida ao banco para
 * confirmar algo que o banco já garantiu.
 */
export function Cadastro() {
  const navegar = useNavigate()
  const [erroDoEnvio, setErroDoEnvio] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    // Três genéricos porque o refinamento separa entrada de saída: o
    // formulário é governado pelo tipo de entrada, e o envio recebe o de saída.
  } = useForm<EntradaDeCadastro, unknown, DadosDeCadastro>({
    resolver: zodResolver(schemaDeCadastro),
  })

  async function aoEnviar(dados: DadosDeCadastro) {
    setErroDoEnvio(null)
    const resultado = await cadastrar({
      nomeCompleto: dados.nomeCompleto,
      email: dados.email,
      senha: dados.senha,
    })

    if (!resultado.ok) {
      // Nada de `reset()`: o consultor acabou de digitar quatro campos, e
      // limpá-los por causa de um e-mail repetido seria punir o erro.
      setErroDoEnvio(resultado.mensagem)
      return
    }

    navegar(DESTINO_PADRAO, { replace: true })
  }

  return (
    <section className="rounded-surface border border-border bg-surface p-6">
      <h1 className="text-xl font-semibold">Criar conta</h1>

      {erroDoEnvio ? (
        <div className="mt-4">
          <Alerta tom="erro">{erroDoEnvio}</Alerta>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(aoEnviar)} noValidate className="mt-4 flex flex-col gap-4">
        <Campo
          rotulo="Nome completo"
          autoComplete="name"
          erro={errors.nomeCompleto?.message}
          {...register('nomeCompleto')}
        />

        <Campo
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          erro={errors.email?.message}
          {...register('email')}
        />

        <Campo
          rotulo="Senha"
          type="password"
          autoComplete="new-password"
          dica="Ao menos 8 caracteres"
          erro={errors.senha?.message}
          {...register('senha')}
        />

        <Campo
          rotulo="Confirmação da senha"
          type="password"
          autoComplete="new-password"
          erro={errors.confirmacaoDeSenha?.message}
          {...register('confirmacaoDeSenha')}
        />

        <Botao type="submit" enviando={isSubmitting}>
          {isSubmitting ? 'Criando conta…' : 'Criar conta'}
        </Botao>
      </form>

      <p className="mt-4 text-sm text-ink-muted">
        Já tem conta?{' '}
        <Link to="/login" className="text-primary">
          Entrar
        </Link>
      </p>
    </section>
  )
}
