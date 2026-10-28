// Login, cadastro, rota protegida, settings e logout.
import { DEMO, expect, login, test, uniqueSuffix } from './helpers'

test('login com o usuario demo', async ({ page }) => {
  await login(page)
  await expect(page.getByText(`Olá, ${DEMO.username}`)).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('conduit.token'))).toBeTruthy()
})

test('login com credencial invalida mostra erro e continua na tela', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('input-email').fill(DEMO.email)
  await page.getByTestId('input-password').fill('senha-errada')
  await page.getByTestId('auth-submit').click()
  const errors = page.getByTestId('form-errors')
  await expect(errors).toBeVisible()
  await expect(errors).toBeFocused()
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(() => localStorage.getItem('conduit.token'))).toBeNull()
})

test('cadastro de novo usuario entra logado', async ({ page }) => {
  const username = `e2e_${uniqueSuffix()}`
  await page.goto('/register')
  await page.getByTestId('input-username').fill(username)
  await page.getByTestId('input-email').fill(`${username}@teste.dev`)
  await page.getByTestId('input-password').fill('senhaforte123')
  await page.getByTestId('auth-submit').click()
  await expect(page.getByText(`Olá, ${username}`)).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
})

test('rota protegida redireciona para o login e volta depois de entrar', async ({ page }) => {
  await page.goto('/editor')
  await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)editor$/)
  await page.getByTestId('fill-demo').click()
  await page.getByTestId('auth-submit').click()
  await expect(page).toHaveURL(/\/editor$/)
  await expect(page.getByTestId('editor-form')).toBeVisible()
})

test('settings atualiza a bio e logout encerra a sessao', async ({ page }) => {
  const bio = `Bio atualizada pelo e2e ${uniqueSuffix()}`
  await login(page)
  await page.goto('/settings')
  await expect(page.getByTestId('input-username')).toHaveValue(DEMO.username)
  await page.getByTestId('input-bio').fill(bio)
  await page.getByTestId('settings-submit').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'Perfil atualizado.' })).toBeVisible()

  await page.goto(`/profile/${DEMO.username}`)
  await expect(page.getByTestId('profile-bio')).toHaveText(bio)

  await page.goto('/settings')
  await page.getByTestId('logout-button').click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId('hero-cta')).toHaveText('Criar conta grátis')
  expect(await page.evaluate(() => localStorage.getItem('conduit.token'))).toBeNull()
  await page.goto('/settings')
  await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)settings$/)
})
