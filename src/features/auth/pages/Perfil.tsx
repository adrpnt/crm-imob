import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Alerta } from '../../../components/ui/Alerta'
import { Botao } from '../../../components/ui/Botao'
import { Campo } from '../../../components/ui/Campo'
import { Carregando } from '../../../components/feedback/Carregando'
import { schemaDePerfil, type DadosDePerfil, type EntradaDePerfil } from '../schemas'
import { atualizarPerfil, buscarPerfil, CHAVE_DO_PERFIL } from '../services/profile-service'
import { useAuth } from '../use-auth'

export function Perfil() {
  const { sessao } = useAuth()
  const clienteDeConsultas = useQueryClient()
  const [salvo, setSalvo] = useState(false)
  const [erroDoEnvio, setErroDoEnvio] = useState<string | null>(null)

  const consulta = useQuery({ queryKey: CHAVE_DO_PERFIL, queryFn: buscarPerfil })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EntradaDePerfil, unknown, DadosDePerfil>({ resolver: zodResolver(schemaDePerfil) })

  // O formulário só pode ser preenchido depois que o perfil chega.
  useEffect(() => {
    if (consulta.data) {
      reset({ nomeCompleto: consulta.data.full_name, telefone: consulta.data.phone ?? '' })
    }
  }, [consulta.data, reset])

  const salvar = useMutation({
    mutationFn: (dados: DadosDePerfil) =>
      atualizarPerfil({
        id: sessao!.user.id,
        nomeCompleto: dados.nomeCompleto,
        telefone: dados.telefone,
      }),
    onSuccess: (resultado) => {
      if (!resultado.ok) {
        setErroDoEnvio(resultado.mensagem)
        return
      }
      // Invalidar em vez de escrever no cache: o cabeçalho lê a mesma chave e
      // passa a exibir o nome novo sem recarregar a página.
      void clienteDeConsultas.invalidateQueries({ queryKey: CHAVE_DO_PERFIL })
      setSalvo(true)
    },
  })

  async function aoEnviar(dados: DadosDePerfil) {
    setErroDoEnvio(null)
    setSalvo(false)
    await salvar.mutateAsync(dados)
  }

  if (consulta.isPending) return <Carregando rotulo="Carregando seu perfil" />

  if (consulta.isError) {
    return <Alerta tom="erro">Não foi possível carregar seu perfil. Recarregue a página.</Alerta>
  }

  return (
    <section className="mx-auto max-w-md">
      <h1 className="text-xl">Meu perfil</h1>

      {salvo ? (
        <div className="mt-4">
          <Alerta tom="sucesso">Suas informações foram salvas.</Alerta>
        </div>
      ) : null}

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

        {/*
          O e-mail é somente leitura porque a aplicação nunca o altera (AD-008).
          É `readOnly` e não `disabled`: campo desabilitado sai da ordem de
          tabulação e alguns leitores de tela o ignoram, escondendo do consultor
          a informação que ele veio conferir.
        */}
        <Campo
          rotulo="E-mail"
          type="email"
          readOnly
          value={consulta.data.email}
          dica="O e-mail não pode ser alterado por aqui."
          className="bg-graphite-800"
        />

        <Campo
          rotulo="Telefone"
          type="tel"
          autoComplete="tel"
          dica="Com DDD"
          erro={errors.telefone?.message}
          {...register('telefone')}
        />

        <Botao type="submit" enviando={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Salvar'}
        </Botao>
      </form>
    </section>
  )
}
