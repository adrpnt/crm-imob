import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'

import { supabase } from '../../../lib/supabase'
import { PADROES, type FiltrosDeClientes } from '../filtros'
import { buscarCliente, listarClientes, listarRegioes, type Cliente } from './client-service'

vi.mock('../../../lib/supabase', () => ({ supabase: { from: vi.fn() } }))

const from = vi.mocked(supabase.from)

type RespostaDoPostgrest = { data: unknown; error: unknown; count?: number | null }

/**
 * Construtor de consulta do PostgREST em miniatura.
 *
 * Os encadeadores devolvem o próprio objeto e o objeto é aguardável, que é
 * como o `supabase-js` se comporta: `await consulta.order(...).range(...)` e
 * `await from('clients').select('region')` resolvem igual.
 */
function consultaQueDevolve(resposta: RespostaDoPostgrest) {
  const construtor: Record<string, unknown> = {}
  for (const metodo of ['select', 'ilike', 'or', 'eq', 'order', 'range']) {
    construtor[metodo] = vi.fn(() => construtor)
  }
  construtor.single = vi.fn(() => Promise.resolve(resposta))
  construtor.then = (aceitar: (r: RespostaDoPostgrest) => unknown) =>
    Promise.resolve(resposta).then(aceitar)

  from.mockReturnValue(construtor as never)
  return construtor as Record<string, Mock>
}

function filtros(ajustes: Partial<FiltrosDeClientes> = {}): FiltrosDeClientes {
  return { ...PADROES, ...ajustes }
}

