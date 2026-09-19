import { randomUUID } from 'node:crypto'

import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test'

/**
 * O roteiro de `clients` do PLAN §13, em navegador real.
 *
 * Cada teste cria a própria conta, como em `auth.spec.ts`: a carteira é privada
 * por `owner_id`, então contas separadas é o que permite rodar em paralelo sem
 * um teste enxergar o cliente do outro.
 *
 * A semeadura das listas maiores vai pelo REST com o token do próprio
 * consultor, e não pela interface. São 25 cadastros; fazê-los pelo formulário
 * mediria a velocidade de digitação do Playwright, não a listagem. O token é o
 * da sessão real, de modo que a RLS continua sendo a fronteira: nada aqui usa
 * chave de serviço.
 */

const SENHA = 'senha-de-teste-123'

/** Os mesmos valores de `.env.local`: chaves da pilha local, publicadas e não secretas. */
const API = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const CHAVE =
  process.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

type Sessao = { token: string; dono: string }
type SementeDeCliente = {
  name: string
  email?: string
  phone?: string
  status?: string
  source?: string
  region?: string
  income?: number
}

function novoEmail(rotulo: string) {
  return `e2e-${rotulo}-${randomUUID()}@teste.local`
}

/**
 * Contas criadas pelo teste em execução.
 *
 * Um worker do Playwright roda um teste por vez, então a lista só contém a
 * conta do teste corrente — que o `afterEach` esvazia.
 */
const contasDoTeste: string[] = []

/** O preâmbulo de sessão: cadastro aberto, sem confirmação de e-mail (AD-007). */
async function criarConta(page: Page, email: string) {
  contasDoTeste.push(email)
  await page.goto('/signup')
  await page.getByLabel('Nome completo').fill('Joana E2E')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(SENHA)
  await page.getByLabel('Confirmação da senha').fill(SENHA)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/clients$/)
}

async function sessaoDe(request: APIRequestContext, email: string): Promise<Sessao> {
  const resposta = await request.post(`${API}/auth/v1/token?grant_type=password`, {
    headers: { apikey: CHAVE, 'Content-Type': 'application/json' },
    data: { email, password: SENHA },
  })
  expect(resposta.ok()).toBeTruthy()

  const corpo = (await resposta.json()) as { access_token: string; user: { id: string } }
  return { token: corpo.access_token, dono: corpo.user.id }
}

