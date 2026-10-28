import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Theme = 'light' | 'dark'
export const THEME_KEY = 'conduit.theme'

const THEME_COLORS: Record<Theme, string> = { light: '#F7F8FB', dark: '#0B0D12' }

function initialTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'light' || attr === 'dark') return attr
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* ignora */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(theme: Theme): void {
  const html = document.documentElement
  html.setAttribute('data-theme', theme)
  html.style.colorScheme = theme
  // Mantem a barra do navegador coerente com a escolha manual.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = THEME_COLORS[theme]
  })
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(initialTheme())

  function set(next: Theme): void {
    theme.value = next
    apply(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      /* ignora */
    }
  }

  function toggle(): void {
    set(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, set, toggle }
})
