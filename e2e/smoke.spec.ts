import { expect, test } from '@playwright/test'

test('a aplicação carrega e renderiza a tela inicial', async ({ page }) => {
  const errosDeConsole: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errosDeConsole.push(msg.text())
  })

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'CRM Imobiliário' })).toBeVisible()
  expect(errosDeConsole).toEqual([])
})

test('uma rota inexistente mostra a página de não encontrado com volta ao CRM', async ({
  page,
}) => {
  await page.goto('/rota-que-nao-existe')

  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao CRM' }).click()
  await expect(page.getByRole('heading', { name: 'CRM Imobiliário' })).toBeVisible()
})

/**
 * Critério transferido de T18.
 *
 * Só faz sentido aqui: o jsdom não tem motor de layout, então lá a verificação
 * testaria classes CSS em vez de comportamento. Em navegador real dá para
 * comparar a largura do documento com a da janela.
 */
test('o layout cabe em 320px sem rolagem horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')

  const { larguraDoDocumento, larguraDaJanela } = await page.evaluate(() => ({
    larguraDoDocumento: document.documentElement.scrollWidth,
    larguraDaJanela: document.documentElement.clientWidth,
  }))

  expect(larguraDoDocumento).toBeLessThanOrEqual(larguraDaJanela)
  await expect(page.getByRole('heading', { name: 'CRM Imobiliário' })).toBeVisible()
})

test('o layout também cabe em uma janela larga', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const { larguraDoDocumento, larguraDaJanela } = await page.evaluate(() => ({
    larguraDoDocumento: document.documentElement.scrollWidth,
    larguraDaJanela: document.documentElement.clientWidth,
  }))

  expect(larguraDoDocumento).toBeLessThanOrEqual(larguraDaJanela)
})

/**
 * O pipeline do Tailwind gera estilo de verdade (FND-02).
 *
 * A segunda verificação independente mostrou que remover o plugin de
 * `vite.config.ts` fazia a aplicação ir ao ar sem uma única classe utilitária,
 * e os oito gates continuavam verdes — inclusive o teste de 320px, que passa
 * justamente porque página sem layout não rola horizontalmente.
 *
 * A asserção olha estilo computado, e não classe no HTML: a classe está lá de
 * qualquer jeito; o que some é o CSS por trás dela.
 */
test('os tokens do Tailwind chegam como estilo computado', async ({ page }) => {
  await page.goto('/')

  const cabecalho = page.getByRole('banner')
  await expect(cabecalho).toHaveCSS('border-bottom-width', '1px')
  await expect(cabecalho).toHaveCSS('border-bottom-color', 'rgb(223, 227, 232)')

  // Exatamente uma marca principal: o layout fornece o <main>, e a tela
  // renderiza uma <section> dentro dele. Dois <main> aninhados são HTML
  // inválido, e foi o que esta asserção encontrou ao ser escrita.
  await expect(page.getByRole('main')).toHaveCount(1)
  await expect(page.getByRole('main')).toHaveCSS('padding-left', '16px')

  const titulo = page.getByRole('heading', { name: 'CRM Imobiliário' })
  await expect(titulo).toHaveCSS('font-weight', '600')
})

/**
 * Todos os tokens declarados em `@theme` chegam ao navegador (FND-02).
 *
 * A asserção anterior cobria o pipeline do Tailwind, mas não os tokens um a
 * um: apagar metade do bloco `@theme` passava intacto. Cada token aqui tem um
 * consumidor previsto no design — superfícies, texto, borda, ação primária,
 * ação destrutiva, feedback e foco.
 */
test('os tokens do tema estão definidos como variáveis CSS', async ({ page }) => {
  await page.goto('/')

  const tokens = await page.evaluate(() => {
    const estilo = getComputedStyle(document.documentElement)
    const nomes = [
      '--color-surface',
      '--color-surface-muted',
      '--color-ink',
      '--color-ink-muted',
      '--color-border',
      '--color-primary',
      '--color-primary-ink',
      '--color-danger',
      '--color-danger-ink',
      '--color-success',
      '--color-warning',
      '--color-focus',
      '--radius-control',
      '--radius-surface',
    ]
    return Object.fromEntries(nomes.map((n) => [n, estilo.getPropertyValue(n).trim()]))
  })

  const vazios = Object.entries(tokens)
    .filter(([, valor]) => valor === '')
    .map(([nome]) => nome)

  expect(vazios, `tokens ausentes no @theme: ${vazios.join(', ')}`).toEqual([])
  expect(tokens['--color-danger']).not.toBe(tokens['--color-primary'])
})
