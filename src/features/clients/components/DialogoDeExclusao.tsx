import { useState } from 'react'
import { useNavigate, type To } from 'react-router'

import { Botao } from '../../../components/ui/Botao'
import { Dialogo } from '../../../components/ui/Dialogo'
import { useDeleteClient } from '../hooks/escrita'

type Props = {
  aberto: boolean
  /** O cliente em jogo. O nome vai na confirmação, porque é o que está sendo apagado. */
  cliente: { id: string; name: string }
  /** Para onde voltar depois de excluir: a listagem com os filtros de origem (CLNT-16 AC3). */
  destino: To
  /** Fecha sem excluir. Chamado pelo cancelamento e pelo Escape. */
  aoFechar: () => void
}

/**
 * Confirmação de exclusão (CLNT-16, CLNT-17).
 *
 * A exclusão é física e definitiva, e leva as notas junto pela chave
 * estrangeira de `notes` — por isso o diálogo nomeia o cliente e diz as duas
 * coisas antes de oferecer o gesto. O cancelamento é o foco padrão, e vem do
 * `Dialogo`: a opção segura é a que está sob o dedo quando ele abre.
 *
 * A confirmação de sucesso viaja no estado da navegação, como no cadastro e na
 * edição: a listagem é quem a exibe, porque esta tela sai no mesmo quadro.
 *
 * A recusa mantém o diálogo aberto e o registro visível (AC6). Não há recuo de
 * página a calcular aqui: o total volta menor da consulta refeita e a
 * `Paginacao` recua sozinha quando a página corrente deixa de existir (AC5).
 */
export function DialogoDeExclusao({ aberto, cliente, destino, aoFechar }: Props) {
  const navegar = useNavigate()
  const excluir = useDeleteClient()
  const [erro, setErro] = useState<string | null>(null)

  async function confirmar() {
    setErro(null)
    const resultado = await excluir.mutateAsync(cliente.id)

    if (!resultado.ok) {
      setErro(resultado.mensagem)
      return
    }

    navegar(destino, { replace: true, state: { mensagem: 'Cliente excluído.' } })
  }

  return (
    <Dialogo
      aberto={aberto}
      titulo="Excluir cliente?"
      descricao={
        <>
          Excluir <strong className="text-cloud-50">{cliente.name}</strong> é irreversível, e as
          notas dele serão removidas junto.
          {/*
            O erro é um `span` com `role="alert"`, e não o `Alerta`: a descrição
            do `Dialogo` é um parágrafo, e um bloco dentro dele seria HTML
            inválido. O marcador textual segue a convenção do `Alerta`, para que
            a falha não dependa só da cor.
          */}
          {erro ? (
            <span role="alert" className="mt-2 block text-danger">
              <strong className="font-semibold">Erro:</strong> {erro}
            </span>
          ) : null}
        </>
      }
      aoFechar={aoFechar}
    >
      <Botao variante="destrutiva" enviando={excluir.isPending} onClick={() => void confirmar()}>
        {excluir.isPending ? 'Excluindo…' : 'Excluir'}
      </Botao>
    </Dialogo>
  )
}
