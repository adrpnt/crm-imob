import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { cadastrar, entrar } from '../../src/features/auth/services/auth-service.ts'
import { PADROES, type FiltrosDeClientes } from '../../src/features/clients/filtros.ts'
import type { DadosDeCliente } from '../../src/features/clients/schemas.ts'
import {
  atualizarCliente,
  buscarCliente,
  criarCliente,
  excluirCliente,
  listarClientes,
  listarRegioes,
} from '../../src/features/clients/services/client-service.ts'
import { supabase } from '../../src/lib/supabase.ts'
import { admin, exigirSupabaseLocal, removerUsuarios, type Usuario } from './helpers.ts'

/**
 * As leituras do serviço de clientes contra o Supabase real.
 *
 * Os testes unitários deste serviço substituem o cliente por mock, o que os
 * torna cegos ao outro lado do contrato: a política de RLS, a coluna gerada
 * `search_text` e o comportamento do `ilike` atravessando o PostgREST. É aqui
 * que se prova que a busca sem acento acha o nome acentuado e que a carteira
 * de um consultor não vaza para o outro.
 */

const SENHA = 'senha-de-teste-123'

const criados: Usuario[] = []

async function consultorNovo(nome: string): Promise<Usuario> {
  const email = `clients-${randomUUID()}@teste.local`
  const resultado = await cadastrar({ nomeCompleto: nome, email, senha: SENHA })
  if (!resultado.ok) throw new Error(`falha ao cadastrar ${email}: ${resultado.mensagem}`)

  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error(`cadastro de ${email} não devolveu sessão`)

  const usuario = { id: data.user.id, email }
  criados.push(usuario)
  return usuario
}

function filtros(ajustes: Partial<FiltrosDeClientes> = {}): FiltrosDeClientes {
  return { ...PADROES, ...ajustes }
}

