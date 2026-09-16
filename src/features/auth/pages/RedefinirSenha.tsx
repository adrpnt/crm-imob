import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'

import { Alerta } from '../../../components/ui/Alerta'
import { Botao } from '../../../components/ui/Botao'
import { Campo } from '../../../components/ui/Campo'
import { DESTINO_PADRAO } from '../destino'
import { lerErroDoFragmento, traduzirErroDoFragmento } from '../erro-no-fragmento'
import { schemaDeNovaSenha, type DadosDeNovaSenha, type EntradaDeNovaSenha } from '../schemas'
import { redefinirSenha } from '../services/auth-service'
import { useAuth } from '../use-auth'

export function RedefinirSenha() {
  const { emRecuperacao } = useAuth()
  const navegar = useNavigate()
  const local = useLocation()
  const [erroDoEnvio, setErroDoEnvio] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EntradaDeNovaSenha, unknown, DadosDeNovaSenha>({
    resolver: zodResolver(schemaDeNovaSenha),
  })

  async function aoEnviar(dados: DadosDeNovaSenha) {
    setErroDoEnvio(null)
    const resultado = await redefinirSenha(dados.senha)

    if (!resultado.ok) {
      setErroDoEnvio(resultado.mensagem)
      return
    }

    // O provedor também derruba a marca ao receber USER_UPDATED, o que faria a
    // guarda pública redirecionar sozinha. Navegar aqui torna o destino
    // explícito em vez de efeito colateral de outra camada.
    navegar(DESTINO_PADRAO, { replace: true })
  }

  if (!emRecuperacao) {
    const motivo = traduzirErroDoFragmento(lerErroDoFragmento(local.hash))

    return (
      <section className="rounded-surface border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold">Redefinir senha</h1>

        <div className="mt-4">
          <Alerta tom="aviso">
            {motivo ?? 'Abra o link que enviamos por e-mail para criar uma nova senha.'}
          </Alerta>
        </div>

        <p className="mt-4 text-sm text-ink-muted">
          <Link to="/forgot-password" className="text-primary">
            Solicitar um novo link
          </Link>
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-surface border border-border bg-surface p-6">
      <h1 className="text-xl font-semibold">Criar nova senha</h1>

      {erroDoEnvio ? (
        <div className="mt-4">
          <Alerta tom="erro">{erroDoEnvio}</Alerta>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(aoEnviar)} noValidate className="mt-4 flex flex-col gap-4">
        <Campo
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          dica="Ao menos 8 caracteres"
          erro={errors.senha?.message}
          {...register('senha')}
        />

        <Campo
          rotulo="Confirmação da nova senha"
          type="password"
          autoComplete="new-password"
          erro={errors.confirmacaoDeSenha?.message}
          {...register('confirmacaoDeSenha')}
        />

        <Botao type="submit" enviando={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Salvar nova senha'}
        </Botao>
      </form>
    </section>
  )
}
