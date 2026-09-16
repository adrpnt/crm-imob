import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { Alerta } from '../../../components/ui/Alerta'
import { Botao } from '../../../components/ui/Botao'
import { Campo } from '../../../components/ui/Campo'
import { consumirSessaoExpirada } from '../../../lib/sessao-expirada'
import { destinoSeguro } from '../destino'
import { schemaDeLogin, type DadosDeLogin, type EntradaDeLogin } from '../schemas'
import { entrar } from '../services/auth-service'

export function Login() {
  const navegar = useNavigate()
  const [parametros] = useSearchParams()
  const [erroDoEnvio, setErroDoEnvio] = useState<string | null>(null)

  // Leitura destrutiva na montagem: a mensagem de expiração aparece uma vez e
  // não reaparece se o consultor recarregar a tela de login.
  const [sessaoExpirou] = useState(consumirSessaoExpirada)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EntradaDeLogin, unknown, DadosDeLogin>({ resolver: zodResolver(schemaDeLogin) })

  async function aoEnviar(dados: DadosDeLogin) {
    setErroDoEnvio(null)
    const resultado = await entrar(dados)

    if (!resultado.ok) {
      setErroDoEnvio(resultado.mensagem)
      return
    }

    navegar(destinoSeguro(parametros.get('redirect')), { replace: true })
  }

  return (
    <section className="rounded-surface border border-border bg-surface p-6">
      <h1 className="text-xl font-semibold">Entrar no CRM</h1>

      {sessaoExpirou ? (
        <div className="mt-4">
          <Alerta tom="aviso">Sua sessão expirou. Entre de novo para continuar.</Alerta>
        </div>
      ) : null}

      {erroDoEnvio ? (
        <div className="mt-4">
          <Alerta tom="erro">{erroDoEnvio}</Alerta>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(aoEnviar)} noValidate className="mt-4 flex flex-col gap-4">
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
          autoComplete="current-password"
          erro={errors.senha?.message}
          {...register('senha')}
        />

        <Botao type="submit" enviando={isSubmitting}>
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </Botao>
      </form>

      <p className="mt-4 text-sm text-ink-muted">
        <Link to="/forgot-password" className="text-primary">
          Esqueci minha senha
        </Link>
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        Não tem conta?{' '}
        <Link to="/signup" className="text-primary">
          Criar conta
        </Link>
      </p>
    </section>
  )
}
