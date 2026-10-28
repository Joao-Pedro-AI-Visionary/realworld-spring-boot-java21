import { MOCK_DEMO_LOGIN } from '../src/api/demo/credentials'
import { expect, test as base, type Page } from '@playwright/test'

export const DEMO = { ...MOCK_DEMO_LOGIN, username: 'demo' }

// Cada teste roda em um BrowserContext novo do Playwright, entao localStorage (inclusive o banco
// demo `conduit.demo.db`) sempre comeca vazio. expectCleanStorage confirma isso quando necessario.
export const test = base

export { expect }

export async function expectCleanStorage(page: Page): Promise<void> {
  expect(await page.evaluate(() => localStorage.getItem('conduit.demo.db'))).toBeNull()
  expect(await page.evaluate(() => localStorage.getItem('conduit.token'))).toBeNull()
}

/** Espera o feed sair do estado de carregamento e mostrar cartoes. */
export async function waitForCards(page: Page): Promise<void> {
  await expect(page.getByTestId('article-preview').first()).toBeVisible()
  await expect(page.getByTestId('article-list')).toHaveAttribute('aria-busy', 'false')
}

export async function login(page: Page, email = DEMO.email, password = DEMO.password): Promise<void> {
  await page.goto('/login')
  await page.getByTestId('input-email').fill(email)
  await page.getByTestId('input-password').fill(password)
  await page.getByTestId('auth-submit').click()
  await expect(page.getByRole('heading', { name: 'O que você aprendeu hoje?' })).toBeVisible()
}

export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** Cria um artigo pelo editor e devolve o slug publicado (lido da URL). */
export async function createArticle(
  page: Page,
  data: { title: string; description: string; body: string; tags: string[] },
): Promise<string> {
  await page.goto('/editor')
  await page.getByTestId('input-title').fill(data.title)
  await page.getByTestId('input-description').fill(data.description)
  await page.getByTestId('input-body').fill(data.body)
  for (const tag of data.tags) {
    await page.getByTestId('input-tags').fill(tag)
    await page.getByTestId('input-tags').press('Enter')
  }
  await expect(page.getByTestId('editor-tag')).toHaveCount(data.tags.length)
  await page.getByTestId('editor-submit').click()
  await expect(page).toHaveURL(/\/article\/[^/]+$/)
  await expect(page.getByTestId('article-page').getByTestId('article-title')).toHaveText(data.title)
  return decodeURIComponent(new URL(page.url()).pathname.split('/').pop()!)
}