/** Insere clientes do próprio consultor e devolve os identificadores criados. */
async function semearClientes(
  request: APIRequestContext,
  sessao: Sessao,
  clientes: SementeDeCliente[],
): Promise<string[]> {
  const resposta = await request.post(`${API}/rest/v1/clients`, {
    headers: {
      apikey: CHAVE,
      Authorization: `Bearer ${sessao.token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    data: clientes.map((cliente) => ({ status: 'lead', ...cliente, owner_id: sessao.dono })),
  })
  expect(resposta.ok()).toBeTruthy()

  const criados = (await resposta.json()) as { id: string }[]
  return criados.map((cliente) => cliente.id)
}

async function semearNotas(request: APIRequestContext, sessao: Sessao, clientId: string) {
  const resposta = await request.post(`${API}/rest/v1/notes`, {
    headers: {
      apikey: CHAVE,
      Authorization: `Bearer ${sessao.token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    data: [
      { client_id: clientId, title: 'Primeira visita' },
      { client_id: clientId, title: 'Retorno agendado' },
    ],
  })
  expect(resposta.ok()).toBeTruthy()
}

async function notasDe(
  request: APIRequestContext,
  sessao: Sessao,
  clientId: string,
): Promise<unknown[]> {
  const resposta = await request.get(`${API}/rest/v1/notes?select=id&client_id=eq.${clientId}`, {
    headers: { apikey: CHAVE, Authorization: `Bearer ${sessao.token}` },
  })
  expect(resposta.ok()).toBeTruthy()
  return (await resposta.json()) as unknown[]
}

/**
 * Apaga a carteira das contas do teste ao final dele.
 *
 * A suíte de pgTAP consulta `public.clients` sem escopo de dono — ela roda
 * dentro de uma transação, mas enxerga o que já estava lá. Um cliente desta
 * suíte deixado no banco casaria com a busca dela e derrubaria um teste que
 * não tem nada de errado.
 */
test.afterEach(async ({ request }) => {
  for (const email of contasDoTeste.splice(0)) {
    const sessao = await sessaoDe(request, email)
    const resposta = await request.delete(`${API}/rest/v1/clients?owner_id=eq.${sessao.dono}`, {
      headers: {
        apikey: CHAVE,
        Authorization: `Bearer ${sessao.token}`,
        Prefer: 'return=minimal',
      },
    })
    expect(resposta.ok()).toBeTruthy()
  }
})

const linhas = (page: Page) => page.getByRole('table').getByRole('row')

/**
 * Leva o foco até o elemento pela tecla Tab, como o consultor faria.
 *
 * Depois de uma troca de rota o navegador recomeça a ordem de tabulação no
 * documento; o que este percurso prova é que cada passo do fluxo continua
 * alcançável sem mouse, que é o critério de sucesso do spec.
 */
async function focarPorTeclado(page: Page, alvo: Locator, maximo = 40) {
  await expect(alvo).toBeVisible()

  for (let i = 0; i < maximo; i++) {
    if (await alvo.evaluate((elemento) => elemento === document.activeElement)) return
    await page.keyboard.press('Tab')
  }

  throw new Error('o elemento não foi alcançado pela tabulação')
}

test('cadastra um cliente só com o nome e o vê na ficha e no topo da listagem', async ({
  page,
}) => {
  await criarConta(page, novoEmail('cadastro-cliente'))

  await page.getByRole('link', { name: 'Novo cliente' }).click()
  await page.getByLabel('Nome').fill('Maria do Carmo')
  await page.getByRole('button', { name: 'Cadastrar cliente' }).click()

  // CLNT-01 AC1: cria, confirma e navega para a ficha do cliente criado.
  await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Maria do Carmo' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Cliente cadastrado.')

  await page.getByRole('link', { name: 'Voltar para a listagem' }).click()
  await expect(linhas(page).nth(1)).toContainText('Maria do Carmo')
})

test('restaura a mesma lista filtrada ao abrir a URL em outra aba', async ({
  page,
  request,
  context,
}) => {
  const email = novoEmail('filtros')
  await criarConta(page, email)
  const sessao = await sessaoDe(request, email)

  // 25 clientes, dos quais cinco satisfazem os dois filtros ao mesmo tempo.
  await semearClientes(request, sessao, [
    ...Array.from({ length: 5 }, (_, i) => ({
      name: `Alvo ${i + 1}`,
      region: 'Zona Sul',
      status: 'lead',
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      name: `Outro ${i + 1}`,
      region: 'Zona Sul',
      status: 'client',
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      name: `Distante ${i + 1}`,
      region: 'Barra',
      status: 'lead',
    })),
  ])

  await page.goto('/clients')
  await page.getByLabel('Status').selectOption({ label: 'Lead' })
  await page.getByLabel('Região').selectOption({ label: 'Zona Sul' })

  await expect(page.getByRole('navigation', { name: 'Paginação' })).toContainText('5 clientes')
  await expect(linhas(page)).toHaveCount(6)

  // CLNT-10 AC7: a URL descreve a lista inteira, e é isso que a outra aba abre.
  const url = page.url()
  expect(url).toContain('status=lead')
  expect(url).toContain('region=Zona+Sul')

  const outraAba = await context.newPage()
  await outraAba.goto(url)

  await expect(outraAba.getByRole('navigation', { name: 'Paginação' })).toContainText('5 clientes')
  await expect(linhas(outraAba)).toHaveCount(6)
  await expect(outraAba.getByLabel('Status')).toHaveValue('lead')
  await expect(outraAba.getByLabel('Região')).toHaveValue('Zona Sul')
  await outraAba.close()
})

test('volta da ficha para a listagem filtrada preservando os filtros de origem', async ({
  page,
  request,
}) => {
  const email = novoEmail('volta-filtrada')
  await criarConta(page, email)
  const sessao = await sessaoDe(request, email)

  await semearClientes(request, sessao, [
    { name: 'Alvo Zona Sul', region: 'Zona Sul', status: 'lead' },
    { name: 'Outro da Barra', region: 'Barra', status: 'lead' },
  ])

  await page.goto('/clients')
  await page.getByLabel('Região').selectOption({ label: 'Zona Sul' })
  await expect(linhas(page)).toHaveCount(2)

  // CLNT-14 AC8: o filtro viaja no link da listagem e volta pelo da ficha. O
  // percurso é o do consultor, com dado real, e não a ficha aberta com a query
  // já montada na URL.
  await page.getByRole('link', { name: 'Alvo Zona Sul' }).first().click()
  await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}\?region=Zona\+Sul$/)

  await page.getByRole('link', { name: 'Voltar para a listagem' }).click()
  await expect(page).toHaveURL(/\/clients\?region=Zona\+Sul$/)
  await expect(page.getByLabel('Região')).toHaveValue('Zona Sul')
  await expect(linhas(page)).toHaveCount(2)
})

