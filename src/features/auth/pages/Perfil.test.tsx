import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ContextoDeAutenticacao } from '../auth-context'
import { autenticado } from '../estado'
import {
  atualizarPerfil,
  buscarPerfil,
  type Perfil as TipoPerfil,
} from '../services/profile-service'
import { Perfil } from './Perfil'

vi.mock('../services/profile-service', async (original) => {
  const real = await original<typeof import('../services/profile-service')>()
  return { ...real, buscarPerfil: vi.fn(), atualizarPerfil: vi.fn() }
})

const buscar = vi.mocked(buscarPerfil)
const atualizar = vi.mocked(atualizarPerfil)

const SESSAO = { access_token: 'a', user: { id: 'u1' } } as unknown as Session

const PERFIL: TipoPerfil = {
  id: 'u1',
  full_name: 'Joana Silva',
  email: 'joana@exemplo.com',
  phone: '11987654321',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={cliente}>
      <ContextoDeAutenticacao.Provider value={autenticado(SESSAO)}>
        <Perfil />
      </ContextoDeAutenticacao.Provider>
    </QueryClientProvider>,
  )
  return cliente
}

beforeEach(() => {
  buscar.mockResolvedValue(PERFIL)
  atualizar.mockResolvedValue({ ok: true, perfil: PERFIL })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Perfil', () => {
  it('mostra progresso enquanto o perfil carrega, e não tela em branco', () => {
    buscar.mockReturnValue(new Promise(() => {}))
    renderizar()
    expect(screen.getByRole('status')).toHaveTextContent(/carregando seu perfil/i)
  })

  it('exibe nome, e-mail e telefone vindos do perfil', async () => {
    renderizar()
    expect(await screen.findByLabelText('Nome completo')).toHaveValue('Joana Silva')
    expect(screen.getByLabelText('E-mail')).toHaveValue('joana@exemplo.com')
    expect(screen.getByLabelText('Telefone')).toHaveValue('11987654321')
  })

  // AD-008: a aplicação nunca altera o e-mail. `readOnly` e não `disabled`,
  // porque campo desabilitado sai da ordem de tabulação e alguns leitores de
  // tela o ignoram, escondendo a informação que o consultor veio conferir.
  it('deixa o e-mail somente leitura, mas ainda alcançável', async () => {
    renderizar()
    const email = await screen.findByLabelText('E-mail')

    expect(email).toHaveAttribute('readonly')
    expect(email).not.toBeDisabled()
    await userEvent.type(email, 'outro')
    expect(email).toHaveValue('joana@exemplo.com')
  })

  it('explica que o e-mail não muda por ali', async () => {
    renderizar()
    const email = await screen.findByLabelText('E-mail')
    const dica = screen.getByText(/não pode ser alterado/i)
    expect(email).toHaveAttribute('aria-describedby', dica.id)
  })

  it('salva nome e telefone e confirma', async () => {
    renderizar()
    const nome = await screen.findByLabelText('Nome completo')

    await userEvent.clear(nome)
    await userEvent.type(nome, 'Joana M. Silva')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/informações foram salvas/i)
    expect(atualizar).toHaveBeenCalledWith({
      id: 'u1',
      nomeCompleto: 'Joana M. Silva',
      telefone: '11987654321',
    })
  })

  it('reduz o telefone a dígitos antes de salvar', async () => {
    renderizar()
    const telefone = await screen.findByLabelText('Telefone')

    await userEvent.clear(telefone)
    await userEvent.type(telefone, '(21) 91234-5678')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await screen.findByRole('status')
    expect(atualizar).toHaveBeenCalledWith(expect.objectContaining({ telefone: '21912345678' }))
  })

  it('aceita apagar o telefone', async () => {
    renderizar()
    const telefone = await screen.findByLabelText('Telefone')

    await userEvent.clear(telefone)
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await screen.findByRole('status')
    expect(atualizar).toHaveBeenCalledWith(expect.objectContaining({ telefone: undefined }))
  })

  it('recusa nome vazio sem chamar o serviço', async () => {
    renderizar()
    const nome = await screen.findByLabelText('Nome completo')

    await userEvent.clear(nome)
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Informe seu nome completo')).toBeInTheDocument()
    expect(atualizar).not.toHaveBeenCalled()
  })

  it('recusa nome acima de 120 caracteres sem chamar o serviço', async () => {
    renderizar()
    const nome = await screen.findByLabelText('Nome completo')

    await userEvent.clear(nome)
    await userEvent.type(nome, 'n'.repeat(121))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText(/no máximo 120 caracteres/i)).toBeInTheDocument()
    expect(atualizar).not.toHaveBeenCalled()
  })

  it('recusa telefone curto sem chamar o serviço', async () => {
    renderizar()
    const telefone = await screen.findByLabelText('Telefone')

    await userEvent.clear(telefone)
    await userEvent.type(telefone, '1234567')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText(/entre 8 e 20 dígitos/i)).toBeInTheDocument()
    expect(atualizar).not.toHaveBeenCalled()
  })

  // Invalidar em vez de escrever no cache é o que faz o cabeçalho, que lê a
  // mesma chave, exibir o nome novo sem recarregar a página.
  it('invalida a consulta do perfil após salvar, para o cabeçalho acompanhar', async () => {
    const cliente = renderizar()
    const invalidar = vi.spyOn(cliente, 'invalidateQueries')

    const nome = await screen.findByLabelText('Nome completo')
    await userEvent.clear(nome)
    await userEvent.type(nome, 'Outro Nome')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await screen.findByRole('status')
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['perfil'] })
  })

  it('explica quando a leitura do perfil falha', async () => {
    buscar.mockRejectedValue(new Error('sem rede'))
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar/i)
  })

  it('explica quando o salvamento falha, sem confirmar sucesso', async () => {
    atualizar.mockResolvedValue({ ok: false, mensagem: 'Não foi possível salvar agora.' })
    renderizar()

    const nome = await screen.findByLabelText('Nome completo')
    await userEvent.clear(nome)
    await userEvent.type(nome, 'Outro Nome')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível salvar/i)
    expect(screen.queryByText(/informações foram salvas/i)).not.toBeInTheDocument()
  })
})
