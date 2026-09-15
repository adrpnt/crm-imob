import { Link } from 'react-router'

/** Rota inexistente: explica e devolve o consultor ao CRM. */
export function PaginaNaoEncontrada() {
  return (
    <section className="rounded-surface border border-border bg-surface p-6 text-center">
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-ink-muted">O endereço acessado não existe ou foi movido.</p>
      <Link
        to="/"
        className="mt-4 inline-block rounded-control bg-primary px-4 py-2 font-medium text-primary-ink"
      >
        Voltar ao CRM
      </Link>
    </section>
  )
}
