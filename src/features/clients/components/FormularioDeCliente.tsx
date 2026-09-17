import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'

import { Alerta } from '../../../components/ui/Alerta'
import { Botao } from '../../../components/ui/Botao'
import { Campo } from '../../../components/ui/Campo'
import { CampoComSugestoes } from '../../../components/ui/CampoComSugestoes'
import { Selecao } from '../../../components/ui/Selecao'
import { formatarRenda, rendaParaNumero } from '../formato'
import {
  ORIGENS,
  STATUS,
  TIPOS_DE_RENDA,
  schemaDeCliente,
  type DadosDeCliente,
  type EntradaDeCliente,
} from '../schemas'

type Props = {
  /** Valores atuais, para a edição (CLNT-15 AC3). Ausentes, o cadastro começa vazio. */
  valoresIniciais?: Partial<EntradaDeCliente>
  /** Regiões que o consultor já usou (CLNT-04). A lista é atalho, nunca conjunto fechado. */
  sugestoesDeRegiao?: readonly string[]
  /** Causa da recusa do serviço, exibida acima do formulário (CLNT-05 AC10). */
  erro?: string | null
  /** Texto do botão de envio. O cadastro e a edição dizem coisas diferentes. */
  rotuloDeEnvio?: string
  /** Recebe os dados já validados e transformados pelo schema. */
  aoEnviar: (dados: DadosDeCliente) => Promise<void>
  /** Avisa quando há alterações pendentes. É o que `ConfirmacaoDeSaida` consome (CLNT-06). */
  aoMudarSujeira?: (sujo: boolean) => void
}

/**
 * A opção vazia devolve indefinido, e não string vazia.
 *
 * `''` não é valor aceito pelos checks de `source` e `income_type` (AD-006), e
 * o schema o recusaria como "escolha um da lista" — que é o oposto do que
 * deixar em branco significa nesses dois campos (CLNT-01 AC7).
 */
function vazioComoIndefinido(valor: string): string | undefined {
  return valor === '' ? undefined : valor
}

/**
 * A renda é texto na tela e número no schema.
 *
 * O React Hook Form aplica esta conversão também ao valor padrão, que na
 * edição já chega como número — daí a passagem direta: converter é só o que
 * veio do teclado. Sem essa distinção, o pré-preenchimento derruba a tela.
 */
function rendaDoCampo(valor: unknown): number | undefined {
  if (typeof valor === 'string') return rendaParaNumero(valor)
  return typeof valor === 'number' ? valor : undefined
}

/**
 * O formulário de cliente, um só para o cadastro e para a edição.
 *
 * É o que o CLNT-15 AC3 exige ao pedir "o mesmo formulário do cadastro,
 * pré-preenchido": dois formulários gêmeos divergiriam no primeiro campo novo.
 *
 * Toda a validação vem de `schemaDeCliente` pelo resolver, sem regra repetida
 * aqui. Repetir um limite na tela é como ele passa a divergir do banco — e o
 * schema já espelha as constraints da migration.
 *
 * O formulário não navega nem salva: recebe `aoEnviar` e devolve os dados
 * validados. Quem decide o que fazer com a recusa do serviço é a tela, que por
 * isso consegue preservar o que foi digitado (CLNT-05 AC10) — não há `reset()`
 * nenhum no caminho de erro.
 */
export function FormularioDeCliente({
  valoresIniciais,
  sugestoesDeRegiao = [],
  erro,
  rotuloDeEnvio = 'Salvar',
  aoEnviar,
  aoMudarSujeira,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    // Três genéricos porque o schema transforma: o formulário é governado pelo
    // tipo de entrada e o envio recebe o de saída, com telefone só em dígitos.
  } = useForm<EntradaDeCliente, unknown, DadosDeCliente>({
    resolver: zodResolver(schemaDeCliente),
    // Todo campo aparece aqui, inclusive os vazios: é contra estes valores que
    // o React Hook Form decide se o formulário está sujo, e um campo ausente
    // nasceria sujo assim que fosse tocado pela primeira vez.
    defaultValues: {
      name: valoresIniciais?.name ?? '',
      email: valoresIniciais?.email ?? '',
      phone: valoresIniciais?.phone ?? '',
      // `lead` pré-selecionado no cadastro (CLNT-01 AC5).
      status: valoresIniciais?.status ?? 'lead',
      source: valoresIniciais?.source,
      region: valoresIniciais?.region ?? '',
      income: valoresIniciais?.income,
      income_type: valoresIniciais?.income_type,
    },
  })

  useEffect(() => {
    aoMudarSujeira?.(isDirty)
  }, [isDirty, aoMudarSujeira])

  const { ref: prenderRenda, ...campoDeRenda } = register('income', {
    setValueAs: rendaDoCampo,
  })
  const renda = useRef<HTMLInputElement | null>(null)
  const rendaInicial = valoresIniciais?.income

  /*
    A renda é número no schema e texto na tela, e o valor pré-preenchido
    precisa chegar ao campo na convenção do campo: `rendaParaNumero` lê o ponto
    como separador de milhar, então o `3500.5` que o React Hook Form escreveria
    sozinho viraria 35005 se o consultor mexesse no campo. Trocar só o texto
    exibido mantém o valor do formulário intacto — salvar sem tocar na renda
    continua enviando o mesmo número.
  */
  useEffect(() => {
    if (renda.current && rendaInicial !== undefined) {
      renda.current.value = formatarRenda(rendaInicial)
    }
  }, [rendaInicial])

  return (
    <form onSubmit={handleSubmit(aoEnviar)} noValidate className="flex flex-col gap-4">
      {erro ? <Alerta tom="erro">{erro}</Alerta> : null}

      <Campo rotulo="Nome" autoComplete="name" erro={errors.name?.message} {...register('name')} />

      <Campo
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        erro={errors.email?.message}
        {...register('email')}
      />

      <Campo
        rotulo="Telefone"
        type="tel"
        autoComplete="tel"
        dica="Com DDD"
        erro={errors.phone?.message}
        {...register('phone')}
      />

      <Selecao
        rotulo="Status"
        opcoes={STATUS}
        erro={errors.status?.message}
        {...register('status')}
      />

      <Selecao
        rotulo="Origem"
        opcoes={ORIGENS}
        opcaoVazia="Não informada"
        erro={errors.source?.message}
        {...register('source', { setValueAs: vazioComoIndefinido })}
      />

      <CampoComSugestoes
        rotulo="Região"
        sugestoes={sugestoesDeRegiao}
        dica="Como você chama essa região"
        erro={errors.region?.message}
        {...register('region')}
      />

      <Campo
        rotulo="Renda"
        inputMode="decimal"
        dica="Em reais, por mês"
        erro={errors.income?.message}
        {...campoDeRenda}
        ref={(elemento: HTMLInputElement | null) => {
          prenderRenda(elemento)
          renda.current = elemento
        }}
      />

      <Selecao
        rotulo="Tipo de renda"
        opcoes={TIPOS_DE_RENDA}
        opcaoVazia="Não informado"
        erro={errors.income_type?.message}
        {...register('income_type', { setValueAs: vazioComoIndefinido })}
      />

      <Botao type="submit" enviando={isSubmitting}>
        {isSubmitting ? 'Salvando…' : rotuloDeEnvio}
      </Botao>
    </form>
  )
}
