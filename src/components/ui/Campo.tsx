import { useId, type ComponentPropsWithRef, type ReactNode } from 'react'

type Props = Omit<ComponentPropsWithRef<'input'>, 'id' | 'aria-invalid' | 'aria-describedby'> & {
  /** Rótulo visível. Obrigatório de propósito: não existe campo sem rótulo. */
  rotulo: ReactNode
  /** Mensagem de erro do campo, quando houver. */
  erro?: string
  /** Texto de apoio permanente, exibido abaixo do controle. */
  dica?: ReactNode
}

/**
 * Campo de formulário com rótulo, controle e mensagem de erro amarrados.
 *
 * O rótulo é prop obrigatória, e não opcional com texto de exemplo como
 * alternativa. O PLAN §11 exige rótulo real: texto de exemplo desaparece
 * quando o consultor começa a digitar, e some por completo para quem usa
 * leitor de tela.
 *
 * A associação entre controle e erro é feita por `aria-describedby`, não por
 * proximidade visual — sem isso, quem não enxerga o layout não sabe a qual
 * campo a mensagem se refere.
 */
export function Campo({ rotulo, erro, dica, className, ...props }: Props) {
  const base = useId()
  const idDoControle = `${base}-controle`
  const idDoErro = `${base}-erro`
  const idDaDica = `${base}-dica`

  const descricoes = [dica ? idDaDica : null, erro ? idDoErro : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={idDoControle} className="text-sm font-medium text-cloud-50">
        {rotulo}
      </label>

      <input
        id={idDoControle}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricoes || undefined}
        className={[
          'rounded-control border bg-graphite-950 px-3 py-2 text-cloud-50',
          erro ? 'border-danger' : 'border-graphite-400',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />

      {dica ? (
        <p id={idDaDica} className="text-sm text-silver-600">
          {dica}
        </p>
      ) : null}

      {erro ? (
        <p id={idDoErro} className="text-sm text-danger">
          {erro}
        </p>
      ) : null}
    </div>
  )
}
