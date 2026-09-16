import type { ReactNode } from 'react'

export type TomDeAlerta = 'erro' | 'aviso' | 'sucesso' | 'informacao'

type Props = {
  tom?: TomDeAlerta
  children: ReactNode
  className?: string
}

/**
 * Cada tom tem um marcador textual, e não apenas uma cor.
 *
 * Distinguir erro de sucesso só por cor deixa de fora quem não separa vermelho
 * de verde, que é a deficiência de visão de cores mais comum. O marcador
 * também dá contexto a quem chega pela leitura linear da tela.
 */
const MARCADOR: Record<TomDeAlerta, string> = {
  erro: 'Erro',
  aviso: 'Atenção',
  sucesso: 'Pronto',
  informacao: 'Aviso',
}

const ESTILO: Record<TomDeAlerta, string> = {
  erro: 'border-danger text-danger',
  aviso: 'border-warning text-warning',
  sucesso: 'border-success text-success',
  informacao: 'border-border text-ink',
}

/**
 * Mensagem de nível de formulário.
 *
 * Erro usa `role="alert"`, que interrompe o leitor de tela: a pessoa precisa
 * saber agora que o envio falhou. Os demais tons usam `role="status"`, que
 * aguarda uma pausa — anunciar "pronto, salvo" por cima do que está sendo lido
 * atrapalha mais do que ajuda.
 */
export function Alerta({ tom = 'informacao', children, className }: Props) {
  return (
    <div
      role={tom === 'erro' ? 'alert' : 'status'}
      data-tom={tom}
      className={['rounded-control border px-3 py-2 text-sm', ESTILO[tom], className]
        .filter(Boolean)
        .join(' ')}
    >
      <strong className="font-semibold">{MARCADOR[tom]}:</strong> {children}
    </div>
  )
}
