// Escrita logada: artigos, comentarios, favoritos e seguir.
import { createArticle, DEMO, expect, login, test, uniqueSuffix, waitForCards } from './helpers'

test('criar artigo no editor e ve-lo publicado', async ({ page }) => {
  await login(page)
  const title = `Artigo e2e ${uniqueSuffix()}`
  const slug = await createArticle(page, {
    title,
    description: 'Resumo criado pelo teste',
    body: '## Seção do teste\n\nTexto com **negrito** e `código`.',
    tags: ['e2e', 'playwright'],
  })
  const body = page.getByTestId('article-body')
  await expect(body.locator('h2')).toHaveText('Seção do teste')
  await expect(body.locator('strong')).toHaveText('negrito')
  await expect(page.getByTestId('article-tag')).toHaveText(['e2e', 'playwright'])
  await expect(page.getByTestId('article-author')).toContainText(DEMO.username)

  await page.goto('/')
  await waitForCards(page)
  await expect(page.getByTestId('article-preview').first()).toHaveAttribute('data-slug', slug)
})

test('editar e apagar artigo proprio', async ({ page }) => {
  await login(page)
  const title = `Para editar ${uniqueSuffix()}`
  await createArticle(page, { title, description: 'v1', body: 'Corpo v1', tags: ['e2e'] })

  await page.getByTestId('edit-article').click()
  await expect(page.getByTestId('input-title')).toHaveValue(title)
  const edited = `${title} editado`
  await page.getByTestId('input-title').fill(edited)
  await page.getByTestId('input-body').fill('Corpo **v2**')
  await page.getByTestId('editor-submit').click()
  await expect(page.getByTestId('article-page').getByTestId('article-title')).toHaveText(edited)
  await expect(page.getByTestId('article-body').locator('strong')).toHaveText('v2')
  const slugUrl = page.url()

  await page.getByTestId('delete-article').click()
  await page.getByTestId('confirm-delete-article').click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId('toast').filter({ hasText: 'Artigo apagado.' })).toBeVisible()
  await page.goto(slugUrl)
  await expect(page.getByTestId('error-state')).toContainText('Artigo não encontrado')
})

test('comentar e apagar comentario', async ({ page }) => {
  await login(page)
  await page.goto('/article/composition-api-sem-medo')
  await expect(page.getByTestId('comment-item')).toHaveCount(2)
  const text = `Comentário e2e ${uniqueSuffix()}`
  await page.getByTestId('comment-input').fill(text)
  await page.getByTestId('comment-submit').click()
  await expect(page.getByTestId('comment-item')).toHaveCount(3)
  const mine = page.getByTestId('comment-item').filter({ hasText: text })
  await expect(mine).toBeVisible()
  await expect(page.getByTestId('comment-input')).toHaveValue('')

  await page.reload()
  await expect(page.getByTestId('comment-item').filter({ hasText: text })).toBeVisible()

  await page.getByTestId('comment-item').filter({ hasText: text }).getByTestId('comment-delete').click()
  await expect(page.getByTestId('comment-item')).toHaveCount(2)
  await expect(page.getByTestId('comment-item').filter({ hasText: text })).toHaveCount(0)
})

test('favoritar artigo e ve-lo na aba Favoritos do perfil', async ({ page }) => {
  await login(page)
  await page.goto('/article/jwt-sem-misterio')
  const fav = page.getByTestId('favorite-button')
  await expect(fav).toHaveAttribute('aria-pressed', 'false')
  const before = Number(await fav.getByTestId('favorite-count').textContent())
  await fav.click()
  await expect(fav).toHaveAttribute('aria-pressed', 'true')
  await expect(fav.getByTestId('favorite-count')).toHaveText(String(before + 1))
  await expect(fav).toHaveAttribute('aria-busy', 'false')

  await page.goto(`/profile/${DEMO.username}`)
  await page.getByTestId('profile-tab-favorites').click()
  await expect(page).toHaveURL(new RegExp(`/profile/${DEMO.username}/favorites$`))
  await waitForCards(page)
  await expect(page.locator('[data-testid="article-preview"][data-slug="jwt-sem-misterio"]')).toBeVisible()
})

test('seguir autor e ver os artigos dele na aba Seguindo', async ({ page }) => {
  await login(page)
  await page.goto('/?tab=following')
  await waitForCards(page)
  await expect(page.getByTestId('article-author').filter({ hasText: 'rafael_dev' })).toHaveCount(0)

  await page.goto('/profile/rafael_dev')
  const follow = page.getByTestId('follow-button')
  await expect(follow).toHaveAttribute('aria-pressed', 'false')
  await follow.click()
  await expect(follow).toHaveAttribute('aria-pressed', 'true')
  await expect(follow).toContainText('Seguindo')
  await expect(follow).toHaveAttribute('aria-busy', 'false')

  await page.goto('/')
  await page.getByTestId('feed-tab-following').click()
  await expect(page).toHaveURL(/\?tab=following$/)
  await expect(page.getByTestId('feed-tab-following')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('article-author').filter({ hasText: 'rafael_dev' }).first()).toBeVisible()
})
