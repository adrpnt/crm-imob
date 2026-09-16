import { describe, expect, it } from 'vitest'

import { DESTINO_PADRAO, destinoSeguro } from './destino'

describe('destinoSeguro', () => {
  it('aceita um caminho interno', () => {
    expect(destinoSeguro('/clients/123?status=lead')).toBe('/clients/123?status=lead')
  })

  it('usa o padrão quando não há destino', () => {
    expect(destinoSeguro(null)).toBe(DESTINO_PADRAO)
    expect(destinoSeguro('')).toBe(DESTINO_PADRAO)
  })

  // Sem esta recusa, bastaria enviar um link de login com destino externo para
  // que o consultor, após digitar a senha corretamente, caísse numa cópia da
  // tela. Como o endereço de origem é legítimo, o golpe é difícil de perceber.
  it('recusa endereço absoluto', () => {
    expect(destinoSeguro('https://site-falso.com')).toBe(DESTINO_PADRAO)
    expect(destinoSeguro('http://site-falso.com')).toBe(DESTINO_PADRAO)
  })

  // O navegador trata `//host` como absoluto herdando o protocolo atual.
  it('recusa endereço iniciado por barra dupla', () => {
    expect(destinoSeguro('//site-falso.com')).toBe(DESTINO_PADRAO)
  })

  it('recusa barra seguida de contrabarra, que alguns navegadores normalizam', () => {
    expect(destinoSeguro('/\\site-falso.com')).toBe(DESTINO_PADRAO)
  })

  it('recusa caminho relativo sem barra inicial', () => {
    expect(destinoSeguro('clients')).toBe(DESTINO_PADRAO)
    expect(destinoSeguro('javascript:alert(1)')).toBe(DESTINO_PADRAO)
  })
})
