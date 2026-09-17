import { describe, expect, it } from 'vitest'

import { escaparCuringas, normalizarTermo, padroesDeBusca, soDigitos } from './busca'

/**
 * Medição da fase Design: `public.immutable_unaccent('José Gonçalves ÃÕÜÊ ação')`
 * devolveu exatamente esta string. A coluna `search_text` aplica `lower()`
 * antes, então o alvo armazenado é ela em minúsculas.
 */
const MEDIDO_NO_BANCO = 'Jose Goncalves AOUE acao'

describe('normalizarTermo', () => {
  it('apara as pontas e colapsa espaços internos', () => {
    expect(normalizarTermo('  joana    silva  ')).toBe('joana silva')
  })

  it('baixa a caixa', () => {
    expect(normalizarTermo('JOANA Silva')).toBe('joana silva')
  })

  // Se `NFD` divergir do `immutable_unaccent` do banco, o termo digitado deixa
  // de casar com `search_text` e a busca simplesmente não acha. Este teste é o
  // alarme dessa divergência, cedilha incluída.
  it('remove acentos do português como o unaccent do banco, cedilha incluída', () => {
    expect(normalizarTermo('José Gonçalves ÃÕÜÊ ação')).toBe(MEDIDO_NO_BANCO.toLowerCase())
  })

  it('devolve vazio quando o termo é só espaço', () => {
    expect(normalizarTermo('   ')).toBe('')
  })
})

describe('escaparCuringas', () => {
  // Edge case do spec: `%` digitado é caractere literal, não curinga. Medido
  // na fase Design: `%\%%` casa contra `sonda 100% a_b` atravessando o PostgREST.
  it('escapa a porcentagem para que ela case literalmente', () => {
    expect(escaparCuringas('100%')).toBe('100\\%')
  })

  // Mesmo edge case para o sublinhado, que no `like` vale por um caractere qualquer.
  it('escapa o sublinhado para que ele case literalmente', () => {
    expect(escaparCuringas('a_b')).toBe('a\\_b')
  })

  // Com a ordem invertida, a contrabarra inserida ao escapar `%` seria escapada
  // na passada seguinte e o padrão passaria a procurar uma contrabarra literal.
  it('escapa a contrabarra primeiro, e não o escape que acabou de inserir', () => {
    expect(escaparCuringas('c\\d%e_f')).toBe('c\\\\d\\%e\\_f')
  })

  // Medido na fase Design: o PostgREST traduz `*` para `%` antes do SQL, então
  // `\*` significa "porcentagem literal" e um asterisco literal é
  // inexpressável por `ilike`. O spec registra isso como limite conhecido. Se
  // o PostgREST mudar, este teste é o alarme.
  it('deixa o asterisco intacto, porque ele permanece curinga', () => {
    expect(escaparCuringas('e*f')).toBe('e*f')
  })
})

describe('soDigitos', () => {
  // CLNT-08 AC3: o banco guarda o telefone só com dígitos.
  it('reduz um telefone com máscara a dígitos', () => {
    expect(soDigitos('(11) 98765-4321')).toBe('11987654321')
  })

  it('devolve vazio quando não há dígito algum', () => {
    expect(soDigitos('joana silva')).toBe('')
  })
})

describe('padroesDeBusca', () => {
  // Um padrão só quando não há dígito, com a normalização e o escape já
  // aplicados: é a composição que o serviço consome.
  it('devolve só o padrão de texto, normalizado e escapado', () => {
    expect(padroesDeBusca('  JOSÉ  a_b%  ')).toEqual(['%jose a\\_b\\%%'])
  })

  // CLNT-08 AC3: "(11) 98765" tem que achar o telefone gravado sem máscara, e
  // o padrão com os parênteses nunca casaria contra `search_text`.
  it('acrescenta o padrão de telefone quando o termo tem dígitos', () => {
    expect(padroesDeBusca('(11) 98765')).toEqual(['%(11) 98765%', '%1198765%'])
  })

  it('não repete o padrão quando o termo já é só dígitos', () => {
    expect(padroesDeBusca('1198765')).toEqual(['%1198765%'])
  })

  // Edge case do spec: buscar por espaços é busca vazia, e sem padrão o
  // serviço não aplica filtro de busca nenhum.
  it('devolve lista vazia para termo vazio ou só com espaços', () => {
    expect(padroesDeBusca('')).toEqual([])
    expect(padroesDeBusca('    ')).toEqual([])
  })
})
