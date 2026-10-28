import { afterEach, describe, expect, it } from 'vitest'
import { ApiError, createFetchTransport, request, setTokenProvider, setTransport, toQuery, type TransportRequest } from './client'

afterEach(() => {
  setTransport(null)
  setTokenProvider(() => null)
})

describe('request', () => {
  it('repassa metodo, caminho, corpo e token ao transporte injetado', async () => {
    const seen: TransportRequest[] = []
    setTokenProvider(() => 'abc')
    setTransport(async (req) => {
      seen.push(req)
      return { status: 200, body: { tags: ['vue'] } }
    })
    const body = await request<{ tags: string[] }>('POST', '/x', { a: 1 })
    expect(body.tags).toEqual(['vue'])
    expect(seen[0]).toEqual({ method: 'POST', path: '/x', body: { a: 1 }, token: 'abc' })
  })

  it('converte 422 {errors} em ApiError', async () => {
    setTransport(async () => ({ status: 422, body: { errors: { email: ['já está em uso'] } } }))
    await expect(request('POST', '/users')).rejects.toMatchObject({
      status: 422,
      errors: { email: ['já está em uso'] },
    })
  })

  it('converte 422 {message} do login invalido', async () => {
    setTransport(async () => ({ status: 422, body: { message: 'invalid email or password' } }))
    const err = await request('POST', '/users/login').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).errors).toEqual({ '': ['invalid email or password'] })
  })
})

describe('createFetchTransport', () => {
  it('monta URL e header Authorization: Token', async () => {
    let url = ''
    let init: RequestInit | undefined
    const fake = (async (u: string, i?: RequestInit) => {
      url = u
      init = i
      return new Response('{"ok":true}', { status: 200 })
    }) as unknown as typeof fetch
    const t = createFetchTransport('https://host/api', fake)
    const res = await t({ method: 'GET', path: '/user', token: 'jwt' })
    expect(url).toBe('https://host/api/user')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Token jwt')
    expect(res).toEqual({ status: 200, body: { ok: true } })
  })
})

describe('request: erros HTTP', () => {
  it.each([
    [401, null, {}, 'Erro HTTP 401'],
    [422, { errors: { title: 'é obrigatório' } }, { title: ['é obrigatório'] }, 'title é obrigatório'],
    [500, { message: 'boom' }, { '': ['boom'] }, 'boom'],
  ])('status %i vira ApiError com errors normalizados', async (status, body, errors, message) => {
    setTransport(async () => ({ status, body }))
    const err = (await request('GET', '/x').catch((e: unknown) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(status)
    expect(err.errors).toEqual(errors)
    expect(err.message).toBe(message)
  })

  it('status 0 (falha de rede do transporte) tambem vira ApiError', async () => {
    const fake = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    setTransport(createFetchTransport('https://host/api', fake))
    const err = (await request('GET', '/tags').catch((e: unknown) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(0)
    expect(err.errors).toEqual({ '': ['não foi possível falar com o servidor'] })
  })
})

describe('createFetchTransport: detalhes', () => {
  it('sem token nao manda Authorization; com corpo manda JSON e Content-Type', async () => {
    let init: RequestInit | undefined
    const fake = (async (_u: string, i?: RequestInit) => {
      init = i
      return new Response(null, { status: 204 })
    }) as unknown as typeof fetch
    const res = await createFetchTransport('https://host/api', fake)({
      method: 'POST',
      path: '/users',
      body: { user: { a: 1 } },
      token: null,
    })
    const headers = init?.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
    expect(headers['Content-Type']).toBe('application/json')
    expect(init?.body).toBe('{"user":{"a":1}}')
    expect(res).toEqual({ status: 204, body: null })
  })

  it('corpo nao JSON vira body null sem lancar', async () => {
    const fake = (async () => new Response('<html>502</html>', { status: 502 })) as unknown as typeof fetch
    const res = await createFetchTransport('https://host/api', fake)({ method: 'GET', path: '/x', token: null })
    expect(res).toEqual({ status: 502, body: null })
  })
})

describe('toQuery', () => {
  it('ignora vazios e codifica valores', () => {
    expect(toQuery({ tag: 'c++', limit: 10, offset: 0, author: '', favorited: undefined })).toBe('?tag=c%2B%2B&limit=10&offset=0')
    expect(toQuery({ a: null })).toBe('')
  })
})
