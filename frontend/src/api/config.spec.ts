import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { request, setTransport } from './client'
import { apiBaseUrl, isDemoMode } from './config'

beforeEach(() => {
  localStorage.clear()
  setTransport(null)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  setTransport(null)
})

describe('config', () => {
  it('remove barras finais e espacos da URL base', () => {
    vi.stubEnv('VITE_API_URL', '  https://api.exemplo.dev/api//  ')
    expect(apiBaseUrl()).toBe('https://api.exemplo.dev/api')
  })

  it('VITE_API_URL vazia liga o modo demo', () => {
    vi.stubEnv('VITE_API_URL', '')
    vi.stubEnv('VITE_DEMO_MODE', 'false')
    expect(isDemoMode()).toBe(true)
  })

  it('VITE_DEMO_MODE=true liga o modo demo mesmo com URL', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.exemplo.dev/api')
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    expect(isDemoMode()).toBe(true)
  })

  it('URL preenchida e VITE_DEMO_MODE diferente de true usa a API real', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.exemplo.dev/api')
    vi.stubEnv('VITE_DEMO_MODE', 'false')
    expect(isDemoMode()).toBe(false)
  })
})

describe('request: transporte padrao', () => {
  it('em modo demo responde com a semente local, sem rede', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const res = await request<{ tags: string[] }>('GET', '/tags')
    expect(res.tags.length).toBeGreaterThan(0)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fora do modo demo chama fetch em <VITE_API_URL><path>', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.exemplo.dev/api/')
    vi.stubEnv('VITE_DEMO_MODE', 'false')
    const fetchSpy = vi.fn(async () => new Response('{"tags":["java"]}', { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)
    const res = await request<{ tags: string[] }>('GET', '/tags')
    expect(res.tags).toEqual(['java'])
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect((fetchSpy.mock.calls[0] as unknown[])[0]).toBe('https://api.exemplo.dev/api/tags')
  })
})