const CLIENTE: Cliente = {
  id: 'c1',
  owner_id: 'u1',
  name: 'Joana Silva',
  email: 'joana@exemplo.com',
  phone: '11987654321',
  status: 'lead',
  source: 'instagram',
  region: 'Zona Sul',
  income: 5000,
  income_type: 'formal',
  search_text: 'joana silva joana@exemplo.com 11987654321',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('listarClientes', () => {
  // CLNT-07 AC1 e AC11: linhas e total na mesma resposta, sem duas idas.
  it('faz um único request com count exact e o intervalo da primeira página', async () => {
    const consulta = consultaQueDevolve({ data: [CLIENTE], error: null, count: 1 })

    await listarClientes(filtros())

    expect(from).toHaveBeenCalledTimes(1)
    expect(consulta.select).toHaveBeenCalledWith('*', { count: 'exact' })
    expect(consulta.range).toHaveBeenCalledWith(0, 19)
  })

  it('devolve os clientes e o total que satisfaz os filtros', async () => {
    consultaQueDevolve({ data: [CLIENTE], error: null, count: 37 })

    expect(await listarClientes(filtros())).toEqual({ clientes: [CLIENTE], total: 37 })
  })

  it('pede o intervalo correspondente à página pedida', async () => {
    const consulta = consultaQueDevolve({ data: [], error: null, count: 0 })

    await listarClientes(filtros({ page: 3 }))

    expect(consulta.range).toHaveBeenCalledWith(40, 59)
  })

  // A coluna gerada já concatena nome, e-mail e telefone, e é a única coberta
  // pelo índice trigram. Um `.or()` de três colunas não usaria índice nenhum.
  it('busca com um ilike sobre search_text, e não com um or de três colunas', async () => {
    const consulta = consultaQueDevolve({ data: [CLIENTE], error: null, count: 1 })

    await listarClientes(filtros({ busca: 'Joana' }))

    expect(consulta.ilike).toHaveBeenCalledWith('search_text', '%joana%')
    expect(consulta.or).not.toHaveBeenCalled()
  })

  // CLNT-08 AC3: o telefone é gravado sem máscara, então o termo digitado com
  // parênteses precisa do segundo padrão — na mesma coluna indexada.
  it('acrescenta o padrão de telefone na mesma coluna quando o termo tem dígitos', async () => {
    const consulta = consultaQueDevolve({ data: [CLIENTE], error: null, count: 1 })

    await listarClientes(filtros({ busca: '(11) 98765' }))

    // Os valores vão entre aspas: vírgula, parêntese e espaço são separadores
    // da própria expressão `or=`, e sem as aspas a consulta quebra.
    expect(consulta.or).toHaveBeenCalledWith(
      'search_text.ilike."%(11) 98765%",search_text.ilike."%1198765%"',
    )
    expect(consulta.ilike).not.toHaveBeenCalled()
  })

  it('não aplica filtro de busca quando o termo está vazio', async () => {
    const consulta = consultaQueDevolve({ data: [CLIENTE], error: null, count: 1 })

    await listarClientes(filtros({ busca: '   ' }))

    expect(consulta.ilike).not.toHaveBeenCalled()
    expect(consulta.or).not.toHaveBeenCalled()
  })

  // CLNT-09 AC4: busca e os três filtros combinam por E lógico.
  it('combina status, origem e região com a busca por E lógico', async () => {
    const consulta = consultaQueDevolve({ data: [CLIENTE], error: null, count: 1 })

    await listarClientes(
      filtros({ busca: 'joana', status: 'lead', origem: 'instagram', regiao: 'Zona Sul' }),
    )

    expect(consulta.ilike).toHaveBeenCalledWith('search_text', '%joana%')
    expect(consulta.eq.mock.calls).toEqual([
      ['status', 'lead'],
      ['source', 'instagram'],
      ['region', 'Zona Sul'],
    ])
  })

  // CLNT-11: ordenação por nome ou data, nas duas direções.
  it('ordena por created_at decrescente por padrão e por nome crescente quando pedido', async () => {
    const padrao = consultaQueDevolve({ data: [], error: null, count: 0 })
    await listarClientes(filtros())
    expect(padrao.order).toHaveBeenCalledWith('created_at', { ascending: false })

    const porNome = consultaQueDevolve({ data: [], error: null, count: 0 })
    await listarClientes(filtros({ sort: 'name', order: 'asc' }))
    expect(porNome.order).toHaveBeenCalledWith('name', { ascending: true })
  })

  // A política já restringe as linhas. Filtrar por owner_id aqui daria a
  // impressão falsa de que é o filtro que protege — e um dia alguém o removeria.
  it('não filtra por owner_id em nenhum dos caminhos', async () => {
    const consulta = consultaQueDevolve({ data: [CLIENTE], error: null, count: 1 })

    await listarClientes(
      filtros({ busca: 'joana', status: 'lead', origem: 'instagram', regiao: 'Zona Sul' }),
    )

    expect(consulta.eq.mock.calls.map(([coluna]) => coluna)).not.toContain('owner_id')
    expect(JSON.stringify(consulta.ilike.mock.calls)).not.toContain('owner_id')
    expect(JSON.stringify(consulta.or.mock.calls)).not.toContain('owner_id')
  })

  // Leitura lança, como em `profile-service`: engolir faria a tela exibir lista
  // vazia como se a carteira estivesse vazia.
  it('propaga o erro em vez de devolver lista vazia', async () => {
    consultaQueDevolve({
      data: null,
      error: { code: '42501', message: 'permission denied' },
      count: null,
    })

    await expect(listarClientes(filtros())).rejects.toMatchObject({ code: '42501' })
  })

  it('trata total ausente como zero', async () => {
    consultaQueDevolve({ data: [], error: null, count: null })

    expect(await listarClientes(filtros())).toEqual({ clientes: [], total: 0 })
  })
})

describe('buscarCliente', () => {
  it('lê o cliente pelo identificador', async () => {
    const consulta = consultaQueDevolve({ data: CLIENTE, error: null })

    expect(await buscarCliente('c1')).toEqual(CLIENTE)
    expect(consulta.eq).toHaveBeenCalledWith('id', 'c1')
    expect(consulta.single).toHaveBeenCalled()
  })

  // CLNT-14 AC2: a RLS filtra a linha de outro dono e o `.single()` falha. Um
  // cliente vazio fabricado apareceria na ficha como se fosse real.
  it('propaga o erro em vez de fabricar um cliente vazio', async () => {
    consultaQueDevolve({ data: null, error: { code: 'PGRST116', message: 'no rows' } })

    await expect(buscarCliente('c1')).rejects.toMatchObject({ code: 'PGRST116' })
  })
})

describe('listarRegioes', () => {
  // Edge case do spec: caixa diferente é a mesma região (AD-009).
  it('agrupa variações de caixa e ordena alfabeticamente', async () => {
    consultaQueDevolve({
      data: [
        { region: 'Zona Sul' },
        { region: 'Centro' },
        { region: 'zona sul' },
        { region: 'Barra' },
      ],
      error: null,
    })

    expect(await listarRegioes()).toEqual(['Barra', 'Centro', 'Zona Sul'])
  })

  it('ignora clientes sem região', async () => {
    consultaQueDevolve({ data: [{ region: null }, { region: 'Centro' }], error: null })

    expect(await listarRegioes()).toEqual(['Centro'])
  })

  it('propaga o erro da consulta', async () => {
    consultaQueDevolve({ data: null, error: { code: '42501', message: 'permission denied' } })

    await expect(listarRegioes()).rejects.toMatchObject({ code: '42501' })
  })
})
