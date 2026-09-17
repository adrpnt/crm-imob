import { useEffect, useRef, type ChangeEvent } from 'react'
import { useSearchParams } from 'react-router'

import { Campo } from '../../../components/ui/Campo'
import { PADROES, escreverFiltros, lerFiltros } from '../filtros'

/**
 * A pausa que o spec fixa: a busca aplica após 300ms sem nova digitação
 * (CLNT-08 AC2). Sem ela haveria uma consulta por tecla, e um nome de dez
 * letras custaria dez idas ao servidor para exibir um resultado só.
 */
const ATRASO = 300

/**
 * Campo de busca da listagem, com atraso antes de escrever na URL (CLNT-08).
 *
 * O controle é **não controlado**: quem guarda o que está sendo digitado é o
 * próprio DOM, não um `useState`. Isso não é economia de linha, é o que o
 * AD-015 exige — a URL é a fonte única do estado da listagem, e um estado de
 * React espelhando o filtro precisaria de um efeito para voltar a concordar
 * com ela, que é exatamente a dessincronia que a decisão elimina.
 *
 * O que fica em React é apenas o rascunho ainda não aplicado, e ele vive no
 * DOM até a pausa. Quando a URL muda **por fora** — voltar do navegador, ou a
 * ação de limpar os filtros — o efeito abaixo devolve o campo ao termo da URL.
 */
export function BarraDeBusca() {
  const [parametros, definirParametros] = useSearchParams()
  const busca = lerFiltros(parametros).busca

  const campo = useRef<HTMLInputElement>(null)
  /** Último termo que **nós** escrevemos, para distinguir eco de mudança externa. */
  const enviado = useRef(busca)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const pendente = temporizador
    // Sair da listagem com uma digitação recém-parada não pode escrever a
    // busca numa URL que já é outra tela.
    return () => {
      if (pendente.current !== null) clearTimeout(pendente.current)
    }
  }, [])

  useEffect(() => {
    // Eco da nossa própria escrita: o campo já contém o termo, e sobrescrevê-lo
    // apagaria o que foi digitado durante a navegação.
    if (busca === enviado.current) return
    enviado.current = busca
    if (campo.current !== null) campo.current.value = busca
  }, [busca])

  function aoDigitar(evento: ChangeEvent<HTMLInputElement>) {
    const digitado = evento.target.value
    if (temporizador.current !== null) clearTimeout(temporizador.current)

    temporizador.current = setTimeout(() => {
      enviado.current = digitado.trim()
      definirParametros((anteriores) =>
        // A página volta para a primeira (AC8): manter a página 3 ao buscar
        // devolveria uma lista vazia sem explicação aparente. Os demais
        // filtros são lidos do estado corrente e reescritos, para que buscar
        // não desfaça um filtro de status.
        escreverFiltros({ ...lerFiltros(anteriores), busca: digitado, page: PADROES.page }),
      )
    }, ATRASO)
  }

  return (
    <Campo
      ref={campo}
      type="search"
      rotulo="Buscar"
      dica="Nome, e-mail ou telefone"
      defaultValue={busca}
      onChange={aoDigitar}
    />
  )
}
