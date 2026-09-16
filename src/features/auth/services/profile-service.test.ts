import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { supabase } from '../../../lib/supabase'
import { atualizarPerfil, buscarPerfil } from './profile-service'

vi.mock('../../../lib/supabase', () => ({ supabase: { from: vi.fn() } }))

const from = vi.mocked(supabase.from)

/** Encadeamento do PostgREST: update → eq → select → single. */
function updateQueDevolve(resultado: unknown) {
  const single = vi.fn().mockResolvedValue(resultado)
  const select = vi.fn().mockReturnValue({ single })
  const eq = vi.fn().mockReturnValue({ select })
  const update = vi.fn().mockReturnValue({ eq })
  from.mockReturnValue({ update } as never)
  return { update, eq }
}

function selectQueDevolve(resultado: unknown) {
  const single = vi.fn().mockResolvedValue(resultado)
  const select = vi.fn().mockReturnValue({ single })
  from.mockReturnValue({ select } as never)
  return { select }
}

const PERFIL = {
  id: 'u1',
  full_name: 'Joana Silva',
  email: 'joana@exemplo.com',
  phone: '11987654321',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('buscarPerfil', () => {
  it('devolve o perfil lido', async () => {
    selectQueDevolve({ data: PERFIL, error: null })
    expect(await buscarPerfil()).toEqual(PERFIL)
  })

  // Engolir o erro e devolver um objeto fabricado faria a tela exibir um perfil
  // vazio como se fosse real, em vez de dizer que a leitura falhou.
  it('propaga o erro em vez de fabricar um perfil vazio', async () => {
    selectQueDevolve({ data: null, error: { code: 'PGRST116', message: 'no rows' } })
    await expect(buscarPerfil()).rejects.toMatchObject({ code: 'PGRST116' })
  })
})

describe('atualizarPerfil', () => {
  it('envia nome e telefone, e nada além disso', async () => {
    const { update, eq } = updateQueDevolve({ data: PERFIL, error: null })

    await atualizarPerfil({ id: 'u1', nomeCompleto: 'Joana M. Silva', telefone: '21912345678' })

    expect(update).toHaveBeenCalledWith({
      full_name: 'Joana M. Silva',
      phone: '21912345678',
    })
    expect(eq).toHaveBeenCalledWith('id', 'u1')
  })

  // A coluna está fora do grant de update (AD-008). Incluí-la faria o PostgREST
  // recusar TODO salvamento com 42501, e o consultor veria "não foi possível
  // salvar" para sempre.
  it('nunca envia o e-mail, que é imutável pela aplicação', async () => {
    const { update } = updateQueDevolve({ data: PERFIL, error: null })

    await atualizarPerfil({ id: 'u1', nomeCompleto: 'Joana', telefone: '11987654321' })

    expect(update.mock.calls[0][0]).not.toHaveProperty('email')
  })

  it('grava nulo quando o telefone é apagado, para a coluna aceitar', async () => {
    const { update } = updateQueDevolve({ data: PERFIL, error: null })

    await atualizarPerfil({ id: 'u1', nomeCompleto: 'Joana' })

    expect(update).toHaveBeenCalledWith({ full_name: 'Joana', phone: null })
  })

  it('devolve mensagem quando o servidor recusa, sem lançar', async () => {
    updateQueDevolve({ data: null, error: { code: '42501', message: 'permission denied' } })

    const resultado = await atualizarPerfil({ id: 'u1', nomeCompleto: 'Joana' })

    expect(resultado.ok).toBe(false)
    expect(resultado.ok === false && resultado.mensagem).toMatch(/não foi possível salvar/i)
  })

  it('registra o erro original antes de traduzir', async () => {
    const erro = { code: '42501', message: 'permission denied' }
    updateQueDevolve({ data: null, error: erro })

    await atualizarPerfil({ id: 'u1', nomeCompleto: 'Joana' })

    expect(console.error).toHaveBeenCalledWith('[falha ao atualizar perfil]', erro)
  })
})