/** Nomes ordenados, para não depender da ordem de linhas com o mesmo instante. */
function nomes(clientes: { name: string }[]): string[] {
  return clientes.map((c) => c.name).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

// Limpeza única do arquivo: os dois blocos criam consultores, e a cascata de
// `auth.users` leva clientes e notas junto.
afterAll(async () => {
  await removerUsuarios(...criados)
})

describe('as leituras de client-service contra a pilha local', () => {
  let joana: Usuario
  let bruno: Usuario
  let clienteDaJoana: string

  beforeAll(async () => {
    await exigirSupabaseLocal()

    joana = await consultorNovo('Joana Consultora')
    bruno = await consultorNovo('Bruno Consultor')

    const { data, error } = await admin
      .from('clients')
      .insert([
        {
          owner_id: joana.id,
          name: 'José Gonçalves',
          phone: '(11) 98765-4321',
          region: 'Zona Sul',
          status: 'lead',
          source: 'instagram',
        },
        {
          owner_id: joana.id,
          name: 'Maria Aparecida',
          region: 'zona sul',
          status: 'contacted',
          source: 'website',
        },
        {
          owner_id: joana.id,
          name: 'Carlos Andrade',
          region: 'Centro',
          status: 'lead',
          source: 'indication',
        },
        // `status` explícito: num insert em lote o PostgREST unifica as colunas,
        // e a linha que o omite recebe nulo em vez do padrão da coluna.
        { owner_id: bruno.id, name: 'Cliente do Bruno', region: 'Barra', status: 'lead' },
      ])
      .select('id, name, owner_id')
    if (error) throw new Error(`falha ao semear clientes: ${error.message}`)

    clienteDaJoana = data.find((c) => c.name === 'José Gonçalves')!.id
  })

  // CLNT-07 AC1: a política é a fronteira, e o serviço não filtra por owner_id.
  it('devolve a cada consultor somente a própria carteira', async () => {
    await entrar({ email: joana.email, senha: SENHA })
    const daJoana = await listarClientes(filtros({ sort: 'name', order: 'asc' }))

    expect(daJoana.total).toBe(3)
    expect(nomes(daJoana.clientes)).toEqual(['Carlos Andrade', 'José Gonçalves', 'Maria Aparecida'])

    await entrar({ email: bruno.email, senha: SENHA })
    const doBruno = await listarClientes(filtros())

    expect(doBruno.total).toBe(1)
    expect(nomes(doBruno.clientes)).toEqual(['Cliente do Bruno'])
  })

  // Medição 3 da fase Design: `NFD` no cliente concorda com o
  // `immutable_unaccent` da coluna gerada, cedilha incluída. Se divergirem, a
  // busca deixa de achar e este teste é o alarme.
  it('acha o nome acentuado por trecho digitado sem acento', async () => {
    await entrar({ email: joana.email, senha: SENHA })

    const semAcento = await listarClientes(filtros({ busca: 'goncalves' }))
    expect(nomes(semAcento.clientes)).toEqual(['José Gonçalves'])

    const comAcento = await listarClientes(filtros({ busca: 'JOSÉ' }))
    expect(nomes(comAcento.clientes)).toEqual(['José Gonçalves'])
  })

  // CLNT-08 AC3: o trigger guardou só os dígitos, então o termo com máscara só
  // casa depois de a máscara ser removida.
  it('acha o cliente pelo telefone digitado com máscara', async () => {
    await entrar({ email: joana.email, senha: SENHA })

    const pagina = await listarClientes(filtros({ busca: '(11) 98765' }))

    expect(nomes(pagina.clientes)).toEqual(['José Gonçalves'])
  })

  // Edge case do spec: a URL pode pedir uma página que não existe.
  it('devolve lista vazia, e não erro, para página além do total', async () => {
    await entrar({ email: joana.email, senha: SENHA })

    const pagina = await listarClientes(filtros({ page: 5 }))

    expect(pagina.clientes).toEqual([])
    expect(pagina.total).toBe(3)
  })

  // CLNT-07 AC11: o total é o dos filtros correntes, não o da carteira inteira.
  it('conta apenas os clientes que satisfazem o filtro corrente', async () => {
    await entrar({ email: joana.email, senha: SENHA })

    const leads = await listarClientes(filtros({ status: 'lead' }))

    expect(leads.total).toBe(2)
    expect(nomes(leads.clientes)).toEqual(['Carlos Andrade', 'José Gonçalves'])
  })

  // CLNT-09 AC4: E lógico, e não união.
  it('combina busca e filtros por E lógico', async () => {
    await entrar({ email: joana.email, senha: SENHA })

    const combinado = await listarClientes(
      filtros({ busca: 'a', status: 'lead', origem: 'indication' }),
    )

    expect(combinado.total).toBe(1)
    expect(nomes(combinado.clientes)).toEqual(['Carlos Andrade'])
  })

  // CLNT-04 e o edge case da caixa: "Zona Sul" e "zona sul" são uma opção só.
  it('lista as regiões do próprio consultor agrupando a caixa, em ordem alfabética', async () => {
    await entrar({ email: joana.email, senha: SENHA })

    expect(await listarRegioes()).toEqual(['Centro', 'Zona Sul'])
  })

  // CLNT-14 AC2: a RLS não devolve a linha, o `.single()` falha, e a ficha
  // traduz isso em "não encontrado" sem revelar que o registro existe.
  it('recusa ler o cliente de outro consultor', async () => {
    await entrar({ email: bruno.email, senha: SENHA })

    await expect(buscarCliente(clienteDaJoana)).rejects.toMatchObject({ code: 'PGRST116' })
  })
})

/**
 * As escritas do serviço contra o Supabase real.
 *
 * O unitário assere o payload; só aqui aparecem as duas camadas do AD-014
 * trabalhando: o grant por coluna e a política de linha. É a lição L-001 —
 * quando as duas cobrem o mesmo caso, um teste comportamental sozinho pode
 * passar pelo motivo errado, por isso o `42501` da coluna fora do grant vem
 * sempre com controle positivo.
 */
describe('as escritas de client-service contra a pilha local', () => {
  let joana: Usuario
  let bruno: Usuario
  let clienteDoBruno: string

  const DADOS: DadosDeCliente = {
    name: 'Cliente Novo',
    email: 'novo@exemplo.com',
    phone: '11987654321',
    status: 'lead',
    source: 'instagram',
    region: 'Zona Sul',
    income: 5000,
    income_type: 'formal',
  }

  beforeAll(async () => {
    await exigirSupabaseLocal()

    joana = await consultorNovo('Joana Escritora')
    bruno = await consultorNovo('Bruno Escritor')

    const { data, error } = await admin
      .from('clients')
      .insert({ owner_id: bruno.id, name: 'Cliente do Bruno', status: 'lead' })
      .select('id')
      .single()
    if (error) throw new Error(`falha ao semear o cliente do Bruno: ${error.message}`)

    clienteDoBruno = data.id
  })

  // CLNT-02: a política de insert exige `owner_id = auth.uid()` no with check.
  it('cria o cliente com o owner_id do consultor autenticado', async () => {
    await entrar({ email: joana.email, senha: SENHA })

    const resultado = await criarCliente(DADOS)

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    const { data } = await admin
      .from('clients')
      .select('owner_id, name')
      .eq('id', resultado.cliente.id)
      .single()
    expect(data!.owner_id).toBe(joana.id)
    expect(data!.name).toBe('Cliente Novo')
  })

  // A normalização vive no banco, não no formulário (FND-06): dado que entre
  // por qualquer caminho obedece à mesma regra.
  it('deixa os triggers normalizarem nome, e-mail, telefone e região', async () => {
    await entrar({ email: joana.email, senha: SENHA })

    const resultado = await criarCliente({
      ...DADOS,
      name: '  Joana   Maria  ',
      email: '  JOANA@Exemplo.COM ',
      phone: '(11) 3456-7890',
      region: '  Zona   Norte  ',
    })

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    const relido = await buscarCliente(resultado.cliente.id)
    expect(relido.name).toBe('Joana Maria')
    expect(relido.email).toBe('joana@exemplo.com')
    expect(relido.phone).toBe('1134567890')
    expect(relido.region).toBe('Zona Norte')
  })

  // A renda é `numeric(12,2)`: a ficha depende de receber número, e não texto,
  // para formatar em BRL.
  it('persiste a renda no limite do check como número com duas casas', async () => {
    await entrar({ email: joana.email, senha: SENHA })

    const resultado = await criarCliente({ ...DADOS, income: 99999999.99 })

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    const relido = await buscarCliente(resultado.cliente.id)
    expect(relido.income).toBe(99999999.99)
  })

  // CLNT-15 AC4: a releitura é o que prova que o valor chegou à tabela, e não
  // apenas que a chamada devolveu algo.
  it('atualiza as oito colunas do grant, e a releitura confirma', async () => {
    await entrar({ email: joana.email, senha: SENHA })
    const criacao = await criarCliente(DADOS)
    if (!criacao.ok) throw new Error(criacao.mensagem)

    const resultado = await atualizarCliente(criacao.cliente.id, {
      name: 'Joana Atualizada',
      email: 'atualizada@exemplo.com',
      phone: '11912345678',
      status: 'qualified',
      source: 'portal',
      region: 'Centro',
      income: 7500.5,
      income_type: 'mixed',
    })

    expect(resultado.ok).toBe(true)

    const relido = await buscarCliente(criacao.cliente.id)
    expect({
      name: relido.name,
      email: relido.email,
      phone: relido.phone,
      status: relido.status,
      source: relido.source,
      region: relido.region,
      income: relido.income,
      income_type: relido.income_type,
    }).toEqual({
      name: 'Joana Atualizada',
      email: 'atualizada@exemplo.com',
      phone: '11912345678',
      status: 'qualified',
      source: 'portal',
      region: 'Centro',
      income: 7500.5,
      income_type: 'mixed',
    })
  })

  // L-001 com controle positivo: sem a coluna de dentro do grant passando na
  // mesma linha, o 42501 poderia vir da política, e não do grant.
  it('recusa com 42501 a coluna fora do grant, e aceita a de dentro', async () => {
    await entrar({ email: joana.email, senha: SENHA })
    const criacao = await criarCliente(DADOS)
    if (!criacao.ok) throw new Error(criacao.mensagem)

    const fora = await supabase
      .from('clients')
      .update({ created_at: '2020-01-01T00:00:00.000Z' })
      .eq('id', criacao.cliente.id)
    expect(fora.error).not.toBeNull()
    expect(fora.error!.code).toBe('42501')

    const dentro = await supabase
      .from('clients')
      .update({ name: 'Passou pelo grant' })
      .eq('id', criacao.cliente.id)
    expect(dentro.error).toBeNull()

    const relido = await buscarCliente(criacao.cliente.id)
    expect(relido.name).toBe('Passou pelo grant')
    expect(relido.created_at).toBe(criacao.cliente.created_at)
  })

  // A política filtra a linha, o `.single()` não encontra alvo, e o serviço
  // devolve recusa em vez de sucesso silencioso.
  it('não altera nada ao tentar atualizar o cliente de outro consultor', async () => {
    await entrar({ email: joana.email, senha: SENHA })

    const resultado = await atualizarCliente(clienteDoBruno, { ...DADOS, name: 'Invadido' })

    expect(resultado.ok).toBe(false)

    const { data } = await admin.from('clients').select('name').eq('id', clienteDoBruno).single()
    expect(data!.name).toBe('Cliente do Bruno')
  })

  // Edge case do spec: a edição aberta em outra aba de um cliente já excluído.
  it('recusa atualizar um cliente já excluído', async () => {
    await entrar({ email: joana.email, senha: SENHA })
    const criacao = await criarCliente(DADOS)
    if (!criacao.ok) throw new Error(criacao.mensagem)
    await excluirCliente(criacao.cliente.id)

    const resultado = await atualizarCliente(criacao.cliente.id, DADOS)

    expect(resultado.ok).toBe(false)
    expect(resultado.ok === false && resultado.mensagem).toMatch(/não existe mais/i)
  })

  // CLNT-17 AC3: a cascata é da chave estrangeira de notes; a aplicação não
  // apaga nota alguma.
  it('excluir o cliente apaga as notas dele por cascata', async () => {
    await entrar({ email: joana.email, senha: SENHA })
    const criacao = await criarCliente(DADOS)
    if (!criacao.ok) throw new Error(criacao.mensagem)

    const { error: erroDaNota } = await admin
      .from('notes')
      .insert({ client_id: criacao.cliente.id, title: 'Primeiro contato' })
    if (erroDaNota) throw new Error(`falha ao semear a nota: ${erroDaNota.message}`)

    const resultado = await excluirCliente(criacao.cliente.id)
    expect(resultado.ok).toBe(true)

    const { count: notasRestantes } = await admin
      .from('notes')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', criacao.cliente.id)
    expect(notasRestantes).toBe(0)

    const { count: clientesRestantes } = await admin
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('id', criacao.cliente.id)
    expect(clientesRestantes).toBe(0)
  })

  it('não apaga nada ao tentar excluir o cliente de outro consultor', async () => {
    await entrar({ email: joana.email, senha: SENHA })

    const resultado = await excluirCliente(clienteDoBruno)

    expect(resultado.ok).toBe(false)

    const { count } = await admin
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('id', clienteDoBruno)
    expect(count).toBe(1)
  })

  // O check do banco é a autoridade final: um valor que escape do schema Zod
  // volta como frase em português pelo ponto único de tradução.
  it('traduz o check do banco em mensagem em português, sem lançar', async () => {
    await entrar({ email: joana.email, senha: SENHA })

    // Dupla conversão de propósito: o tipo proíbe este status, e é justamente
    // o caso de um valor que escapou do schema — aba antiga, bundle velho.
    const resultado = await criarCliente({
      ...DADOS,
      status: 'morto',
    } as unknown as DadosDeCliente)

    expect(resultado).toEqual({
      ok: false,
      mensagem: 'Algum valor não é aceito pelo cadastro. Revise os campos.',
    })
  })
})
