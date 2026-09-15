import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  admin,
  clienteDe,
  criarUsuario,
  exigirSupabaseLocal,
  removerUsuarios,
  type Cliente,
  type Usuario,
} from './helpers.ts'

/**
 * Isolamento de `clients` atravessando o PostgREST.
 *
 * Complementa a matriz do pgTAP, que exercita as políticas dentro do banco.
 * O que só aparece aqui é o que está entre o navegador e a política: grants,
 * exposição de schema e o comportamento real do supabase-js.
 */
describe('RLS de clients pelo cliente Supabase', () => {
  let alice: Usuario
  let bruno: Usuario
  let deAlice: Cliente
  let deBruno: Cliente
  let clienteDeAlice: string
  let clienteDeBruno: string

  beforeAll(async () => {
    await exigirSupabaseLocal()

    alice = await criarUsuario('alice')
    bruno = await criarUsuario('bruno')

    const { data, error } = await admin
      .from('clients')
      .insert([
        { owner_id: alice.id, name: 'Cliente da Alice', region: 'Zona Sul' },
        { owner_id: bruno.id, name: 'Cliente do Bruno', region: 'Centro' },
      ])
      .select('id, owner_id')
    if (error) throw new Error(`falha ao semear clientes: ${error.message}`)

    clienteDeAlice = data.find((c) => c.owner_id === alice.id)!.id
    clienteDeBruno = data.find((c) => c.owner_id === bruno.id)!.id

    deAlice = await clienteDe(alice)
    deBruno = await clienteDe(bruno)
  })

  afterAll(async () => {
    await removerUsuarios(alice, bruno)
  })

  it('devolve à Alice apenas os clientes dela', async () => {
    const { data, error } = await deAlice.from('clients').select('id, name, owner_id')

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].name).toBe('Cliente da Alice')
    expect(data![0].owner_id).toBe(alice.id)
  })

  it('devolve ao Bruno apenas os clientes dele: o isolamento é simétrico', async () => {
    const { data, error } = await deBruno.from('clients').select('name, owner_id')

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].name).toBe('Cliente do Bruno')
    expect(data![0].owner_id).toBe(bruno.id)
  })

  it('não devolve o cliente do Bruno nem quando a Alice pede pelo id', async () => {
    const { data, error } = await deAlice.from('clients').select('id').eq('id', clienteDeBruno)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('recusa a Alice criar cliente com o owner_id do Bruno', async () => {
    const { error } = await deAlice.from('clients').insert({ owner_id: bruno.id, name: 'Plantado' })

    expect(error).not.toBeNull()
    expect(error!.code).toBe('42501')
  })

  it('permite à Alice criar cliente com o próprio owner_id', async () => {
    const { data, error } = await deAlice
      .from('clients')
      .insert({ owner_id: alice.id, name: 'Lead Novo' })
      .select('name, owner_id')
      .single()

    expect(error).toBeNull()
    expect(data!.name).toBe('Lead Novo')
    expect(data!.owner_id).toBe(alice.id)
  })

  it('não altera nada quando a Alice tenta editar o cliente do Bruno', async () => {
    const { data, error } = await deAlice
      .from('clients')
      .update({ name: 'Invadido' })
      .eq('id', clienteDeBruno)
      .select('id')

    expect(error).toBeNull()
    expect(data).toEqual([])

    // Conferido por fora da RLS: a linha continua intacta no banco.
    const { data: real } = await admin
      .from('clients')
      .select('name')
      .eq('id', clienteDeBruno)
      .single()
    expect(real!.name).toBe('Cliente do Bruno')
  })

  it('não apaga nada quando a Alice tenta excluir o cliente do Bruno', async () => {
    const { data, error } = await deAlice
      .from('clients')
      .delete()
      .eq('id', clienteDeBruno)
      .select('id')

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { count } = await admin
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('id', clienteDeBruno)
    expect(count).toBe(1)
  })

  it('recusa a Alice alterar o owner_id do próprio cliente', async () => {
    const { error } = await deAlice
      .from('clients')
      .update({ owner_id: bruno.id })
      .eq('id', clienteDeAlice)

    expect(error).not.toBeNull()
    expect(error!.code).toBe('42501')
  })

  it('não devolve cliente algum para uma sessão anônima', async () => {
    const anonimo = await clienteDe(alice)
    await anonimo.auth.signOut()

    const { data, error } = await anonimo.from('clients').select('id')

    expect(data).toBeNull()
    expect(error).not.toBeNull()
    expect(error!.code).toBe('42501')
  })
})
