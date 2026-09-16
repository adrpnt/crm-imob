import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { cadastrar, entrar, sair } from '../../src/features/auth/services/auth-service.ts'
import { atualizarPerfil, buscarPerfil } from '../../src/features/auth/services/profile-service.ts'
import { supabase } from '../../src/lib/supabase.ts'
import { exigirSupabaseLocal } from './helpers.ts'

/**
 * O serviço de perfil contra o Supabase real.
 *
 * Os testes unitários deste serviço substituem o cliente por mock, o que os
 * torna cegos ao outro lado do contrato: o grant por coluna de `profiles`.
 * Incluir `email` no update mantém os unitários verdes e faz TODO salvamento
 * falhar em produção com `42501`.
 */
async function contaNova(nome = 'Joana Perfil') {
  const email = `perfil-${randomUUID()}@teste.local`
  await cadastrar({ nomeCompleto: nome, email, senha: 'senha-valida-123' })
  await entrar({ email, senha: 'senha-valida-123' })
  return email
}

describe('profile-service contra a pilha local', () => {
  it('lê o perfil que o trigger criou', async () => {
    await exigirSupabaseLocal()
    const email = await contaNova('Joana Leitura')

    const perfil = await buscarPerfil()

    expect(perfil.full_name).toBe('Joana Leitura')
    expect(perfil.email).toBe(email)
    await sair()
  })

  it('salva nome e telefone, e a releitura confirma a persistência', async () => {
    await exigirSupabaseLocal()
    await contaNova()
    const { id } = await buscarPerfil()

    const resultado = await atualizarPerfil({
      id,
      nomeCompleto: 'Joana M. Silva',
      telefone: '21912345678',
    })

    expect(resultado.ok).toBe(true)

    // Releitura em vez de confiar no retorno do update: é o que prova que o
    // valor chegou à tabela, e não apenas que a chamada devolveu algo.
    const relido = await buscarPerfil()
    expect(relido.full_name).toBe('Joana M. Silva')
    expect(relido.phone).toBe('21912345678')
    await sair()
  })

  it('apaga o telefone gravando nulo', async () => {
    await exigirSupabaseLocal()
    await contaNova()
    const { id } = await buscarPerfil()

    await atualizarPerfil({ id, nomeCompleto: 'Joana', telefone: '21912345678' })
    await atualizarPerfil({ id, nomeCompleto: 'Joana' })

    expect((await buscarPerfil()).phone).toBeNull()
    await sair()
  })

  // A prova de que o grant por coluna está de pé, e de que o serviço não o
  // desafia: escrever email é recusado pelo banco com 42501.
  it('o banco recusa escrever o e-mail, que está fora do grant', async () => {
    await exigirSupabaseLocal()
    const email = await contaNova()
    const { id } = await buscarPerfil()

    const { error } = await supabase
      .from('profiles')
      .update({ email: 'sequestrado@exemplo.com' })
      .eq('id', id)

    expect(error).not.toBeNull()
    expect(error!.code).toBe('42501')
    expect((await buscarPerfil()).email).toBe(email)
    await sair()
  })

  it('não altera o perfil de outro consultor', async () => {
    await exigirSupabaseLocal()
    await contaNova('Primeira')
    const { id: idDaPrimeira } = await buscarPerfil()
    await sair()

    await contaNova('Segunda')
    const resultado = await atualizarPerfil({ id: idDaPrimeira, nomeCompleto: 'Invadida' })

    // A RLS filtra a linha, então o update não encontra alvo e o `.single()`
    // falha — o serviço devolve recusa em vez de sucesso silencioso.
    expect(resultado.ok).toBe(false)
    await sair()
  })
})
