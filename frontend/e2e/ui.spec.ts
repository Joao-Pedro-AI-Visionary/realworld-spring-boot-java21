// Comportamentos de interface: 404, tema escuro sem flash, banner demo e layout por dispositivo.
import { expect, test, waitForCards } from './helpers'

test('rota inexistente mostra a pagina 404', async ({ page }) => {
  await page.goto('/isto/nao/existe')
  await expect(page.getByTestId('not-found')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Esta página saiu para um café')
  await expect(page).toHaveTitle('Página não encontrada · Conduit')
  await page.getByRole('link', { name: 'Voltar para o início' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('dark mode salvo aplica antes do primeiro paint, sem flash', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('conduit.theme', 'dark')
    const w = window as unknown as Record<string, unknown>
    document.addEventListener('DOMContentLoaded', () => {
      w.__themeAtDCL = document.documentElement.getAttribute('data-theme')
    })
    // O primeiro requestAnimationFrame roda imediatamente antes do primeiro paint.
    requestAnimationFrame(() => {
      w.__firstFrame = {
        theme: document.documentElement.getAttribute('data-theme'),
        bg: document.body ? getComputedStyle(document.body).backgroundColor : null,
      }
    })
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect.poll(() => page.evaluate(() => (window as unknown as Record<string, unknown>).__themeAtDCL)).toBe('dark')
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Record<string, unknown>).__firstFrame))
    .toEqual({ theme: 'dark', bg: 'rgb(11, 13, 18)' })
  await expect(page.getByTestId('theme-toggle')).toHaveAttribute('aria-pressed', 'true')
})

test('alternar tema persiste depois de recarregar', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByTestId('theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(11, 13, 18)')
})

test('banner de modo demo aparece e pode ser dispensado de vez', async ({ page }) => {
  await page.goto('/')
  const banner = page.getByTestId('demo-banner')
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('demo@conduit.dev')
  await page.getByTestId('demo-banner-dismiss').click()
  await expect(banner).toHaveCount(0)
  await page.reload()
  await waitForCards(page)
  await expect(page.getByTestId('demo-banner')).toHaveCount(0)
})

test('navegacao: header no desktop, barra inferior no mobile', async ({ page, isMobile }) => {
  await page.goto('/')
  await waitForCards(page)
  if (isMobile) {
    await expect(page.getByTestId('bottom-nav')).toBeVisible()
    await expect(page.getByTestId('nav-login')).toBeHidden()
    await page.getByTestId('bottom-login').click()
  } else {
    await expect(page.getByTestId('bottom-nav')).toBeHidden()
    await expect(page.getByTestId('nav-login')).toBeVisible()
    await page.getByTestId('nav-login').click()
  }
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByTestId('login-form')).toBeVisible()
})
