import { Link, useLocation, useSearchParams } from 'react-router'

import { Esqueleto } from '../../../components/feedback/Esqueleto'
import { Alerta } from '../../../components/ui/Alerta'
import { Botao } from '../../../components/ui/Botao'
import { BarraDeBusca } from '../components/BarraDeBusca'
import { CartoesDeClientes } from '../components/CartoesDeClientes'
import { Paginacao } from '../components/Paginacao'
import { BotaoDeLimparFiltros, PainelDeFiltros } from '../components/PainelDeFiltros'
import { TabelaDeClientes } from '../components/TabelaDeClientes'
import { lerFiltros, type FiltrosDeClientes } from '../filtros'
import { useClients } from '../hooks/leitura'

/**
 * Há filtro aplicado? É o que separa os dois estados vazios do CLNT-13.
 *
 * Carteira vazia e busca sem resultado parecem a mesma tela em branco e pedem
 * ações opostas: uma convida ao primeiro cadastro, a outra a limpar o que foi
 * filtrado (AC13 e AC14).
 */
function temFiltros(filtros: FiltrosDeClientes): boolean {
  return (
    filtros.busca !== '' ||
    filtros.status !== null ||
    filtros.origem !== null ||
    filtros.regiao !== null
  )
}

/**
 * A confirmação vinda da tela que navegou para cá — hoje, a exclusão
 * (CLNT-16 AC3).
 *
 * A mensagem viaja no estado da navegação porque a tela de origem sai no mesmo
 * quadro em que confirma, como já acontece entre o cadastro e a ficha. O estado
 * do histórico é escrito por quem navega, então é lido como desconhecido.
 */
function mensagemDe(estado: unknown): string | null {
  if (typeof estado !== 'object' || estado === null) return null
  const { mensagem } = estado as { mensagem?: unknown }
  return typeof mensagem === 'string' ? mensagem : null
}

/**
 * A listagem da carteira, em `/clients` (CLNT-07, CLNT-10, CLNT-11, CLNT-13).
 *
 * Todo o estado da tela vem da URL (AD-015): a tela lê os filtros, a chave do
 * TanStack Query deriva deles, e os componentes que mudam algum filtro
 * navegam. Não há estado local de listagem, nem efeito sincronizando os dois.
 *
 * Busca e filtros ficam fora do bloco de estados, montados em todos eles: no
 * erro e na busca sem resultado é justamente deles que o consultor precisa
 * para sair da situação (AC10 e AC15).
 */
export function ListaDeClientes() {
  const [parametros] = useSearchParams()
  const local = useLocation()
  const filtros = lerFiltros(parametros)
  const clientes = useClients(filtros)
  const mensagem = mensagemDe(local.state)

  return (
    <section>
      {mensagem ? (
        <Alerta tom="sucesso" className="mb-4">
          {mensagem}
        </Alerta>
      ) : null}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl">Clientes</h1>
        <Link
          to="/clients/new"
          className="rounded-control bg-rocket-500 px-4 py-2 font-medium text-graphite-950"
        >
          Novo cliente
        </Link>
      </header>

      <div className="mt-4 flex flex-col gap-3">
        <BarraDeBusca />
        <PainelDeFiltros />
      </div>

      <div className="mt-6">
        <Conteudo clientes={clientes} temFiltros={temFiltros(filtros)} />
      </div>
    </section>
  )
}

/**
 * Os cinco estados da listagem, e nenhuma área em branco entre eles (AC12 a
 * AC15).
 *
 * SPEC_DEVIATION: o desenho previa `TelaDeErro` para a falha de consulta.
 * Reason: `TelaDeErro` não recebe props e sua única ação recarrega a página
 * inteira, o que descarta o cache e não é "tentar de novo" — o AC15 pede
 * repetir a consulta preservando os filtros, que é o que `refetch` faz. A
 * `TelaDeErro` continua sendo a tela das fronteiras de erro.
 */
function Conteudo({
  clientes,
  temFiltros: filtrado,
}: {
  clientes: ReturnType<typeof useClients>
  temFiltros: boolean
}) {
  if (clientes.isPending) {
    return <Esqueleto linhas={8} rotulo="Carregando os clientes" />
  }

  if (clientes.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alerta tom="erro">Não foi possível carregar a carteira agora.</Alerta>
        <Botao variante="secundaria" onClick={() => void clientes.refetch()}>
          Tentar de novo
        </Botao>
      </div>
    )
  }

  if (clientes.data.total === 0) {
    return filtrado ? (
      <div className="flex flex-col items-start gap-3">
        <h2 className="text-lg">Nenhum cliente encontrado</h2>
        <p className="text-silver-600">Nenhum cliente satisfaz a busca e os filtros atuais.</p>
        <BotaoDeLimparFiltros />
      </div>
    ) : (
      <div className="flex flex-col items-start gap-3">
        <h2 className="text-lg">Sua carteira está vazia</h2>
        <p className="text-silver-600">Cadastre o primeiro cliente para começar.</p>
        <Link
          to="/clients/new"
          className="rounded-control bg-rocket-500 px-4 py-2 font-medium text-graphite-950"
        >
          Cadastrar o primeiro cliente
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <TabelaDeClientes clientes={clientes.data.clientes} />
      <CartoesDeClientes clientes={clientes.data.clientes} />
      <Paginacao total={clientes.data.total} />
    </div>
  )
}
