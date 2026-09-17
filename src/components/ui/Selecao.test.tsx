import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Selecao } from './Selecao'

const STATUS = [
  { valor: 'lead', rotulo: 'Lead' },
  { valor: 'contacted', rotulo: 'Contatado' },
  { valor: 'qualified', rotulo: 'Qualificado' },
]

describe('Selecao', () => {
  it('expõe o controle pelo rótulo visível', () => {
    render(<Selecao rotulo="Status" opcoes={STATUS} />)
    expect(screen.getByLabelText('Status')).toBeInTheDocument()
  })

  it('foca o controle ao clicar no rótulo, o que prova a amarração', async () => {
    render(<Selecao rotulo="Status" opcoes={STATUS} />)
    await userEvent.click(screen.getByText('Status'))
    expect(screen.getByLabelText('Status')).toHaveFocus()
  })

  // CLNT-03: o consultor lê o rótulo em português, e o banco recebe o valor do
  // check. Trocar um pelo outro passaria despercebido na tela e seria recusado
  // pelo banco.
  it('oferece as opções recebidas, com o rótulo em português e o valor do banco', () => {
    render(<Selecao rotulo="Status" opcoes={STATUS} />)

    const opcoes = screen.getAllByRole('option')
    expect(opcoes.map((o) => o.textContent)).toEqual(['Lead', 'Contatado', 'Qualificado'])
    expect(opcoes.map((o) => (o as HTMLOptionElement).value)).toEqual([
      'lead',
      'contacted',
      'qualified',
    ])
  })

  // CLNT-03 AC7: deixar em branco é válido para origem e tipo de renda. Sem a
  // opção vazia, a primeira da lista viraria resposta por omissão.
  it('oferece a opção vazia quando pedida, e não a inventa quando não', async () => {
    const { unmount } = render(<Selecao rotulo="Origem" opcoes={STATUS} opcaoVazia="Sem origem" />)

    const vazia = screen.getByRole('option', { name: 'Sem origem' }) as HTMLOptionElement
    expect(vazia.value).toBe('')

    const comVazia = screen.getByLabelText('Origem')
    await userEvent.selectOptions(comVazia, '')
    expect(comVazia).toHaveValue('')
    unmount()

    render(<Selecao rotulo="Status" opcoes={STATUS} />)
    expect(screen.getAllByRole('option')).toHaveLength(STATUS.length)
  })

  it('marca o controle como inválido e o associa à mensagem de erro', () => {
    render(<Selecao rotulo="Status" opcoes={STATUS} erro="Escolha um status da lista" />)

    const controle = screen.getByLabelText('Status')
    const mensagem = screen.getByText('Escolha um status da lista')

    expect(controle).toHaveAttribute('aria-invalid', 'true')
    expect(controle).toHaveAttribute('aria-describedby', mensagem.id)
    expect(mensagem.id).not.toBe('')
  })

  it('não marca como inválido quando não há erro, e associa só o apoio', () => {
    render(<Selecao rotulo="Status" opcoes={STATUS} dica="Começa como lead" />)

    const controle = screen.getByLabelText('Status')
    const dica = screen.getByText('Começa como lead')

    expect(controle).not.toHaveAttribute('aria-invalid')
    expect(controle).toHaveAttribute('aria-describedby', dica.id)
  })

  // CLNT-18 AC2: todo o formulário é operável pelo teclado.
  it('é alcançável pelo teclado e muda de valor por ele', async () => {
    render(<Selecao rotulo="Status" opcoes={STATUS} name="status" defaultValue="lead" />)

    const controle = screen.getByLabelText('Status')
    await userEvent.tab()
    expect(controle).toHaveFocus()

    await userEvent.selectOptions(controle, 'qualified')
    expect(controle).toHaveValue('qualified')
  })

  it('encaminha props ao controle, como o register do formulário exige', async () => {
    const escolhido: string[] = []
    render(
      <Selecao
        rotulo="Status"
        opcoes={STATUS}
        name="status"
        onChange={(e) => escolhido.push(e.target.value)}
      />,
    )

    const controle = screen.getByLabelText('Status')
    expect(controle).toHaveAttribute('name', 'status')
    await userEvent.selectOptions(controle, 'contacted')
    expect(escolhido).toEqual(['contacted'])
  })
})
