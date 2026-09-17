import { describe, expect, it } from 'vitest'

import { escreverFiltros, lerFiltros, PADROES, type FiltrosDeClientes } from './filtros'

describe('lerFiltros', () => {
  // AD-015 e a premissa de ordenação do spec: mais recentes primeiro.
  it('aplica os padrões quando a URL não traz nada', () => {
    expect(lerFiltros(new URLSearchParams())).toEqual({
      busca: '',
      status: null,
      origem: null,
      regiao: null,
      sort: 'created_at',
      order: 'desc',
      page: 1,
    })
  })

  // CLNT-09 AC4: busca e os três filtros convivem, e a URL os restaura (AC7).
  it('lê busca, status, origem e região da query string', () => {
    const sp = new URLSearchParams('search=joana&status=lead&source=instagram&region=Zona Sul')

    expect(lerFiltros(sp)).toMatchObject({
      busca: 'joana',
      status: 'lead',
      origem: 'instagram',
      regiao: 'Zona Sul',
    })
  })

  // Um valor inventado na URL viraria nome de coluna dentro do `.order()`.
  it('descarta sort desconhecido e volta ao padrão', () => {
    expect(lerFiltros(new URLSearchParams('sort=income')).sort).toBe('created_at')
  })

  // CLNT-11: ordenar por nome é o outro valor aceito.
  it('aceita sort=name, que é valor conhecido', () => {
    expect(lerFiltros(new URLSearchParams('sort=name')).sort).toBe('name')
  })

  it('descarta order desconhecido e aceita asc', () => {
    expect(lerFiltros(new URLSearchParams('order=aleatorio')).order).toBe('desc')
    expect(lerFiltros(new URLSearchParams('order=asc')).order).toBe('asc')
  })

  // Qualquer um desses valores chegaria ao `.range()` da consulta e produziria
  // erro do PostgREST por algo digitado na barra de endereço.
  it('força página menor que 1, fracionária ou não numérica para 1', () => {
    expect(lerFiltros(new URLSearchParams('page=0')).page).toBe(1)
    expect(lerFiltros(new URLSearchParams('page=-3')).page).toBe(1)
    expect(lerFiltros(new URLSearchParams('page=abc')).page).toBe(1)
    expect(lerFiltros(new URLSearchParams('page=2.5')).page).toBe(1)
    expect(lerFiltros(new URLSearchParams('page=')).page).toBe(1)
  })

  it('lê página válida como número', () => {
    expect(lerFiltros(new URLSearchParams('page=4')).page).toBe(4)
  })

  // Edge case do spec: buscar por espaços devolveria a carteira inteira.
  it('trata termo só com espaços como busca vazia', () => {
    expect(lerFiltros(new URLSearchParams('search=%20%20%20')).busca).toBe('')
  })
})

describe('escreverFiltros', () => {
  // A URL limpa precisa continuar limpa: `/clients` não ganha sete parâmetros.
  it('omite tudo que é padrão', () => {
    expect(escreverFiltros(PADROES).toString()).toBe('')
  })

  it('escreve apenas o que difere do padrão', () => {
    const filtros: FiltrosDeClientes = {
      busca: 'joana',
      status: 'lead',
      origem: null,
      regiao: null,
      sort: 'name',
      order: 'asc',
      page: 3,
    }

    const sp = escreverFiltros(filtros)

    expect(sp.get('search')).toBe('joana')
    expect(sp.get('status')).toBe('lead')
    expect(sp.get('source')).toBeNull()
    expect(sp.get('region')).toBeNull()
    expect(sp.get('sort')).toBe('name')
    expect(sp.get('order')).toBe('asc')
    expect(sp.get('page')).toBe('3')
  })
})

describe('ida e volta', () => {
  // CLNT-10 AC6 e AC7: o que a tela escreve na URL é o que ela lê de volta.
  it('é idempotente com todos os campos preenchidos', () => {
    const filtros: FiltrosDeClientes = {
      busca: 'joana silva',
      status: 'qualified',
      origem: 'whatsapp',
      regiao: 'Zona Sul',
      sort: 'name',
      order: 'asc',
      page: 7,
    }

    expect(lerFiltros(escreverFiltros(filtros))).toEqual(filtros)
  })

  it('é idempotente nos padrões', () => {
    expect(lerFiltros(escreverFiltros(PADROES))).toEqual(PADROES)
  })
})
