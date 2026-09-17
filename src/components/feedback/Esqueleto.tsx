/** Três linhas cobrem o caso mais comum: o bloco de campos da ficha. */
const LINHAS_PADRAO = 3

type Props = {
  /** Quantas barras desenhar. A tabela pede uma por linha; o cartão, poucas. */
  linhas?: number
  /** O que está carregando, para quem ouve a tela em vez de vê-la. */
  rotulo?: string
}

/**
 * Preenchimento de carregamento que substitui a área em branco (CLNT-13 AC12).
 *
 * As barras são decoração e ficam fora da árvore de acessibilidade: um leitor
 * de tela anunciando vinte retângulos vazios diria menos do que uma frase. O
 * anúncio é um só, numa região assistiva (CLNT-18 AC7), e não muda quando a
 * contagem de linhas muda — anunciar de novo a cada ajuste interromperia a
 * leitura sem nenhuma informação nova.
 *
 * O cinza é `graphite-700`, que é tom de divisória decorativa. Ele não serve
 * como borda de controle, mas aqui nada precisa ser identificado como
 * controle: não há nada com que interagir enquanto os dados não chegam.
 */
export function Esqueleto({ linhas = LINHAS_PADRAO, rotulo = 'Carregando' }: Props) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{rotulo}…</span>

      <div aria-hidden="true" className="flex flex-col gap-2">
        {Array.from({ length: linhas }, (_, indice) => (
          <div
            key={indice}
            data-linha
            className="h-4 animate-pulse rounded-control bg-graphite-700"
          />
        ))}
      </div>
    </div>
  )
}
