import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { ConfirmacaoDeSaida } from '../components/ConfirmacaoDeSaida'
import { FormularioDeCliente } from '../components/FormularioDeCliente'
import { useCreateClient } from '../hooks/escrita'
import { useRegioes } from '../hooks/leitura'
import type { DadosDeCliente } from '../schemas'

/**
 * Cadastro de cliente, em `/clients/new` (CLNT-01).
 *
 * A confirmação viaja para a ficha no estado da navegação, em vez de aparecer
 * aqui: o AC1 pede exibir confirmação **e** navegar, e um alerta nesta tela
 * some junto com ela no mesmo quadro. Quem o exibe é a ficha do cliente
 * recém-criado.
 *
 * A recusa do serviço não navega e não limpa nada (CLNT-05 AC10): a mensagem
 * pronta vem do `client-service`, e o formulário permanece com tudo que foi
 * digitado.
 */
export function NovoCliente() {
  const navegar = useNavigate()
  const criar = useCreateClient()
  const regioes = useRegioes()

  const [erro, setErro] = useState<string | null>(null)
  const [sujo, setSujo] = useState(false)
  // Marca que o cadastro concluiu antes de navegar. A confirmação de saída lê
  // esta referência no instante da navegação, e não o estado do render.
  const concluido = useRef(false)

  async function aoEnviar(dados: DadosDeCliente) {
    setErro(null)
    const resultado = await criar.mutateAsync(dados)

    if (!resultado.ok) {
      setErro(resultado.mensagem)
      return
    }

    concluido.current = true
    // `replace` porque voltar para um formulário já enviado não é um destino
    // útil: o gesto de voltar pertence à ficha, que leva à listagem.
    navegar(`/clients/${resultado.cliente.id}`, {
      replace: true,
      state: { mensagem: 'Cliente cadastrado.' },
    })
  }

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-xl">Novo cliente</h1>

      <div className="mt-4">
        <FormularioDeCliente
          sugestoesDeRegiao={regioes.data ?? []}
          erro={erro}
          rotuloDeEnvio="Cadastrar cliente"
          aoEnviar={aoEnviar}
          aoMudarSujeira={setSujo}
        />
      </div>

      <p className="mt-4 text-sm">
        <Link to="/clients" className="text-rocket-500">
          Voltar para a listagem
        </Link>
      </p>

      <ConfirmacaoDeSaida temAlteracoes={() => sujo && !concluido.current} />
    </section>
  )
}
