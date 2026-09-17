import { expect, test } from '@playwright/test'

// A raiz passou a exigir sessão quando a feature de autenticação entrou. O
// teste de fumaça usa a tela de login, que é a primeira coisa que qualquer
// visitante vê, e portanto o que precisa carregar sem erro.
test('a aplicação carrega e renderiza a tela inicial', async ({ page }) => {
  const errosDeConsole: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errosDeConsole.push(msg.text())
  })

  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Entrar no CRM' })).toBeVisible()
  expect(errosDeConsole).toEqual([])
})

test('a raiz leva quem não tem sessão para o login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})

test('uma rota inexistente mostra a página de não encontrado com volta ao CRM', async ({
  page,
}) => {
  await page.goto('/rota-que-nao-existe')

  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao CRM' }).click()
  // Sem sessão, o caminho de volta passa pela guarda e termina no login.
  await expect(page).toHaveURL(/\/login/)
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
  await page.goto('/login')

  const { larguraDoDocumento, larguraDaJanela } = await page.evaluate(() => ({
    larguraDoDocumento: document.documentElement.scrollWidth,
    larguraDaJanela: document.documentElement.clientWidth,
  }))

  expect(larguraDoDocumento).toBeLessThanOrEqual(larguraDaJanela)
  await expect(page.getByRole('heading', { name: 'Entrar no CRM' })).toBeVisible()
})

test('o layout também cabe em uma janela larga', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/login')

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
  await page.goto('/login')

  // O botão primário consome --color-rocket-500 e --color-graphite-950; sem o
  // pipeline do Tailwind a classe existe no HTML e o estilo não.
  //
  // O texto é grafite, e não branco, por medição: cloud-50 sobre rocket-500 dá
  // 2.66:1 e reprovaria o PLAN §11. Trocar por branco aqui derruba este teste.
  const entrar = page.getByRole('button', { name: 'Entrar' })
  await expect(entrar).toHaveCSS('background-color', 'rgb(255, 106, 0)')
  await expect(entrar).toHaveCSS('color', 'rgb(10, 11, 12)')

  // Peso e família vêm da camada base, não de classe na tela: os títulos não
  // declaram font-*. Se a camada base sumir, o peso cai para 400 e isto falha.
  const titulo = page.getByRole('heading', { name: 'Entrar no CRM' })
  await expect(titulo).toHaveCSS('font-weight', '800')
  await expect(titulo).toHaveCSS('font-family', /Raleway/)
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
      '--font-display',
      '--font-body',
      '--color-graphite-950',
      '--color-graphite-900',
      '--color-graphite-800',
      '--color-graphite-700',
      '--color-graphite-600',
      '--color-graphite-400',
      '--color-rocket-300',
      '--color-rocket-500',
      '--color-rocket-600',
      '--color-rocket-700',
      '--color-silver-300',
      '--color-silver-400',
      '--color-silver-600',
      '--color-cloud-50',
      '--color-danger',
      '--color-danger-fill',
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

  // A ação destrutiva não pode colidir com a ação primária (PLAN §11), e o
  // foco é o laranja da marca por decisão do design system.
  expect(tokens['--color-danger-fill']).not.toBe(tokens['--color-rocket-500'])
  expect(tokens['--color-focus']).toBe(tokens['--color-rocket-500'])
})
