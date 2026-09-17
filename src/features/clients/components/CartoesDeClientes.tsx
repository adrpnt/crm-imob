import { Link } from 'react-router'

import { SEM_VALOR, formatarTelefone } from '../formato'
import { STATUS } from '../schemas'
import type { Cliente } from '../services/client-service'

type Props = {
  clientes: readonly Cliente[]
}

/**
 * Repetido em `TabelaDeClientes` de propósito: um arquivo de componentes que
 * exporta função quebra o recarregamento rápido do Vite, e mover a busca para
 * um módulo comum é trabalho de refatoração que não pertence a esta tarefa.
 */
function rotuloDeStatus(valor: string): string {
  return STATUS.find((status) => status.valor === valor)?.rotulo ?? valor
}

/**
 * A mesma carteira em cartões, abaixo de 768px (CLNT-12 AC10).
 *
 * A alternância com a tabela é utilitária responsiva — `md:hidden` aqui,
 * `hidden md:block` lá — e não `matchMedia` em JavaScript. As duas árvores
 * recebem a mesma lista e ficam montadas ao mesmo tempo: o navegador decide
 * qual pinta já no primeiro quadro, sem salto de layout e sem o risco de um
 * dado existir só no desktop.
 */
export function CartoesDeClientes({ clientes }: Props) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {clientes.map((cliente) => (
        <li
          key={cliente.id}
          className="rounded-surface border border-graphite-400 bg-graphite-800 p-4"
        >
          <Link
            to={`/clients/${cliente.id}`}
            title={cliente.name}
            className="block truncate text-rocket-500"
          >
            {cliente.name}
          </Link>

          <p className="mt-1 text-sm text-cloud-50">{cliente.email ?? SEM_VALOR}</p>
          <p className="text-sm text-silver-600">{formatarTelefone(cliente.phone)}</p>

          <p className="mt-2 text-sm text-cloud-50">
            {rotuloDeStatus(cliente.status)}
            <span className="text-silver-600"> · {cliente.region ?? SEM_VALOR}</span>
          </p>
        </li>
      ))}
    </ul>
  )
}
