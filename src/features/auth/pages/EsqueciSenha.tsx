import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'

import { Alerta } from '../../../components/ui/Alerta'
import { Botao } from '../../../components/ui/Botao'
import { Campo } from '../../../components/ui/Campo'
import { schemaDeRecuperacao, type DadosDeRecuperacao, type EntradaDeRecuperacao } from '../schemas'
import { pedirRecuperacao } from '../services/auth-service'

export const ROTA_DE_REDEFINICAO = '/reset-password'

export function EsqueciSenha() {
  const [erroDoEnvio, setErroDoEnvio] = useState<string | null>(null)
  const [pedidoEnviado, setPedidoEnviado] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EntradaDeRecuperacao, unknown, DadosDeRecuperacao>({
    resolver: zodResolver(schemaDeRecuperacao),
  })

  async function aoEnviar(dados: DadosDeRecuperacao) {
    setErroDoEnvio(null)

    // A origem vem do navegador, e não de configuração: o mesmo código monta o
    // endereço certo em desenvolvimento e em produção.
    const urlDeRetorno = `${globalThis.location.origin}${ROTA_DE_REDEFINICAO}`
    const resultado = await pedirRecuperacao(dados.email, urlDeRetorno)

    if (!resultado.ok) {
      setErroDoEnvio(resultado.mensagem)
      return
    }

    setPedidoEnviado(true)
  }

  return (
    <section className="rounded-surface border border-graphite-700 bg-graphite-800 p-6">
      <h1 className="text-xl">Recuperar senha</h1>

      {pedidoEnviado ? (
        <>
          {/*
            A confirmação é deliberadamente condicional — "se houver conta" — e
            idêntica nos dois casos. Dizer "enviamos para você" confirmaria que
            aquele endereço tem cadastro, transformando esta tela num verificador
            de e-mails.
          */}
          <div className="mt-4">
            <Alerta tom="sucesso">
              Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.
              Verifique também a caixa de spam.
            </Alerta>
          </div>
          <p className="mt-4 text-sm text-silver-600">
            <Link to="/login" className="text-rocket-500">
              Voltar para entrar
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-silver-600">
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
          </p>

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

            <Botao type="submit" enviando={isSubmitting}>
              {isSubmitting ? 'Enviando…' : 'Enviar link'}
            </Botao>
          </form>

          <p className="mt-4 text-sm text-silver-600">
            <Link to="/login" className="text-rocket-500">
              Voltar para entrar
            </Link>
          </p>
        </>
      )}
    </section>
  )
}
