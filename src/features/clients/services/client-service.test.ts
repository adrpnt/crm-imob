import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { supabase } from '../../../lib/supabase'
import { PADROES, type FiltrosDeClientes } from '../filtros'
import type { DadosDeCliente } from '../schemas'
import {
  atualizarCliente,
  buscarCliente,
  criarCliente,
  excluirCliente,
  listarClientes,
  listarRegioes,
  type Cliente,
} from './client-service'

vi.mock('../../../lib/supabase', () => ({
  supabase: { from: vi.fn(), auth: { getSession: vi.fn() } },
}))

const from = vi.mocked(supabase.from)
const getSession = vi.mocked(supabase.auth.getSession)

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
  for (const metodo of [
    'select',
    'ilike',
    'or',
    'eq',
    'order',
    'range',
    'insert',
    'update',
    'delete',
  ]) {
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

beforeEach(() => {
  getSession.mockResolvedValue({
    data: { session: { user: { id: 'u1' } } },
    error: null,
  } as never)
  // `traduzirErro` registra o erro original antes de traduzir; sem o silêncio,
  // a saída da suíte fica ilegível.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
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

const DADOS: DadosDeCliente = {
  name: 'Joana Silva',
  email: 'joana@exemplo.com',
  phone: '11987654321',
  status: 'lead',
  source: 'instagram',
  region: 'Zona Sul',
  income: 5000,
  income_type: 'formal',
}

/** As oito colunas do grant de update, como o banco as recebe. */
const OITO_COLUNAS = {
  name: 'Joana Silva',
  email: 'joana@exemplo.com',
  phone: '11987654321',
  status: 'lead',
  source: 'instagram',
  region: 'Zona Sul',
  income: 5000,
  income_type: 'formal',
}

describe('criarCliente', () => {
  // CLNT-02: a política de insert exige `owner_id = auth.uid()` no with check.
  // Igualdade profunda, e não objectContaining: uma coluna a mais no payload
  // faria toda criação falhar com 42501 (L-001).
  it('envia as oito colunas e o owner_id da sessão', async () => {
    const consulta = consultaQueDevolve({ data: CLIENTE, error: null })

    await criarCliente(DADOS)

    expect(consulta.insert).toHaveBeenCalledWith({ ...OITO_COLUNAS, owner_id: 'u1' })
  })

  it('devolve o cliente criado', async () => {
    consultaQueDevolve({ data: CLIENTE, error: null })

    expect(await criarCliente(DADOS)).toEqual({ ok: true, cliente: CLIENTE })
  })

  // Campo apagado precisa chegar como nulo: string vazia violaria o formato do
  // e-mail e os dígitos do telefone.
  it('envia nulo nos campos opcionais deixados em branco', async () => {
    const consulta = consultaQueDevolve({ data: CLIENTE, error: null })

    await criarCliente({ name: 'Joana Silva', status: 'lead' })

    expect(consulta.insert).toHaveBeenCalledWith({
      name: 'Joana Silva',
      email: null,
      phone: null,
      status: 'lead',
      source: null,
      region: null,
      income: null,
      income_type: null,
      owner_id: 'u1',
    })
  })

  // Sem sessão o banco devolveria o mesmo 42501 de "linha de outro dono", e a
  // frase resultante confundiria a causa.
  it('recusa sem tentar o insert quando não há sessão', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null } as never)

    const resultado = await criarCliente(DADOS)

    expect(resultado).toEqual({
      ok: false,
      mensagem: 'Sua sessão expirou. Entre de novo para continuar.',
    })
    expect(from).not.toHaveBeenCalled()
  })

  // CLNT-05 AC10: devolver em vez de lançar é o que deixa o formulário exibir o
  // erro sem perder o que foi digitado.
  it('traduz a violação de check em mensagem, sem lançar', async () => {
    consultaQueDevolve({ data: null, error: { code: '23514', message: 'check violation' } })

    expect(await criarCliente(DADOS)).toEqual({
      ok: false,
      mensagem: 'Algum valor não é aceito pelo cadastro. Revise os campos.',
    })
  })
})

