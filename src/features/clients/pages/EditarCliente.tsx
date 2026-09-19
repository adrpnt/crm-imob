import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import { Esqueleto } from '../../../components/feedback/Esqueleto'
import { ConfirmacaoDeSaida } from '../components/ConfirmacaoDeSaida'
import { FormularioDeCliente } from '../components/FormularioDeCliente'
import { useClient, useRegioes } from '../hooks/leitura'
import { useUpdateClient } from '../hooks/escrita'
import { ORIGENS, STATUS, TIPOS_DE_RENDA, type DadosDeCliente } from '../schemas'
import type { Cliente } from '../services/client-service'

/**
 * Narra o valor bruto da coluna de volta ao domínio do formulário.
 *
 * As três colunas são `text` com check, não enum nativo (AD-006), então o tipo
 * gerado é `string`: quem conhece o conjunto é o schema. Um valor fora dele
 * vira indefinido, e a seleção mostra a opção vazia em vez de um valor que
 * nenhuma opção representa.
 */
function opcaoConhecida<T extends string>(
  permitidas: readonly { valor: T }[],
  bruto: string | null,
): T | undefined {
  return permitidas.find((opcao) => opcao.valor === bruto)?.valor
}

/** A linha do banco na forma que o formulário preenche (CLNT-15 AC3). */
function valoresDe(cliente: Cliente) {
  return {
    name: cliente.name,
    email: cliente.email ?? undefined,
    phone: cliente.phone ?? undefined,
    status: opcaoConhecida(STATUS, cliente.status) ?? 'lead',
    source: opcaoConhecida(ORIGENS, cliente.source),
    region: cliente.region ?? undefined,
    income: cliente.income ?? undefined,
    income_type: opcaoConhecida(TIPOS_DE_RENDA, cliente.income_type),
  }
}

/**
 * Edição de cliente, em `/clients/:id/edit` (CLNT-15).
 *
 * Mesmo formulário do cadastro, pré-preenchido — é o que o AC3 pede, e o que
 * impede que as duas telas divirjam no primeiro campo novo.
 *
 * Quando o cliente foi excluído em outra aba, a RLS devolve zero linhas e o
 * serviço traduz o `PGRST116` em "este cliente não existe mais". A frase chega
 * pronta ao alerta: o salvamento não pode terminar em silêncio, que é o que o
 * edge case do spec proíbe.
 */
export function EditarCliente() {
  const { id = '' } = useParams()
  const local = useLocation()
  const navegar = useNavigate()
  const consulta = useClient(id)
  const salvar = useUpdateClient()
  const regioes = useRegioes()

  const [erro, setErro] = useState<string | null>(null)
  const [sujo, setSujo] = useState(false)
  // Lida no instante da navegação, e não no render: salvar navega no mesmo
  // passo em que conclui.
  const concluido = useRef(false)

  async function aoEnviar(dados: DadosDeCliente) {
    setErro(null)
    const resultado = await salvar.mutateAsync({ id, dados })

    if (!resultado.ok) {
      setErro(resultado.mensagem)
      return
    }

    concluido.current = true
    // A query string da listagem de origem chega aqui pelo link da ficha e volta
    // com o consultor (CLNT-14 AC8): sem ela, a ficha perde para onde voltar.
    navegar(
      { pathname: `/clients/${id}`, search: local.search },
      { replace: true, state: { mensagem: 'Alterações salvas.' } },
    )
  }

  if (consulta.isPending) {
    return <Esqueleto linhas={8} rotulo="Carregando o cliente" />
  }

  if (consulta.isError) {
    return (
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-xl">Cliente não encontrado</h1>
        <p className="mt-2 text-silver-600">Ele pode ter sido excluído.</p>
        <p className="mt-4 text-sm">
          <Link to="/clients" className="text-rocket-500">
            Voltar para a listagem
          </Link>
        </p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-xl">Editar cliente</h1>

      <div className="mt-4">
        <FormularioDeCliente
          valoresIniciais={valoresDe(consulta.data)}
          sugestoesDeRegiao={regioes.data ?? []}
          erro={erro}
          rotuloDeEnvio="Salvar alterações"
          aoEnviar={aoEnviar}
          aoMudarSujeira={setSujo}
        />
      </div>

      <p className="mt-4 text-sm">
        <Link to={{ pathname: `/clients/${id}`, search: local.search }} className="text-rocket-500">
          Voltar para a ficha
        </Link>
      </p>

      <ConfirmacaoDeSaida temAlteracoes={() => sujo && !concluido.current} />
    </section>
  )
}
