/**
 * Asserções de tipo, verificadas por `npm run typecheck`.
 *
 * Não é suíte de execução: o valor está em compilar ou não. Cada
 * `@ts-expect-error` abaixo FALHA a compilação se o erro deixar de acontecer —
 * que é exatamente o caso se o cliente perder o parâmetro `<Database>`.
 *
 * A segunda verificação independente encontrou esta lacuna: trocar
 * `createClient<Database>` por `createClient` não derrubava nenhum dos oito
 * gates.
 */
import { supabase } from '../lib/supabase'

// Tabela e colunas existentes compilam.
export const consultaValida = supabase.from('clients').select('id, name, region')

// @ts-expect-error tabela inexistente precisa ser recusada em tempo de compilação
export const tabelaInexistente = supabase.from('clientes').select('id')

// @ts-expect-error coluna inexistente em insert precisa ser recusada
export const colunaInexistente = supabase.from('clients').insert({ owner_id: 'x', nome: 'y' })

// @ts-expect-error campo obrigatório ausente precisa ser recusado
export const semObrigatorio = supabase.from('clients').insert({ name: 'sem dono' })

// @ts-expect-error tipo errado numa coluna existente precisa ser recusado
export const tipoErrado = supabase.from('clients').insert({ owner_id: 'x', name: 123 })
