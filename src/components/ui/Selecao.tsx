import { useId, type ComponentPropsWithRef, type ReactNode } from 'react'

export type OpcaoDeSelecao = { valor: string; rotulo: string }

type Props = Omit<
  ComponentPropsWithRef<'select'>,
  'id' | 'aria-invalid' | 'aria-describedby' | 'children'
> & {
  /** Rótulo visível. Obrigatório de propósito: não existe seleção sem rótulo. */
  rotulo: ReactNode
  /** Pares de valor e rótulo. O valor é o que o banco aceita; o rótulo, o que o consultor lê. */
  opcoes: readonly OpcaoDeSelecao[]
  /**
   * Texto da opção de valor vazio. Ausente, a seleção não a oferece.
   *
   * Existe porque origem e tipo de renda são opcionais (CLNT-03 AC7): sem uma
   * opção vazia, o primeiro valor da lista viraria resposta por omissão.
   */
  opcaoVazia?: string
  /** Mensagem de erro do campo, quando houver. */
  erro?: string
  /** Texto de apoio permanente, exibido abaixo do controle. */
  dica?: ReactNode
}

/**
 * Seleção com rótulo, controle e mensagem de erro amarrados.
 *
 * É o par de `Campo` para `select`, com as mesmas garantias: rótulo real e
 * obrigatório (CLNT-18 AC1), erro associado por `aria-describedby` e marcado
 * por `aria-invalid` (AC5). As duas se comportam igual dentro do formulário
 * porque é o mesmo consultor navegando de um campo ao outro.
 *
 * O controle é um `select` nativo, e não uma lista construída à mão: ele já
 * vem operável por teclado, anunciado pelo leitor de tela e com o seletor do
 * sistema no celular.
 */
export function Selecao({ rotulo, opcoes, opcaoVazia, erro, dica, className, ...props }: Props) {
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

      <select
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
      >
        {opcaoVazia === undefined ? null : <option value="">{opcaoVazia}</option>}
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>

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
