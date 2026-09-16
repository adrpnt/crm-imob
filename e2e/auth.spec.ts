import { randomUUID } from 'node:crypto'

import { expect, test, type Page } from '@playwright/test'

import { esperarLinkPara } from './mailpit'

const SENHA = 'senha-de-teste-123'

function novoEmail(rotulo: string) {
  return `e2e-${rotulo}-${randomUUID()}@teste.local`
}

async function criarConta(page: Page, email: string, nome = 'Joana E2E') {
  await page.goto('/signup')
  await page.getByLabel('Nome completo').fill(nome)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(SENHA)
  await page.getByLabel('Confirmação da senha').fill(SENHA)
  await page.getByRole('button', { name: 'Criar conta' }).click()
}

async function entrar(page: Page, email: string, senha = SENHA) {
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test('cria conta e entra no CRM sem passo intermediário', async ({ page }) => {
  const email = novoEmail('cadastro')
  await criarConta(page, email)

  // AD-007: confirmação de e-mail desligada, então o cadastro já devolve sessão.
  await expect(page).toHaveURL(/\/clients$/)
  await expect(page.getByRole('heading', { name: 'CRM Imobiliário' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Joana E2E' })).toBeVisible()
})

test('sai e entra de novo com as mesmas credenciais', async ({ page }) => {
  const email = novoEmail('reentrada')
  await criarConta(page, email)

  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login/)

  await entrar(page, email)
  await expect(page).toHaveURL(/\/clients$/)
})

test('recarregar uma rota privada autenticado nunca passa pelo login', async ({ page }) => {
  const email = novoEmail('recarga')
  await criarConta(page, email)
  await expect(page).toHaveURL(/\/clients$/)

  // Um piscar da tela de login seria uma navegação para /login. Observar os
  // eventos de navegação detecta o que a checagem do estado final não pega.
  const navegacoes: string[] = []
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navegacoes.push(frame.url())
  })

  await page.reload()
  await expect(page.getByRole('heading', { name: 'CRM Imobiliário' })).toBeVisible()

  expect(navegacoes.filter((url) => url.includes('/login'))).toEqual([])
})

test('visitante sem sessão é levado ao login e volta à rota pretendida', async ({ page }) => {
  const email = novoEmail('pretendida')
  await criarConta(page, email)
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login/)

  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile/)

  await entrar(page, email)
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByRole('heading', { name: 'Meu perfil' })).toBeVisible()
})

test('ignora destino externo no parâmetro de redirecionamento', async ({ page }) => {
  const email = novoEmail('redirect')
  await criarConta(page, email)
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login/)

  await page.goto('/login?redirect=https%3A%2F%2Fsite-falso.example')
  await entrar(page, email)

  await expect(page).toHaveURL(/\/clients$/)
})

test('recupera a senha pelo link real recebido por e-mail', async ({ page }) => {
  const email = novoEmail('recuperacao')
  await criarConta(page, email)
  await page.getByRole('button', { name: 'Sair' }).click()

  await page.goto('/forgot-password')
  await page.getByLabel('E-mail').fill(email)
  await page.getByRole('button', { name: 'Enviar link' }).click()
  await expect(page.getByRole('status')).toContainText(/se houver uma conta/i)

  const link = await esperarLinkPara(email)

  // A configuração de site_url corrigida em T1 aparece aqui: o link precisa
  // levar de volta ao endereço de desenvolvimento, e não à porta padrão.
  expect(link).toContain('localhost:5173')
  expect(link).not.toContain(':3000')

  await page.goto(link)
  await expect(page).toHaveURL(/\/reset-password/)

  const novaSenha = 'outra-senha-456'
  await page.getByLabel('Nova senha', { exact: true }).fill(novaSenha)
  await page.getByLabel('Confirmação da nova senha').fill(novaSenha)
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()

  await expect(page).toHaveURL(/\/clients$/)

  // A senha nova precisa valer de verdade, e a antiga precisa parar de valer.
  await page.getByRole('button', { name: 'Sair' }).click()
  await entrar(page, email, SENHA)
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos')

  await page.getByLabel('Senha', { exact: true }).fill(novaSenha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/clients$/)
})

test('chegar à redefinição sem link orienta a pedir um', async ({ page }) => {
  await page.goto('/reset-password')
  await expect(page.getByRole('status')).toContainText(/abra o link que enviamos/i)
  await expect(page.getByLabel('Nova senha', { exact: true })).toHaveCount(0)
})

test('credencial inválida não revela se o e-mail existe', async ({ page }) => {
  const email = novoEmail('discricao')
  await criarConta(page, email)
  await page.getByRole('button', { name: 'Sair' }).click()

  await entrar(page, email, 'senha-errada-mas-longa')
  const comConta = await page.getByRole('alert').textContent()

  await page.goto('/login')
  await entrar(page, novoEmail('inexistente'), 'qualquer-senha-123')
  const semConta = await page.getByRole('alert').textContent()

  expect(comConta).toBe(semConta)
})
