// Leitura anonima: feed global, tags, paginacao e pagina do artigo.
import { expect, expectCleanStorage, test, waitForCards } from './helpers'

test('home carrega o feed global com cartoes e as tags populares', async ({ page }) => {
  await page.goto('/')
  await expectCleanStorage(page)
  await waitForCards(page)
  await expect(page.getByTestId('feed-tab-global')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('article-preview')).toHaveCount(10)
  await expect(page.getByTestId('article-title').first()).toHaveText('Composition API sem medo')
  const tags = page.getByTestId('popular-tags').getByTestId('tag-pill')
  await expect(tags.first()).toBeVisible()
  expect(await tags.count()).toBeGreaterThan(5)
})

test('filtrar por tag mostra so artigos com a tag', async ({ page }) => {
  await page.goto('/')
  await waitForCards(page)
  await page.getByTestId('popular-tags').getByTestId('tag-pill').filter({ hasText: /^\s*java\s*$/ }).click()
  await expect(page).toHaveURL(/\?tag=java$/)
  await expect(page.getByTestId('feed-tab-tag')).toHaveText('# java')
  await expect
    .poll(async () => {
      const cards = page.getByTestId('article-preview')
      const n = await cards.count()
      if (!n) return false
      for (let i = 0; i < n; i++) {
        const t = await cards.nth(i).getByTestId('article-tag').allTextContents()
        if (!t.map((x) => x.trim()).includes('java')) return false
      }
      return n
    })
    .toBe(2)
})

test('paginacao leva para a pagina 2 e volta', async ({ page }) => {
  await page.goto('/')
  await waitForCards(page)
  await expect(page.getByTestId('page-1')).toHaveAttribute('aria-current', 'page')
  await page.getByTestId('page-2').click()
  await expect(page).toHaveURL(/\?page=2$/)
  await expect(page.getByTestId('page-2')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('article-preview')).toHaveCount(2)
  await expect(page.getByTestId('page-next')).toBeDisabled()
  await page.getByTestId('page-prev').click()
  await expect(page).not.toHaveURL(/page=/)
  await expect(page.getByTestId('article-preview')).toHaveCount(10)
})

test('abrir artigo renderiza markdown e mostra comentarios', async ({ page }) => {
  await page.goto('/')
  await waitForCards(page)
  await page.getByTestId('article-link').filter({ hasText: 'Composition API sem medo' }).click()
  await expect(page).toHaveURL(/\/article\/composition-api-sem-medo$/)
  await expect(page.getByTestId('article-page').getByTestId('article-title')).toHaveText('Composition API sem medo')
  const body = page.getByTestId('article-body')
  await expect(body.locator('h2').first()).toHaveText('O problema')
  await expect(body.locator('strong').first()).toBeVisible()
  await expect(body.locator('pre code')).toContainText('useSearch')
  await expect(body.locator('ul > li')).toHaveCount(3)
  await expect(body.locator('blockquote')).toBeVisible()
  // markdown cru nao deve vazar
  await expect(body).not.toContainText('## ')
  await expect(page.getByTestId('comment-item')).toHaveCount(2)
  await expect(page.getByTestId('comment-login-hint')).toBeVisible()
  await expect(page).toHaveTitle('Composition API sem medo · Conduit')
})
