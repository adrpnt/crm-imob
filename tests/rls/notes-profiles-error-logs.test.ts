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

describe('RLS de notes, profiles e error_logs pelo cliente Supabase', () => {
  let alice: Usuario
  let bruno: Usuario
  let deAlice: Cliente
  let clienteDaAlice: string
  let clienteDoBruno: string
  let notaDoBruno: string

  beforeAll(async () => {
    await exigirSupabaseLocal()

    alice = await criarUsuario('alice', 'Alice Martins')
    bruno = await criarUsuario('bruno', 'Bruno Teixeira')

    const { data: clientes, error: erroClientes } = await admin
      .from('clients')
      .insert([
        { owner_id: alice.id, name: 'Cliente da Alice' },
        { owner_id: bruno.id, name: 'Cliente do Bruno' },
      ])
      .select('id, owner_id')
    if (erroClientes) throw new Error(`falha ao semear clientes: ${erroClientes.message}`)

    clienteDaAlice = clientes.find((c) => c.owner_id === alice.id)!.id
    clienteDoBruno = clientes.find((c) => c.owner_id === bruno.id)!.id

    const { data: notas, error: erroNotas } = await admin
      .from('notes')
      .insert([
        { client_id: clienteDaAlice, title: 'Ligação da Alice' },
        { client_id: clienteDoBruno, title: 'Ligação do Bruno' },
      ])
      .select('id, client_id')
    if (erroNotas) throw new Error(`falha ao semear notas: ${erroNotas.message}`)

    notaDoBruno = notas.find((n) => n.client_id === clienteDoBruno)!.id

    deAlice = await clienteDe(alice)
  })

  afterAll(async () => {
    await removerUsuarios(alice, bruno)
  })

  describe('notes', () => {
    it('devolve à Alice apenas notas de clientes dela', async () => {
      const { data, error } = await deAlice.from('notes').select('title')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data![0].title).toBe('Ligação da Alice')
    })

    it('não devolve a nota do Bruno nem quando a Alice pede pelo id', async () => {
      const { data, error } = await deAlice.from('notes').select('id').eq('id', notaDoBruno)

      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('permite à Alice criar nota para um cliente dela', async () => {
      const { data, error } = await deAlice
        .from('notes')
        .insert({ client_id: clienteDaAlice, title: 'Visita agendada' })
        .select('title')
        .single()

      expect(error).toBeNull()
      expect(data!.title).toBe('Visita agendada')
    })

    it('recusa à Alice criar nota apontando para cliente do Bruno', async () => {
      const { error } = await deAlice
        .from('notes')
        .insert({ client_id: clienteDoBruno, title: 'Plantada' })

      expect(error).not.toBeNull()
      expect(error!.code).toBe('42501')
    })

    it('não altera nada quando a Alice tenta editar a nota do Bruno', async () => {
      const { data, error } = await deAlice
        .from('notes')
        .update({ title: 'Invadida' })
        .eq('id', notaDoBruno)
        .select('id')

      expect(error).toBeNull()
      expect(data).toEqual([])

      const { data: real } = await admin
        .from('notes')
        .select('title')
        .eq('id', notaDoBruno)
        .single()
      expect(real!.title).toBe('Ligação do Bruno')
    })

    it('apaga as notas junto quando a Alice exclui o próprio cliente', async () => {
      const { error } = await deAlice.from('clients').delete().eq('id', clienteDaAlice)
      expect(error).toBeNull()

      const { count } = await admin
        .from('notes')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clienteDaAlice)
      expect(count).toBe(0)
    })
  })

  describe('profiles', () => {
    it('devolve à Alice apenas o próprio perfil, criado pelo trigger do cadastro', async () => {
      const { data, error } = await deAlice.from('profiles').select('id, full_name, email')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data![0].id).toBe(alice.id)
      expect(data![0].full_name).toBe('Alice Martins')
      expect(data![0].email).toBe(alice.email)
    })

    it('permite à Alice corrigir o próprio nome', async () => {
      const { data, error } = await deAlice
        .from('profiles')
        .update({ full_name: 'Alice M. Martins' })
        .eq('id', alice.id)
        .select('full_name')
        .single()

      expect(error).toBeNull()
      expect(data!.full_name).toBe('Alice M. Martins')
    })

    it('recusa à Alice alterar o próprio e-mail: a aplicação não tem esse caminho', async () => {
      const { error } = await deAlice
        .from('profiles')
        .update({ email: 'outro@teste.local' })
        .eq('id', alice.id)

      expect(error).not.toBeNull()
      expect(error!.code).toBe('42501')
    })

    it('não devolve o perfil do Bruno para a Alice', async () => {
      const { data, error } = await deAlice.from('profiles').select('id').eq('id', bruno.id)

      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  })

  describe('error_logs', () => {
    it('permite à Alice registrar um erro com o próprio identificador', async () => {
      const { error } = await deAlice.from('error_logs').insert({
        owner_id: alice.id,
        message: 'TypeError: x is not a function',
        route: '/clients',
      })

      expect(error).toBeNull()
    })

    it('recusa à Alice ler error_logs, mesmo os registros que ela própria gravou', async () => {
      const { data, error } = await deAlice.from('error_logs').select('message')

      expect(data).toBeNull()
      expect(error).not.toBeNull()
      expect(error!.code).toBe('42501')
    })

    it('registra de fato a linha, legível apenas por conexão de serviço', async () => {
      const { data, error } = await admin
        .from('error_logs')
        .select('message, route')
        .eq('owner_id', alice.id)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data![0].message).toBe('TypeError: x is not a function')
      expect(data![0].route).toBe('/clients')
    })

    it('recusa à Alice registrar erro com o identificador do Bruno', async () => {
      const { error } = await deAlice
        .from('error_logs')
        .insert({ owner_id: bruno.id, message: 'Erro plantado' })

      expect(error).not.toBeNull()
      expect(error!.code).toBe('42501')
    })
  })
})
