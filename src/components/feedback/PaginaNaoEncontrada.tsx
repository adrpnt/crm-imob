import { Link } from 'react-router'

/** Rota inexistente: explica e devolve o consultor ao CRM. */
export function PaginaNaoEncontrada() {
  return (
    <section className="rounded-surface border border-graphite-700 bg-graphite-800 p-6 text-center">
      <h1 className="text-xl">Página não encontrada</h1>
      <p className="mt-2 text-silver-600">O endereço acessado não existe ou foi movido.</p>
      <Link
        to="/"
        className="mt-4 inline-block rounded-control bg-rocket-500 px-4 py-2 font-medium text-graphite-950"
      >
        Voltar ao CRM
      </Link>
    </section>
  )
}
