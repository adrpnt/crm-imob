import type { ComponentPropsWithRef, ReactNode } from 'react'

export type VarianteDeBotao = 'primaria' | 'secundaria'

type Props = Omit<ComponentPropsWithRef<'button'>, 'disabled'> & {
  variante?: VarianteDeBotao
  /** Enquanto verdadeiro, o botão fica inerte e anuncia progresso. */
  enviando?: boolean
  /** Desabilita por outro motivo que não o envio. */
  inativo?: boolean
  children: ReactNode
}

const ESTILOS: Record<VarianteDeBotao, string> = {
  primaria: 'bg-primary text-primary-ink',
  secundaria: 'border border-border bg-surface text-ink',
}

/**
 * Botão com estado de envio.
 *
 * `type` é `button` por padrão, e não `submit`. O padrão do HTML dentro de um
 * formulário é `submit`, o que transforma qualquer botão esquecido — cancelar,
 * alternar visibilidade da senha — em envio acidental. As telas declaram
 * `type="submit"` onde realmente querem enviar.
 *
 * Enquanto `enviando`, o botão fica desabilitado. É o que cumpre a prevenção de
 * submissão duplicada do AUTH-01: não depende de a tela lembrar de ignorar o
 * segundo clique.
 *
 * A variante destrutiva não existe aqui de propósito: `auth` não tem ação
 * destrutiva, e criá-la sem consumidor seria abstração especulativa. Ela nasce
 * em `clients`, junto da exclusão que a exige.
 */
export function Botao({
  variante = 'primaria',
  enviando = false,
  inativo = false,
  type = 'button',
  className,
  children,
  ...props
}: Props) {
  return (
    <button
      type={type}
      data-variante={variante}
      disabled={enviando || inativo}
      aria-busy={enviando || undefined}
      className={[
        'rounded-control px-4 py-2 font-medium disabled:opacity-60',
        ESTILOS[variante],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
