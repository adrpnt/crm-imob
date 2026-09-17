import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { cadastrar, entrar } from '../../src/features/auth/services/auth-service.ts'
import { PADROES, type FiltrosDeClientes } from '../../src/features/clients/filtros.ts'
import {
  buscarCliente,
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

  afterAll(async () => {
    await removerUsuarios(...criados)
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