describe('atualizarCliente', () => {
  // L-001: política e grant cobrem o mesmo caso, então o payload é asserido por
  // igualdade profunda. Com `objectContaining`, uma coluna fora do grant
  // passaria no teste e faria todo salvamento falhar em produção.
  it('envia exatamente as oito colunas do grant', async () => {
    const consulta = consultaQueDevolve({ data: CLIENTE, error: null })

    await atualizarCliente('c1', DADOS)

    expect(consulta.update).toHaveBeenCalledWith(OITO_COLUNAS)
  })

  // As três estão fora do grant de update (AD-014): qualquer uma no payload
  // faz o PostgREST recusar a operação inteira com 42501.
  it('não envia owner_id, created_at nem updated_at', async () => {
    const consulta = consultaQueDevolve({ data: CLIENTE, error: null })

    await atualizarCliente('c1', DADOS)

    const payload = consulta.update.mock.calls[0][0]
    expect(payload).not.toHaveProperty('owner_id')
    expect(payload).not.toHaveProperty('created_at')
    expect(payload).not.toHaveProperty('updated_at')
  })

  it('filtra pela linha e devolve o cliente atualizado', async () => {
    const consulta = consultaQueDevolve({ data: CLIENTE, error: null })

    expect(await atualizarCliente('c1', DADOS)).toEqual({ ok: true, cliente: CLIENTE })
    expect(consulta.eq).toHaveBeenCalledWith('id', 'c1')
  })

  // O 42501 não é expiração de sessão: `ehSessaoExpirada` é estreita de
  // propósito, e derrubar o consultor para o login aqui seria um erro.
  it('traduz o 42501 em erro de permissão', async () => {
    consultaQueDevolve({ data: null, error: { code: '42501', message: 'permission denied' } })

    expect(await atualizarCliente('c1', DADOS)).toEqual({
      ok: false,
      mensagem: 'Você não tem permissão para esta alteração.',
    })
  })

  // Edge case do spec: a edição aberta em outra aba de um cliente já excluído
  // precisa dizer isso ao salvar, em vez de falhar silenciosamente.
  it('traduz o retorno sem linhas em cliente inexistente', async () => {
    consultaQueDevolve({ data: null, error: { code: 'PGRST116', message: 'no rows' } })

    expect(await atualizarCliente('c1', DADOS)).toEqual({
      ok: false,
      mensagem: 'Este cliente não existe mais. Ele pode ter sido excluído em outra aba.',
    })
  })
})

describe('excluirCliente', () => {
  it('exclui a linha pedida e devolve o cliente excluído', async () => {
    const consulta = consultaQueDevolve({ data: CLIENTE, error: null })

    expect(await excluirCliente('c1')).toEqual({ ok: true, cliente: CLIENTE })
    expect(consulta.delete).toHaveBeenCalled()
    expect(consulta.eq).toHaveBeenCalledWith('id', 'c1')
  })

  // CLNT-17 AC6: sem o `.select().single()`, a política filtraria a linha de
  // outro dono e o delete devolveria sucesso silencioso.
  it('recusa quando a exclusão não encontra a linha', async () => {
    consultaQueDevolve({ data: null, error: { code: 'PGRST116', message: 'no rows' } })

    const resultado = await excluirCliente('c1')

    expect(resultado.ok).toBe(false)
    expect(resultado.ok === false && resultado.mensagem).toMatch(/não existe mais/i)
  })

  it('devolve a frase genérica para código desconhecido, sem lançar', async () => {
    consultaQueDevolve({ data: null, error: { code: '08006', message: 'connection failure' } })

    expect(await excluirCliente('c1')).toEqual({
      ok: false,
      mensagem: 'Não foi possível salvar agora. Tente de novo em instantes.',
    })
  })
})

describe('tradução em ponto único', () => {
  // Espalhar a tradução pelas telas é o padrão de falha que o auth-service já
  // evita: a mesma causa seria dita de dois jeitos, e uma das telas revelaria
  // detalhe de banco.
  it('dá a mesma frase ao mesmo código nas três escritas, e registra o erro original', async () => {
    const erro = { code: '42501', message: 'permission denied' }

    consultaQueDevolve({ data: null, error: erro })
    const criacao = await criarCliente(DADOS)
    consultaQueDevolve({ data: null, error: erro })
    const atualizacao = await atualizarCliente('c1', DADOS)
    consultaQueDevolve({ data: null, error: erro })
    const exclusao = await excluirCliente('c1')

    expect(criacao).toEqual({ ok: false, mensagem: 'Você não tem permissão para esta alteração.' })
    expect(atualizacao).toEqual(criacao)
    expect(exclusao).toEqual(criacao)
    expect(console.error).toHaveBeenCalledWith('[falha ao escrever cliente]', erro)
  })
})
