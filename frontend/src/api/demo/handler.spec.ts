import { describe, expect, it } from 'vitest'
import { createDemoHandler } from './handler'
import { createSeed } from './seed'

function setup() {
  const db = createSeed()
  const handle = createDemoHandler(db, () => new Date('2026-10-28T12:00:00.000Z'))
  const login = () => {
    const res = handle('POST', '/users/login', { user: { email: 'demo@conduit.dev', password: 'demo1234' } }, null)
    return (res.body as { user: { token: string } }).user.token
  }
  return { db, handle, login }
}

describe('demo handler', () => {
  it('faz login com o usuario demo e devolve token reutilizavel', () => {
    const { handle, login } = setup()
    const token = login()
    const me = handle('GET', '/user', undefined, token)
    expect(me.status).toBe(200)
    expect((me.body as { user: { username: string } }).user.username).toBe('demo')
  })

  it('recusa senha errada com 422', () => {
    const { handle } = setup()
    const res = handle('POST', '/users/login', { user: { email: 'demo@conduit.dev', password: 'x' } }, null)
    expect(res.status).toBe(422)
  })

  it('pagina artigos e informa o total', () => {
    const { handle } = setup()
    const res = handle('GET', '/articles?limit=5&offset=10', undefined, null)
    const body = res.body as { articles: unknown[]; articlesCount: number }
    expect(body.articlesCount).toBe(12)
    expect(body.articles).toHaveLength(2)
  })

  it('exige auth para o feed e filtra por quem o usuario segue', () => {
    const { handle, login } = setup()
    expect(handle('GET', '/articles/feed', undefined, null).status).toBe(401)
    const feed = handle('GET', '/articles/feed', undefined, login()).body as {
      articles: { author: { username: string; following: boolean } }[]
    }
    expect(feed.articles.length).toBeGreaterThan(0)
    expect(feed.articles.every((a) => a.author.username === 'ana_ribeiro' && a.author.following)).toBe(true)
  })

  it('cria, favorita, comenta e apaga um artigo', () => {
    const { handle, login } = setup()
    const token = login()
    const created = handle(
      'POST',
      '/articles',
      { article: { title: 'Olá Mundo', description: 'd', body: 'b', tagList: ['Vue', 'vue'] } },
      token,
    )
    const art = (created.body as { article: { slug: string; tagList: string[] } }).article
    expect(art.slug).toBe('ola-mundo')
    expect(art.tagList).toEqual(['vue'])

    const fav = handle('POST', `/articles/${art.slug}/favorite`, undefined, token).body as {
      article: { favorited: boolean; favoritesCount: number }
    }
    expect(fav.article).toMatchObject({ favorited: true, favoritesCount: 1 })

    const c = handle('POST', `/articles/${art.slug}/comments`, { comment: { body: 'oi' } }, token)
    expect(c.status).toBe(201)

    expect(handle('DELETE', `/articles/${art.slug}`, undefined, token).status).toBe(204)
    expect(handle('GET', `/articles/${art.slug}`, undefined, token).status).toBe(404)
  })

  it('devolve 422 com errors por campo ao criar artigo vazio', () => {
    const { handle, login } = setup()
    const res = handle('POST', '/articles', { article: { title: '', description: '', body: '' } }, login())
    expect(res.status).toBe(422)
    expect(Object.keys((res.body as { errors: object }).errors)).toEqual(['title', 'description', 'body'])
  })

  it('proibe editar artigo de outra pessoa (403)', () => {
    const { handle, login } = setup()
    const res = handle('PUT', '/articles/composition-api-sem-medo', { article: { title: 'x' } }, login())
    expect(res.status).toBe(403)
  })
})