test('encontra o cliente por trecho de nome com acento e por telefone com máscara', async ({
  page,
  request,
}) => {
  const email = novoEmail('busca')
  await criarConta(page, email)
  const sessao = await sessaoDe(request, email)

  await semearClientes(request, sessao, [
    { name: 'José Gonçalves', phone: '11987654321' },
    { name: 'Marcos Antunes', phone: '2133224455' },
  ])

  await page.goto('/clients')
  await expect(linhas(page)).toHaveCount(3)

  // CLNT-08 AC2: correspondência parcial ignorando caixa e acentos.
  await page.getByLabel('Buscar').fill('jose gon')
  await expect(linhas(page)).toHaveCount(2)
  await expect(linhas(page).nth(1)).toContainText('José Gonçalves')

  // CLNT-08 AC3: a máscara digitada é removida antes de comparar.
  await page.getByLabel('Buscar').fill('(11) 98765')
  await expect(linhas(page)).toHaveCount(2)
  await expect(linhas(page).nth(1)).toContainText('José Gonçalves')
})

test('edita o status e o vê na ficha e na listagem', async ({ page, request }) => {
  const email = novoEmail('edicao')
  await criarConta(page, email)
  const sessao = await sessaoDe(request, email)
  await semearClientes(request, sessao, [{ name: 'Paulo Vasques', status: 'lead' }])

  await page.goto('/clients')
  await page.getByRole('link', { name: 'Paulo Vasques' }).first().click()
  await page.getByRole('link', { name: 'Editar' }).click()

  await page.getByLabel('Status').selectOption({ label: 'Cliente' })
  await page.getByRole('button', { name: 'Salvar alterações' }).click()

  // CLNT-15 AC4: confirma, reflete na ficha e volta para ela.
  await expect(page.getByRole('status')).toContainText('Alterações salvas.')
  await expect(page.locator('dt:text-is("Status") + dd')).toHaveText('Cliente')

  await page.getByRole('link', { name: 'Voltar para a listagem' }).click()
  await expect(linhas(page).nth(1)).toContainText('Cliente')
})

test('exclui um cliente com notas e recalcula o total da listagem', async ({ page, request }) => {
  const email = novoEmail('exclusao')
  await criarConta(page, email)
  const sessao = await sessaoDe(request, email)
  const [alvo] = await semearClientes(request, sessao, [
    { name: 'Rita Bandeira' },
    { name: 'Sergio Mota' },
    { name: 'Tania Pires' },
  ])
  await semearNotas(request, sessao, alvo)

  await page.goto('/clients')
  await expect(page.getByRole('navigation', { name: 'Paginação' })).toContainText('3 clientes')

  await page.getByRole('link', { name: 'Rita Bandeira' }).first().click()
  await page.getByRole('button', { name: 'Excluir' }).click()

  const dialogo = page.getByRole('dialog')
  await expect(dialogo).toContainText('Rita Bandeira')
  await dialogo.getByRole('button', { name: 'Excluir' }).click()

  // CLNT-17 AC3 e AC4: some da listagem, confirma, e o total se recalcula.
  await expect(page).toHaveURL(/\/clients$/)
  await expect(page.getByRole('status')).toContainText('Cliente excluído.')
  await expect(page.getByRole('navigation', { name: 'Paginação' })).toContainText('2 clientes')
  await expect(page.getByRole('link', { name: 'Rita Bandeira' })).toHaveCount(0)

  // A cascata é do banco: as notas do cliente excluído não sobrevivem a ele.
  expect(await notasDe(request, sessao, alvo)).toEqual([])
})

