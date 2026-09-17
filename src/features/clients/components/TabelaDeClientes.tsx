import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'

import { escreverFiltros, lerFiltros, type OrdenacaoDeClientes } from '../filtros'
import { SEM_VALOR, formatarData, formatarRenda, formatarTelefone } from '../formato'
import { STATUS } from '../schemas'
import type { Cliente } from '../services/client-service'

type Props = {
  clientes: readonly Cliente[]
}

/** O que o leitor de tela anuncia em `aria-sort` para cada direção. */
const ANUNCIO = { asc: 'ascending', desc: 'descending' } as const

function rotuloDeStatus(valor: string): string {
  return STATUS.find((status) => status.valor === valor)?.rotulo ?? valor
}

/**
 * Cabeçalho que ordena a listagem (CLNT-11 AC9).
 *
 * A ordenação vai para a URL como todo o resto do estado da listagem (AD-015).
 * A página **não** recua: o AC8 manda voltar para a primeira quando a busca ou
 * um filtro muda, e reordenar não altera quantos clientes satisfazem a lista.
 *
 * `aria-sort` no `th` é o que anuncia a ordem corrente. Um ícone sozinho não
 * chega a quem ouve a tabela, e o CLNT-18 pede que o estado seja anunciado.
 */
function CabecalhoOrdenavel({
  coluna,
  children,
}: {
  coluna: OrdenacaoDeClientes
  children: ReactNode
}) {
  const [parametros, definirParametros] = useSearchParams()
  const filtros = lerFiltros(parametros)
  const ordenando = filtros.sort === coluna

  function ordenar() {
    definirParametros((anteriores) => {
      const atuais = lerFiltros(anteriores)
      return escreverFiltros({
        ...atuais,
        sort: coluna,
        // Reacionar a coluna corrente alterna; trocar de coluna começa
        // crescente, que é a leitura natural de uma lista recém-ordenada.
        order: atuais.sort === coluna && atuais.order === 'asc' ? 'desc' : 'asc',
      })
    })
  }

  return (
    <th scope="col" aria-sort={ordenando ? ANUNCIO[filtros.order] : 'none'} className="px-3 py-2">
      <button type="button" onClick={ordenar} className="font-medium text-cloud-50">
        {children}
        <span aria-hidden="true"> {ordenando && filtros.order === 'asc' ? '↑' : '↓'}</span>
      </button>
    </th>
  )
}

/**
 * A carteira em tabela, de 768px para cima (CLNT-12 AC10).
 *
 * A troca para cartões é por utilitária responsiva, não por `matchMedia`: as
 * duas árvores recebem a mesma lista e o navegador decide qual pinta, já no
 * primeiro quadro e sem salto de layout.
 *
 * Nome muito longo é truncado por CSS, e não cortado no texto (edge case do
 * spec): o valor completo continua no DOM para quem ouve a tabela, e o `title`
 * o devolve a quem usa o mouse.
 */
export function TabelaDeClientes({ clientes }: Props) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">Clientes</caption>

        <thead className="border-b border-silver-400 text-silver-600">
          <tr>
            <CabecalhoOrdenavel coluna="name">Nome</CabecalhoOrdenavel>
            <th scope="col" className="px-3 py-2">
              Contato
            </th>
            <th scope="col" className="px-3 py-2">
              Status
            </th>
            <th scope="col" className="px-3 py-2">
              Região
            </th>
            <th scope="col" className="px-3 py-2">
              Renda
            </th>
            <CabecalhoOrdenavel coluna="created_at">Cadastrado em</CabecalhoOrdenavel>
          </tr>
        </thead>

        <tbody>
          {clientes.map((cliente) => (
            <tr key={cliente.id} className="border-b border-graphite-700">
              <td className="px-3 py-2">
                <Link
                  to={`/clients/${cliente.id}`}
                  title={cliente.name}
                  className="block max-w-[18rem] truncate text-rocket-500"
                >
                  {cliente.name}
                </Link>
              </td>

              {/* Dois clientes de mesmo nome se distinguem aqui (edge case do spec). */}
              <td className="px-3 py-2">
                <span className="block">{cliente.email ?? SEM_VALOR}</span>
                <span className="block text-silver-600">{formatarTelefone(cliente.phone)}</span>
              </td>

              <td className="px-3 py-2">{rotuloDeStatus(cliente.status)}</td>
              <td className="px-3 py-2">{cliente.region ?? SEM_VALOR}</td>
              <td className="px-3 py-2">{formatarRenda(cliente.income)}</td>
              <td className="px-3 py-2">{formatarData(cliente.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
