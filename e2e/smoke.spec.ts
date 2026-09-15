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
