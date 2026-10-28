// Layout responsivo em cada tela principal: sem scroll horizontal, rolagem vertical ate o rodape e alvos >= 48px.
// Roda nos dois projetos; o criterio foi pensado para o mobile (390x844) e tambem vale para o desktop.
import type { Page } from '@playwright/test'
import { DEMO, expect, login, test, waitForCards } from './helpers'

interface SmallTarget {
  tag: string
  testid: string | null
  text: string
  height: number
}

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const m = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(m.scrollWidth, `scrollWidth ${m.scrollWidth} > innerWidth ${m.innerWidth}`).toBeLessThanOrEqual(m.innerWidth)
}

async function expectScrollsToFooter(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const footerLink = page.locator('footer.app-footer a')
  await expect(footerLink).toBeInViewport({ ratio: 1 })
  const m = await page.evaluate(() => {
    const link = document.querySelector('footer.app-footer a')!.getBoundingClientRect()
    const nav = document.querySelector('[data-testid="bottom-nav"]')!
    const navVisible = getComputedStyle(nav).display !== 'none'
    return {
      tall: document.documentElement.scrollHeight > window.innerHeight,
      scrollY: window.scrollY,
      linkBottom: link.bottom,
      navTop: navVisible ? nav.getBoundingClientRect().top : window.innerHeight,
    }
  })
  if (m.tall) expect(m.scrollY).toBeGreaterThan(0)
  // O ultimo elemento nao pode ficar escondido atras da barra inferior fixa.
  expect(m.linkBottom).toBeLessThanOrEqual(m.navTop)
}

async function smallTargets(page: Page): Promise<SmallTarget[]> {
  return page.evaluate(() => {
    const out: { tag: string; testid: string | null; text: string; height: number }[] = []
    const els = document.querySelectorAll<HTMLElement>('button, a, input, [role="tab"]')
    for (const el of els) {
      // Links inline em texto corrido do markdown ficam de fora do criterio.
      if (el.closest('[data-testid="article-body"]')) continue
      const style = getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden' || (el as HTMLInputElement).type === 'hidden') continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      // Alvo fora do documento (ex.: skip-link escondido acima do topo ate receber foco).
      if (r.bottom + window.scrollY <= 0) continue
      if (r.height < 48 - 0.5) {
        out.push({
          tag: el.tagName.toLowerCase(),
          testid: el.getAttribute('data-testid'),
          text: (el.textContent ?? '').trim().slice(0, 40),
          height: Math.round(r.height * 10) / 10,
        })
      }
    }
    return out
  })
}

async function checkPage(page: Page): Promise<void> {
  await expectNoHorizontalScroll(page)
  expect(await smallTargets(page)).toEqual([])
  await expectScrollsToFooter(page)
  await expectNoHorizontalScroll(page)
}

test('login: sem scroll horizontal, rola ate o rodape e alvos >= 48px', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByTestId('login-form')).toBeVisible()
  await checkPage(page)
})

test('home: sem scroll horizontal, rola ate o rodape e alvos >= 48px', async ({ page }) => {
  await page.goto('/')
  await waitForCards(page)
  await expect(page.getByTestId('pagination')).toBeVisible()
  await checkPage(page)
})

test('artigo: sem scroll horizontal, rola ate o rodape e alvos >= 48px', async ({ page }) => {
  await login(page)
  // Artigo com bloco de codigo, lista e citacao: o caso mais propenso a estourar a largura.
  await page.goto('/article/composition-api-sem-medo')
  await expect(page.getByTestId('article-body')).toBeVisible()
  await expect(page.getByTestId('comment-item').first()).toBeVisible()
  await checkPage(page)
})

test('editor: sem scroll horizontal, rola ate o rodape e alvos >= 48px', async ({ page }) => {
  await login(page)
  await page.goto('/editor')
  await expect(page.getByTestId('editor-form')).toBeVisible()
  await page.getByTestId('input-tags').fill('mobile')
  await page.getByTestId('input-tags').press('Enter')
  await expect(page.getByTestId('editor-tag')).toHaveCount(1)
  await checkPage(page)
})

test('perfil: sem scroll horizontal, rola ate o rodape e alvos >= 48px', async ({ page }) => {
  await login(page)
  await page.goto(`/profile/${DEMO.username}`)
  await expect(page.getByTestId('profile-username')).toHaveText(DEMO.username)
  await waitForCards(page)
  await checkPage(page)
})

test('settings: sem scroll horizontal, rola ate o rodape e alvos >= 48px', async ({ page }) => {
  await login(page)
  await page.goto('/settings')
  await expect(page.getByTestId('settings-form')).toBeVisible()
  await checkPage(page)
})
