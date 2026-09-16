/**
 * Indicador de carregamento das guardas de rota.
 *
 * Existe para que a guarda tenha o que renderizar enquanto a sessão não foi
 * resolvida. Renderizar `null` ali daria uma tela em branco; renderizar a rota
 * ou o login daria o redirecionamento prematuro que o PLAN §6 proíbe.
 */
export function Carregando({ rotulo = 'Carregando' }: { rotulo?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-40 items-center justify-center">
      <span className="text-ink-muted">{rotulo}…</span>
    </div>
  )
}
