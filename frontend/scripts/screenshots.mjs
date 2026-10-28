// Gera screenshots das telas principais em mobile (390x844) e desktop (1440x900).
// Uso: node scripts/screenshots.mjs [baseUrl] [pastaDeSaida]
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const base = (process.argv[2] ?? 'https://realworld-conduit-vue.vercel.app').replace(/\/$/, '')
const out = resolve(process.argv[3] ?? 'screenshots')
mkdirSync(out, { recursive: true })

const viewports = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
}

const themes = (process.env.THEMES ?? 'light').split(',')

async function settle(page) {
  await page.waitForLoadState('networkidle')
  await page.locator('[data-testid="skeleton"]').first().waitFor({ state: 'detached' }).catch(() => {})
  await page.evaluate(() => document.fonts.ready)
}

const browser = await chromium.launch()
try {
  for (const theme of themes) {
    for (const [name, options] of Object.entries(viewports)) {
      const context = await browser.newContext({ ...options, colorScheme: theme === 'dark' ? 'dark' : 'light' })
      await context.addInitScript((t) => {
        localStorage.setItem('conduit.theme', t)
      }, theme)
      const page = await context.newPage()
      const shot = async (label) => {
        await settle(page)
        const suffix = theme === 'light' ? '' : `-${theme}`
        const file = resolve(out, `${label}-${name}${suffix}.png`)
        await page.screenshot({ path: file })
        console.log('OK', file)
      }

      await page.goto(`${base}/`)
      await shot('home')

      const firstArticle = page.getByTestId('article-link').first()
      await firstArticle.waitFor()
      const href = await firstArticle.getAttribute('href')
      await page.goto(`${base}${href}`)
      await shot('article')

      await page.goto(`${base}/login`)
      await shot('login')

      await page.getByTestId('input-email').fill('demo@conduit.dev')
      await page.getByTestId('input-password').fill('demo1234')
      await page.getByTestId('auth-submit').click()
      await page.waitForURL((url) => !url.pathname.startsWith('/login'))
      const username = await page.getByTestId('nav-profile').or(page.getByTestId('bottom-profile')).first().getAttribute('href')
      await page.goto(`${base}${username}`)
      await shot('profile')

      await page.goto(`${base}/editor`)
      await shot('editor')

      await context.close()
    }
  }
} finally {
  await browser.close()
}
