import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { THEME_KEY, useThemeStore } from './theme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.style.colorScheme = ''
  document.head.innerHTML = '<meta name="theme-color" content="#F7F8FB" />'
  setActivePinia(createPinia())
})

describe('theme store', () => {
  it('usa claro por padrao quando nada esta salvo', () => {
    expect(useThemeStore().theme).toBe('light')
  })

  it('respeita o atributo data-theme aplicado pelo script inline', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    expect(useThemeStore().theme).toBe('dark')
  })

  it('le o tema salvo em localStorage', () => {
    localStorage.setItem(THEME_KEY, 'dark')
    expect(useThemeStore().theme).toBe('dark')
  })

  it('toggle alterna, aplica data-theme no html, persiste e atualiza theme-color', () => {
    const theme = useThemeStore()
    theme.toggle()
    expect(theme.theme).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content).toBe('#0B0D12')

    theme.toggle()
    expect(theme.theme).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
  })
})
