import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

import { Botao } from './Botao'

type Props = {
  aberto: boolean
  /** Título do diálogo. É ele que dá o nome acessível (CLNT-18 AC3). */
  titulo: string
  /** O que está em jogo: o cliente nomeado, o aviso de que a ação é irreversível. */
  descricao?: ReactNode
  /** Texto do cancelamento. "Cancelar" serve à exclusão; a saída do formulário usa o seu. */
  rotuloDeCancelar?: string
  /** Fecha sem executar a ação. Chamado pelo Escape e pelo cancelamento. */
  aoFechar: () => void
  /** A ação do diálogo. Quem a monta decide se é destrutiva. */
  children: ReactNode
}

/**
 * O que o navegador considera alcançável por teclado dentro do diálogo.
 *
 * `tabindex="-1"` fica de fora: recebe foco por programa, não por tabulação, e
 * incluí-lo faria a volta do último para o primeiro parar no lugar errado.
 */
const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Diálogo modal acessível, com foco confinado.
 *
 * Entrega o CLNT-18 AC3 e AC4 num lugar só, para os dois consumidores que
 * nascem com ele: a confirmação de exclusão e a saída do formulário com
 * alterações não salvas.
 *
 * Três comportamentos que uma sobreposição comum não tem, e que são o motivo
 * de este componente existir:
 *
 * 1. O foco entra no diálogo ao abrir e fica confinado nele, senão a tabulação
 *    passeia pela tela de trás, que o consultor não consegue ver.
 * 2. Escape fecha **sem executar a ação** — é o gesto de desistir, e confundi-lo
 *    com confirmar apagaria um cliente por engano.
 * 3. Ao fechar, o foco volta ao elemento que o abriu. Sem isso, quem navega por
 *    teclado recomeça do topo da página a cada confirmação.
 *
 * O cancelamento é renderizado aqui, e não recebido como filho, porque ele é o
 * foco padrão (CLNT-16 AC2): a opção segura é a que está sob o dedo quando o
 * diálogo abre. A ação vem como filho, e é quem monta o diálogo que decide se
 * ela é destrutiva.
 *
 * Não é o elemento `<dialog>` nativo: `showModal` não existe no ambiente de
 * teste, e o comportamento que importa aqui é justamente o que precisaria ser
 * verificado.
 */
export function Dialogo({
  aberto,
  titulo,
  descricao,
  rotuloDeCancelar = 'Cancelar',
  aoFechar,
  children,
}: Props) {
  const base = useId()
  const idDoTitulo = `${base}-titulo`
  const idDaDescricao = `${base}-descricao`

  const painel = useRef<HTMLDivElement>(null)
  const cancelamento = useRef<HTMLButtonElement>(null)
  const origem = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!aberto) return

    const anterior = document.activeElement
    origem.current = anterior instanceof HTMLElement ? anterior : null
    cancelamento.current?.focus()

    // A limpeza roda ao fechar e ao desmontar: os dois são "o diálogo saiu da
    // tela", e nos dois o foco precisa voltar de onde veio.
    return () => origem.current?.focus()
  }, [aberto])

  if (!aberto) return null

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === 'Escape') {
      aoFechar()
      return
    }

    if (evento.key !== 'Tab') return

    const focaveis = [...(painel.current?.querySelectorAll<HTMLElement>(FOCAVEIS) ?? [])]
    if (focaveis.length === 0) return

    const primeiro = focaveis[0]
    const ultimo = focaveis[focaveis.length - 1]

    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault()
      ultimo.focus()
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault()
      primeiro.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-graphite-950/80 p-4"
      onKeyDown={aoTeclar}
    >
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idDoTitulo}
        aria-describedby={descricao ? idDaDescricao : undefined}
        className="w-full max-w-md rounded-surface bg-graphite-800 p-6 text-cloud-50"
      >
        <h2 id={idDoTitulo} className="text-lg">
          {titulo}
        </h2>

        {descricao ? (
          <p id={idDaDescricao} className="mt-2 text-sm text-silver-600">
            {descricao}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Botao ref={cancelamento} variante="secundaria" onClick={aoFechar}>
            {rotuloDeCancelar}
          </Botao>
          {children}
        </div>
      </div>
    </div>
  )
}
