import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { rendaParaNumero } from '../formato'
import { FormularioDeCliente } from './FormularioDeCliente'

type Props = Parameters<typeof FormularioDeCliente>[0]

function renderizar(props: Partial<Props> = {}) {
  const enviar = vi.fn<Props['aoEnviar']>().mockResolvedValue(undefined)
  render(<FormularioDeCliente aoEnviar={enviar} {...props} />)
  return enviar
}

const salvar = () => userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

/** Cliente completo, para o pré-preenchimento da edição. */
const EXISTENTE = {
  name: 'Joana Silva',
  email: 'joana@exemplo.com',
  phone: '11987654321',
  status: 'qualified',
  source: 'instagram',
  region: 'Zona Sul',
  income: 3500.5,
  income_type: 'formal',
} as const

/** O payload de um cadastro só com o nome: o resto sai indefinido, não vazio. */
const SO_O_NOME = {
  name: 'Ana Prado',
  email: undefined,
  phone: undefined,
  status: 'lead',
  source: undefined,
  region: undefined,
  income: undefined,
  income_type: undefined,
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('FormularioDeCliente', () => {
  it('exibe os oito campos editáveis com rótulo visível', () => {
    renderizar()

    for (const rotulo of [
      'Nome',
      'E-mail',
      'Telefone',
      'Status',
      'Origem',
      'Região',
      'Renda',
      'Tipo de renda',
    ]) {
      expect(screen.getByLabelText(rotulo)).toBeInTheDocument()
    }
  })

  it('pré-seleciona lead no status', () => {
    renderizar()
    expect(screen.getByLabelText('Status')).toHaveValue('lead')
  })

  it('oferece os cinco status do domínio, sem opção vazia', () => {
    renderizar()
    const status = screen.getByLabelText<HTMLSelectElement>('Status')

    expect([...status.options].map((opcao) => opcao.value)).toEqual([
      'lead',
      'contacted',
      'qualified',
      'client',
      'inactive',
    ])
  })

  it('oferece as seis origens e a opção de deixar em branco', () => {
    renderizar()
    const origem = screen.getByLabelText<HTMLSelectElement>('Origem')

    expect([...origem.options].map((opcao) => opcao.value)).toEqual([
      '',
      'indication',
      'instagram',
      'website',
      'whatsapp',
      'portal',
      'other',
    ])
  })

  // Edge case do spec: renda e tipo de renda são opcionais e independentes.
  it('aceita tipo de renda preenchido com a renda em branco', async () => {
    const enviar = renderizar()

    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Prado')
    await userEvent.selectOptions(screen.getByLabelText('Tipo de renda'), 'formal')
    await salvar()

    await waitFor(() =>
      expect(enviar).toHaveBeenCalledWith(
        { ...SO_O_NOME, income: undefined, income_type: 'formal' },
        expect.anything(),
      ),
    )
  })

  // AD-009: a lista de regiões é atalho, nunca conjunto fechado.
  it('oferece as regiões já usadas e aceita uma região nova', async () => {
    const enviar = renderizar({ sugestoesDeRegiao: ['Barra', 'Zona Sul'] })

    const sugeridas = [...document.querySelectorAll('datalist option')].map(
      (opcao) => (opcao as HTMLOptionElement).value,
    )
    expect(sugeridas).toEqual(['Barra', 'Zona Sul'])

    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Prado')
    await userEvent.type(screen.getByLabelText('Região'), 'Recreio dos Bandeirantes')
    await salvar()

    await waitFor(() =>
      expect(enviar).toHaveBeenCalledWith(
        { ...SO_O_NOME, region: 'Recreio dos Bandeirantes' },
        expect.anything(),
      ),
    )
  })

  // CLNT-01 AC1 e AC3: só o nome é obrigatório, e e-mail vazio é aceito.
  it('envia com apenas o nome preenchido', async () => {
    const enviar = renderizar()

    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Prado')
    await salvar()

    await waitFor(() => expect(enviar).toHaveBeenCalledWith(SO_O_NOME, expect.anything()))
  })

  it('converte a renda digitada com máscara em número', async () => {
    const enviar = renderizar()

    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Prado')
    await userEvent.type(screen.getByLabelText('Renda'), 'R$ 3.500,50')
    await salvar()

    await waitFor(() =>
      expect(enviar).toHaveBeenCalledWith({ ...SO_O_NOME, income: 3500.5 }, expect.anything()),
    )
  })

  it('recusa nome com menos de 2 caracteres, sem enviar', async () => {
    const enviar = renderizar()

    await userEvent.type(screen.getByLabelText('Nome'), 'A')
    await salvar()

    expect(await screen.findByText('O nome precisa de ao menos 2 caracteres')).toBeInTheDocument()
    expect(enviar).not.toHaveBeenCalled()
  })

  it('recusa e-mail de formato inválido, sem enviar', async () => {
    const enviar = renderizar()

    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Prado')
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@exemplo')
    await salvar()

    expect(await screen.findByText('Informe um e-mail válido')).toBeInTheDocument()
    expect(enviar).not.toHaveBeenCalled()
  })

  it('recusa renda negativa, sem enviar', async () => {
    const enviar = renderizar()

    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Prado')
    await userEvent.type(screen.getByLabelText('Renda'), '-10')
    await salvar()

    expect(await screen.findByText('A renda não pode ser negativa')).toBeInTheDocument()
    expect(enviar).not.toHaveBeenCalled()
  })

  it('recusa renda acima de 99.999.999,99, sem enviar', async () => {
    const enviar = renderizar()

    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Prado')
    await userEvent.type(screen.getByLabelText('Renda'), '100000000')
    await salvar()

    expect(await screen.findByText('A renda pode ser no máximo 99.999.999,99')).toBeInTheDocument()
    expect(enviar).not.toHaveBeenCalled()
  })

  // CLNT-18 AC5: quem navega por teclado precisa chegar ao erro sem procurá-lo.
  it('leva o foco para o primeiro campo inválido', async () => {
    renderizar()

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@exemplo')
    await salvar()

    await waitFor(() => expect(screen.getByLabelText('Nome')).toHaveFocus())
  })

  it('desabilita o botão durante o envio', async () => {
    const enviar = vi.fn<Props['aoEnviar']>().mockReturnValue(new Promise(() => {}))
    render(<FormularioDeCliente aoEnviar={enviar} />)

    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Prado')
    await salvar()

    const botao = await screen.findByRole('button', { name: 'Salvando…' })
    expect(botao).toBeDisabled()
    expect(botao).toHaveAttribute('aria-busy', 'true')
  })

  it('impede um segundo envio enquanto o primeiro está em andamento', async () => {
    const enviar = vi.fn<Props['aoEnviar']>().mockReturnValue(new Promise(() => {}))
    render(<FormularioDeCliente aoEnviar={enviar} />)

    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Prado')
    await salvar()

    await screen.findByRole('button', { name: 'Salvando…' })
    await userEvent.click(screen.getByRole('button', { name: 'Salvando…' }))

    expect(enviar).toHaveBeenCalledTimes(1)
  })

  it('exibe a causa da recusa do serviço em alerta', () => {
    renderizar({ erro: 'Você não tem permissão para esta alteração.' })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Você não tem permissão para esta alteração.',
    )
  })

  // CLNT-05 AC10: o consultor acabou de digitar oito campos; limpá-los por
  // causa de uma recusa do banco seria punir o erro.
  it('preserva o que foi digitado depois do envio', async () => {
    renderizar()

    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Prado')
    await userEvent.type(screen.getByLabelText('Telefone'), '11987654321')
    await salvar()

    await waitFor(() => expect(screen.getByLabelText('Nome')).toHaveValue('Ana Prado'))
    expect(screen.getByLabelText('Telefone')).toHaveValue('11987654321')
  })

  it('pré-preenche a partir dos valores existentes', () => {
    renderizar({ valoresIniciais: EXISTENTE })

    expect(screen.getByLabelText('Nome')).toHaveValue('Joana Silva')
    expect(screen.getByLabelText('E-mail')).toHaveValue('joana@exemplo.com')
    expect(screen.getByLabelText('Telefone')).toHaveValue('11987654321')
    expect(screen.getByLabelText('Status')).toHaveValue('qualified')
    expect(screen.getByLabelText('Origem')).toHaveValue('instagram')
    expect(screen.getByLabelText('Região')).toHaveValue('Zona Sul')
    expect(screen.getByLabelText('Tipo de renda')).toHaveValue('formal')
  })

  // A renda é número no schema e texto na tela: exibida com o ponto de milhar
  // do JavaScript, um toque no campo a transformaria em 35005.
  it('exibe a renda pré-preenchida em reais e a devolve intacta', async () => {
    const enviar = renderizar({ valoresIniciais: EXISTENTE })

    const renda = screen.getByLabelText<HTMLInputElement>('Renda')
    await waitFor(() => expect(renda.value).toContain('3.500,50'))
    expect(rendaParaNumero(renda.value)).toBe(3500.5)

    await salvar()

    await waitFor(() =>
      expect(enviar).toHaveBeenCalledWith({ ...EXISTENTE, income: 3500.5 }, expect.anything()),
    )
  })

  it('avisa o consumidor quando o formulário passa a ter alterações pendentes', async () => {
    const sujeira = vi.fn()
    renderizar({ aoMudarSujeira: sujeira })

    expect(sujeira).toHaveBeenLastCalledWith(false)

    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Prado')

    await waitFor(() => expect(sujeira).toHaveBeenLastCalledWith(true))
  })
})