test('exclui a partir de uma listagem filtrada e volta com o filtro intacto', async ({
  page,
  request,
}) => {
  const email = novoEmail('exclusao-filtrada')
  await criarConta(page, email)
  const sessao = await sessaoDe(request, email)

  await semearClientes(request, sessao, [
    { name: 'Rita da Zona Sul', region: 'Zona Sul' },
    { name: 'Sergio da Zona Sul', region: 'Zona Sul' },
    { name: 'Tania da Barra', region: 'Barra' },
  ])

  await page.goto('/clients')
  await page.getByLabel('Região').selectOption({ label: 'Zona Sul' })
  await expect(linhas(page)).toHaveCount(3)

  await page.getByRole('link', { name: 'Rita da Zona Sul' }).first().click()
  await page.getByRole('button', { name: 'Excluir' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click()

  // CLNT-16 AC3: a volta é para a listagem filtrada de origem, e não para a
  // carteira inteira. O teste de exclusão acima parte de `/clients` sem filtro,
  // e por isso não distingue as duas.
  await expect(page).toHaveURL(/\/clients\?region=Zona\+Sul$/)
  await expect(page.getByRole('status')).toContainText('Cliente excluído.')
  await expect(page.getByLabel('Região')).toHaveValue('Zona Sul')
  await expect(linhas(page)).toHaveCount(2)
})

test('percorre cadastro, edição e exclusão apenas pelo teclado', async ({ page }) => {
  await criarConta(page, novoEmail('teclado'))

  await focarPorTeclado(page, page.getByRole('link', { name: 'Novo cliente' }))
  await page.keyboard.press('Enter')

  await focarPorTeclado(page, page.getByLabel('Nome'))
  await page.keyboard.type('Teclado Silva')
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { level: 1, name: 'Teclado Silva' })).toBeVisible()

  await focarPorTeclado(page, page.getByRole('link', { name: 'Editar' }))
  await page.keyboard.press('Enter')

  await focarPorTeclado(page, page.getByLabel('Status'))
  // Seleção por digitação: a primeira opção iniciada em "c" é Contatado.
  await page.keyboard.press('c')
  await expect(page.getByLabel('Status')).toHaveValue('contacted')

  await focarPorTeclado(page, page.getByRole('button', { name: 'Salvar alterações' }))
  await page.keyboard.press('Enter')

  await expect(page.locator('dt:text-is("Status") + dd')).toHaveText('Contatado')

  const excluir = page.getByRole('button', { name: 'Excluir' })
  await focarPorTeclado(page, excluir)
  await page.keyboard.press('Enter')

  // CLNT-18 AC3: o foco entra no diálogo, e no cancelamento (CLNT-16 AC2).
  const dialogo = page.getByRole('dialog')
  await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused()
  await page.keyboard.press('Escape')
  // Fechado pelo Escape, o foco volta ao botão que o abriu, sem passar pelo mouse.
  await expect(excluir).toBeFocused()

  await page.keyboard.press('Enter')
  // Do cancelamento para a ação destrutiva pela tabulação, sem sair do diálogo.
  await page.keyboard.press('Tab')
  await expect(dialogo.getByRole('button', { name: 'Excluir' })).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/clients$/)
  await expect(page.getByText('Sua carteira está vazia')).toBeVisible()
})

test('não registra erro de console em nenhuma das telas de clientes', async ({ page, request }) => {
  const email = novoEmail('console')
  const erros: string[] = []
  page.on('console', (mensagem) => {
    if (mensagem.type() === 'error') erros.push(mensagem.text())
  })

  await criarConta(page, email)
  const sessao = await sessaoDe(request, email)
  const [id] = await semearClientes(request, sessao, [
    { name: 'Console Limpo', email: 'console@exemplo.com', phone: '11987654321', region: 'Centro' },
  ])

  await page.goto('/clients')
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible()

  await page.goto('/clients/new')
  await expect(page.getByRole('heading', { level: 1, name: 'Novo cliente' })).toBeVisible()

  await page.goto(`/clients/${id}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Console Limpo' })).toBeVisible()

  await page.goto(`/clients/${id}/edit`)
  await expect(page.getByRole('heading', { level: 1, name: 'Editar cliente' })).toBeVisible()

  expect(erros).toEqual([])
})
