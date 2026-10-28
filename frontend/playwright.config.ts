import { defineConfig, devices } from '@playwright/test'

// PLAYWRIGHT_BASE_URL aponta os testes para uma URL ja publicada (ex.: deploy na Vercel) e dispensa o webServer.
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim() || undefined
const localBaseURL = 'http://localhost:4173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Maquina de referencia com 8 GB: 2 workers e o teto seguro.
  workers: 2,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: externalBaseURL ?? localBaseURL,
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
        userAgent: devices['Pixel 7'].userAgent,
      },
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'npm run build && npm run preview',
        url: localBaseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { VITE_DEMO_MODE: 'true', VITE_API_URL: '' },
      },
})
