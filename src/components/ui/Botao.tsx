import type { ComponentPropsWithRef, ReactNode } from 'react'

export type VarianteDeBotao = 'primaria' | 'secundaria' | 'destrutiva'

type Props = Omit<ComponentPropsWithRef<'button'>, 'disabled'> & {
  variante?: VarianteDeBotao
  /** Enquanto verdadeiro, o botão fica inerte e anuncia progresso. */
  enviando?: boolean
  /** Desabilita por outro motivo que não o envio. */
  inativo?: boolean
  children: ReactNode
}

const ESTILOS: Record<VarianteDeBotao, string> = {
  // O texto é grafite, não branco: cloud-50 sobre rocket-500 mede 2.66:1 e
  // reprovaria o contraste exigido pela §11 do PLAN. Grafite dá 6.86:1.
  primaria: 'bg-rocket-500 text-graphite-950 hover:bg-rocket-600',
  secundaria: 'border border-silver-400 bg-graphite-700 text-cloud-50 hover:bg-graphite-600',
  // O par medido para ação destrutiva: danger-ink sobre danger-fill dá 5.31:1.
  // A marca é grafite, laranja e prata, e nenhum desses tons expressa exclusão
  // sem se confundir com a ação primária (CLNT-16 AC2).
  destrutiva: 'bg-danger-fill text-danger-ink hover:bg-danger-fill/90',
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
 * A variante destrutiva nasceu em `clients`, junto da exclusão que a exige
 * (CLNT-16). Ela fica visualmente distinta da primária, e não apenas mais
 * escura: confirmar uma exclusão e salvar um cadastro não podem parecer o
 * mesmo gesto.
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
