import { useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router'

import { Esqueleto } from '../../../components/feedback/Esqueleto'
import { Alerta } from '../../../components/ui/Alerta'
import { Botao } from '../../../components/ui/Botao'
import { DialogoDeExclusao } from '../components/DialogoDeExclusao'
import { SEM_VALOR, formatarData, formatarRenda, formatarTelefone } from '../formato'
import { useClient } from '../hooks/leitura'
import { ORIGENS, STATUS, TIPOS_DE_RENDA } from '../schemas'
import type { Cliente } from '../services/client-service'

/**
 * A confirmação vinda da tela que navegou para cá (CLNT-01 AC1, CLNT-15 AC4).
 *
 * O cadastro e a edição navegam para a ficha no mesmo passo em que concluem, e
 * um alerta na tela de origem sumiria no quadro seguinte. A mensagem viaja no
 * estado da navegação e é exibida aqui, onde o consultor chega.
 *
 * O estado do histórico é escrito por quem navega e sobrevive ao recarregamento,
 * então é lido como desconhecido: qualquer coisa pode estar lá.
 */
function mensagemDe(estado: unknown): string | null {
  if (typeof estado !== 'object' || estado === null) return null
  const { mensagem } = estado as { mensagem?: unknown }
  return typeof mensagem === 'string' ? mensagem : null
}

/** O rótulo em português do valor guardado na coluna; o bruto, se o conjunto mudou. */
function rotuloDe(
  opcoes: readonly { valor: string; rotulo: string }[],
  bruto: string | null,
): string {
  if (bruto === null) return SEM_VALOR
  return opcoes.find((opcao) => opcao.valor === bruto)?.rotulo ?? bruto
}

function Dado({ termo, children }: { termo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-silver-600">{termo}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  )
}

/**
 * Ficha do cliente, em `/clients/:id` (CLNT-14).
 *
 * O erro da leitura vira "cliente não encontrado" sem distinguir identificador
 * inexistente de linha de outro consultor (AC2): a RLS devolve zero linhas nos
 * dois casos, e separar as duas frases contaria que o registro existe.
 *
 * O retorno à listagem leva a query string desta tela, que é onde vivem busca,
 * filtros, ordenação e página (AD-015). É o que atende "preservando os filtros
 * de origem" do AC8 sem guardar cópia do estado da listagem em lugar nenhum.
 *
 * A ida para a edição leva a mesma query string, e a edição a devolve ao voltar
 * para a ficha. Sem isso a volta da edição entrega a carteira inteira, e a
 * decisão do `context.md` — voltar da ficha preserva os filtros aplicados —
 * valeria só enquanto o consultor não editasse nada.
 */
export function FichaDoCliente() {
  const { id = '' } = useParams()
  const local = useLocation()
  const consulta = useClient(id)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  const paraAListagem = { pathname: '/clients', search: local.search }

  if (consulta.isPending) {
    return <Esqueleto linhas={8} rotulo="Carregando o cliente" />
  }

  if (consulta.isError) {
    return (
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-xl">Cliente não encontrado</h1>
        <p className="mt-2 text-silver-600">Ele pode ter sido excluído.</p>
        <p className="mt-4 text-sm">
          <Link to={paraAListagem} className="text-rocket-500">
            Voltar para a listagem
          </Link>
        </p>
      </section>
    )
  }

  const cliente: Cliente = consulta.data
  const mensagem = mensagemDe(local.state)

  return (
    <section className="mx-auto max-w-2xl">
      {mensagem ? <Alerta tom="sucesso">{mensagem}</Alerta> : null}

      <header className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl">{cliente.name}</h1>

        <div className="flex gap-2">
          <Link
            to={{ pathname: `/clients/${cliente.id}/edit`, search: local.search }}
            className="rounded-control bg-rocket-500 px-4 py-2 font-medium text-graphite-950"
          >
            Editar
          </Link>
          <Botao variante="destrutiva" onClick={() => setConfirmandoExclusao(true)}>
            Excluir
          </Botao>
        </div>
      </header>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <Dado termo="E-mail">{cliente.email ?? SEM_VALOR}</Dado>
        <Dado termo="Telefone">{formatarTelefone(cliente.phone)}</Dado>
        <Dado termo="Status">{rotuloDe(STATUS, cliente.status)}</Dado>
        <Dado termo="Origem">{rotuloDe(ORIGENS, cliente.source)}</Dado>
        <Dado termo="Região">{cliente.region ?? SEM_VALOR}</Dado>
        <Dado termo="Renda">{formatarRenda(cliente.income)}</Dado>
        <Dado termo="Tipo de renda">{rotuloDe(TIPOS_DE_RENDA, cliente.income_type)}</Dado>
        <Dado termo="Cadastrado em">{formatarData(cliente.created_at)}</Dado>
        <Dado termo="Atualizado em">{formatarData(cliente.updated_at)}</Dado>
      </dl>

      {/*
        O ponto onde a lista de notas entra. Ela pertence à feature `notes`, e a
        ficha é a tela que a hospeda: o gesto do consultor é abrir o cliente e
        ler o histórico antes de ligar.
      */}
      <section aria-labelledby="notas" className="mt-8">
        <h2 id="notas" className="text-lg">
          Notas
        </h2>
        <p className="mt-2 text-silver-600">O histórico de notas chega com a feature de notas.</p>
      </section>

      <p className="mt-8 text-sm">
        <Link to={paraAListagem} className="text-rocket-500">
          Voltar para a listagem
        </Link>
      </p>

      <DialogoDeExclusao
        aberto={confirmandoExclusao}
        cliente={cliente}
        destino={paraAListagem}
        aoFechar={() => setConfirmandoExclusao(false)}
      />
    </section>
  )
}
