import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ApiError, setTokenProvider, setTransport } from '@/api/client'
import { fakeTransport, makeUser } from '@/test/helpers'
import { TOKEN_KEY, useAuthStore } from './auth'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  setTransport(null)
  setTokenProvider(() => null)
})

describe('auth store', () => {
  it('login guarda usuario, token em memoria e em localStorage', async () => {
    const t = fakeTransport(() => ({ status: 200, body: { user: makeUser({ token: 'jwt-login' }) } }))
    setTransport(t)
    const auth = useAuthStore()
    expect(auth.isLoggedIn).toBe(false)

    const u = await auth.login({ email: 'demo@conduit.dev', password: 'demo1234' })

    expect(u.username).toBe('demo')
    expect(auth.isLoggedIn).toBe(true)
    expect(auth.token).toBe('jwt-login')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-login')
    expect(t.calls[0]).toMatchObject({
      method: 'POST',
      path: '/users/login',
      body: { user: { email: 'demo@conduit.dev', password: 'demo1234' } },
      token: null,
    })
  })

  it('propaga o erro de login invalido e nao cria sessao', async () => {
    setTransport(fakeTransport(() => ({ status: 422, body: { message: 'invalid email or password' } })))
    const auth = useAuthStore()
    const err = await auth.login({ email: 'x@y.dev', password: 'errada' }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(422)
    expect((err as ApiError).errors).toEqual({ '': ['invalid email or password'] })
    expect(auth.isLoggedIn).toBe(false)
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('register cria sessao com o payload correto', async () => {
    const t = fakeTransport(() => ({ status: 201, body: { user: makeUser({ username: 'nova', token: 'jwt-reg' }) } }))
    setTransport(t)
    const auth = useAuthStore()
    await auth.register({ username: 'nova', email: 'nova@x.dev', password: '12345678' })
    expect(t.calls[0]).toMatchObject({ method: 'POST', path: '/users', body: { user: { username: 'nova' } } })
    expect(auth.user?.username).toBe('nova')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-reg')
  })

  it('logout limpa usuario, token e localStorage', async () => {
    setTransport(fakeTransport(() => ({ status: 200, body: { user: makeUser() } })))
    const auth = useAuthStore()
    await auth.login({ email: 'demo@conduit.dev', password: 'demo1234' })
    auth.logout()
    expect(auth.user).toBeNull()
    expect(auth.token).toBeNull()
    expect(auth.isLoggedIn).toBe(false)
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('le o token salvo e o envia no header via tokenProvider ao buscar o usuario atual', async () => {
    localStorage.setItem(TOKEN_KEY, 'salvo')
    // O backend pode devolver token vazio no /user: o atual deve ser mantido.
    const t = fakeTransport(() => ({ status: 200, body: { user: makeUser({ token: '' }) } }))
    setTransport(t)
    const auth = useAuthStore()
    expect(auth.token).toBe('salvo')
    await auth.fetchCurrent()
    expect(t.calls[0]).toMatchObject({ method: 'GET', path: '/user', token: 'salvo' })
    expect(auth.isLoggedIn).toBe(true)
    expect(auth.token).toBe('salvo')
  })

  it('fetchCurrent com token invalido (401) limpa a sessao', async () => {
    localStorage.setItem(TOKEN_KEY, 'vencido')
    setTransport(fakeTransport(() => ({ status: 401, body: null })))
    const auth = useAuthStore()
    await auth.fetchCurrent()
    expect(auth.token).toBeNull()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('fetchCurrent sem token nao chama a API', async () => {
    const t = fakeTransport(() => ({ status: 200, body: {} }))
    setTransport(t)
    await useAuthStore().fetchCurrent()
    expect(t.calls).toHaveLength(0)
  })

  it('fetchCurrent com erro 500 mantem o token e propaga o erro', async () => {
    localStorage.setItem(TOKEN_KEY, 'ok')
    setTransport(fakeTransport(() => ({ status: 500, body: null })))
    const auth = useAuthStore()
    await expect(auth.fetchCurrent()).rejects.toMatchObject({ status: 500 })
    expect(auth.token).toBe('ok')
  })

  it('init resolve uma unica vez e marca ready mesmo com falha de rede', async () => {
    localStorage.setItem(TOKEN_KEY, 'ok')
    const t = fakeTransport(() => ({ status: 0, body: null }))
    setTransport(t)
    const auth = useAuthStore()
    await Promise.all([auth.init(), auth.init()])
    expect(auth.ready).toBe(true)
    expect(t.calls).toHaveLength(1)
    expect(auth.token).toBe('ok')
  })

  it('update envia PUT /user e preserva o token quando a resposta vem sem ele', async () => {
    const responses = [
      { status: 200, body: { user: makeUser({ token: 'jwt' }) } },
      { status: 200, body: { user: makeUser({ token: '', bio: 'Nova bio' }) } },
    ]
    const t = fakeTransport(() => responses.shift()!)
    setTransport(t)
    const auth = useAuthStore()
    await auth.login({ email: 'demo@conduit.dev', password: 'demo1234' })
    const u = await auth.update({ bio: 'Nova bio' })
    expect(t.calls[1]).toMatchObject({ method: 'PUT', path: '/user', body: { user: { bio: 'Nova bio' } }, token: 'jwt' })
    expect(u.bio).toBe('Nova bio')
    expect(auth.token).toBe('jwt')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt')
  })
})
