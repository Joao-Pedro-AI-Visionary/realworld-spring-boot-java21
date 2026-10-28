// Backend RealWorld mockado e puro: (method, path, body, token) => { status, body }.
// Opera sobre um DemoDb em memoria (mutado no lugar); a persistencia fica em ./index.ts.

import type { DemoArticle, DemoComment, DemoDb, DemoUser } from './seed'

export interface DemoResponse {
  status: number
  body: unknown
}

export type DemoHandler = (method: string, path: string, body: unknown, token: string | null) => DemoResponse

const EMPTY = "não pode ficar vazio"

// ---------- token fake ----------

function b64url(input: string): string {
  return btoa(input).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function fromB64url(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  return atob(input.replace(/-/g, '+').replace(/_/g, '/') + pad)
}

export function signDemoToken(userId: string): string {
  const header = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const payload = b64url(JSON.stringify({ sub: userId, demo: true }))
  return `${header}.${payload}.demo-signature`
}

export function readDemoToken(token: string | null): string | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3 || parts[2] !== 'demo-signature') return null
  try {
    const payload = JSON.parse(fromB64url(parts[1])) as { sub?: unknown }
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

// ---------- helpers ----------

const ok = (body: unknown, status = 200): DemoResponse => ({ status, body })
const unprocessable = (errors: Record<string, string[]>): DemoResponse => ({ status: 422, body: { errors } })
const notFound = (): DemoResponse => ({ status: 404, body: null })
const unauthorized = (): DemoResponse => ({ status: 401, body: null })
const forbidden = (): DemoResponse => ({ status: 403, body: null })

function slugify(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'artigo'
  )
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function field(body: unknown, root: string): Record<string, unknown> {
  if (body && typeof body === 'object' && root in body) {
    const inner = (body as Record<string, unknown>)[root]
    if (inner && typeof inner === 'object') return inner as Record<string, unknown>
  }
  return {}
}

function nextId(db: DemoDb, prefix: string): string {
  db.nextId += 1
  return `${prefix}${db.nextId}`
}

function isFollowing(db: DemoDb, viewer: DemoUser | null, target: DemoUser): boolean {
  return !!viewer && db.follows.some((f) => f.followerId === viewer.id && f.followeeId === target.id)
}

function profileOf(db: DemoDb, user: DemoUser, viewer: DemoUser | null) {
  return { username: user.username, bio: user.bio, image: user.image, following: isFollowing(db, viewer, user) }
}

function userOf(user: DemoUser) {
  return { email: user.email, token: signDemoToken(user.id), username: user.username, bio: user.bio, image: user.image }
}

function articleOf(db: DemoDb, a: DemoArticle, viewer: DemoUser | null) {
  const author = db.users.find((u) => u.id === a.authorId)!
  return {
    slug: a.slug,
    title: a.title,
    description: a.description,
    body: a.body,
    tagList: [...a.tagList],
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    favorited: !!viewer && a.favoritedBy.includes(viewer.id),
    favoritesCount: a.favoritedBy.length,
    author: profileOf(db, author, viewer),
  }
}

function commentOf(db: DemoDb, c: DemoComment, viewer: DemoUser | null) {
  const author = db.users.find((u) => u.id === c.authorId)!
  return { id: c.id, body: c.body, createdAt: c.createdAt, updatedAt: c.updatedAt, author: profileOf(db, author, viewer) }
}

function byNewest(a: { createdAt: string }, b: { createdAt: string }): number {
  return b.createdAt.localeCompare(a.createdAt)
}

function page(params: URLSearchParams): { limit: number; offset: number } {
  const limit = Math.max(1, Math.min(100, Number(params.get('limit') ?? 20) || 20))
  const offset = Math.max(0, Number(params.get('offset') ?? 0) || 0)
  return { limit, offset }
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const t of value) {
    const tag = str(t).toLowerCase()
    if (tag && !out.includes(tag)) out.push(tag)
  }
  return out
}

// ---------- handler ----------

export function createDemoHandler(db: DemoDb, now: () => Date = () => new Date()): DemoHandler {
  return (method, rawPath, body, token) => {
    const url = new URL(rawPath, 'http://demo.local')
    const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
    const params = url.searchParams
    const m = method.toUpperCase()

    const viewerId = readDemoToken(token)
    const viewer = viewerId ? (db.users.find((u) => u.id === viewerId) ?? null) : null
    const tokenInvalid = !!token && !viewer
    const requireAuth = (): DemoResponse | null => (viewer ? null : unauthorized())
    const findArticle = (slug: string) => db.articles.find((a) => a.slug === slug)
    const findUser = (username: string) => db.users.find((u) => u.username === username)
    const stamp = () => now().toISOString()

    if (tokenInvalid) return unauthorized()

    const [root, a1, a2, a3] = segments

    // /users e /users/login
    if (root === 'users' && m === 'POST') {
      const input = field(body, 'user')
      if (a1 === 'login') {
        const email = str(input.email).toLowerCase()
        const password = typeof input.password === 'string' ? input.password : ''
        const errors: Record<string, string[]> = {}
        if (!email) errors.email = [EMPTY]
        if (!password) errors.password = [EMPTY]
        if (Object.keys(errors).length) return unprocessable(errors)
        const user = db.users.find((u) => u.email.toLowerCase() === email && u.password === password)
        if (!user) return { status: 422, body: { message: 'e-mail ou senha inválidos' } }
        return ok({ user: userOf(user) })
      }
      if (a1 === undefined) {
        const email = str(input.email).toLowerCase()
        const username = str(input.username)
        const password = typeof input.password === 'string' ? input.password : ''
        const errors: Record<string, string[]> = {}
        if (!email) errors.email = [EMPTY]
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = ['deve ser um e-mail válido']
        else if (db.users.some((u) => u.email.toLowerCase() === email)) errors.email = ['já está em uso']
        if (!username) errors.username = [EMPTY]
        else if (db.users.some((u) => u.username === username)) errors.username = ['já está em uso']
        if (!password) errors.password = [EMPTY]
        if (Object.keys(errors).length) return unprocessable(errors)
        const user: DemoUser = { id: nextId(db, 'u'), email, username, password, bio: null, image: null }
        db.users.push(user)
        return ok({ user: userOf(user) }, 201)
      }
    }

    // /user
    if (root === 'user' && a1 === undefined) {
      const denied = requireAuth()
      if (denied) return denied
      const me = viewer!
      if (m === 'GET') return ok({ user: userOf(me) })
      if (m === 'PUT') {
        const input = field(body, 'user')
        const errors: Record<string, string[]> = {}
        if ('email' in input) {
          const email = str(input.email).toLowerCase()
          if (!email) errors.email = [EMPTY]
          else if (db.users.some((u) => u.id !== me.id && u.email.toLowerCase() === email)) errors.email = ['já está em uso']
        }
        if ('username' in input) {
          const username = str(input.username)
          if (!username) errors.username = [EMPTY]
          else if (db.users.some((u) => u.id !== me.id && u.username === username)) errors.username = ['já está em uso']
        }
        if (Object.keys(errors).length) return unprocessable(errors)
        if ('email' in input) me.email = str(input.email).toLowerCase()
        if ('username' in input) me.username = str(input.username)
        if (typeof input.password === 'string' && input.password) me.password = input.password
        if ('bio' in input) me.bio = str(input.bio) || null
        if ('image' in input) me.image = str(input.image) || null
        return ok({ user: userOf(me) })
      }
    }

    // /profiles/:username(/follow)
    if (root === 'profiles' && a1) {
      const target = findUser(a1)
      if (!target) return notFound()
      if (a2 === undefined && m === 'GET') return ok({ profile: profileOf(db, target, viewer) })
      if (a2 === 'follow' && (m === 'POST' || m === 'DELETE')) {
        const denied = requireAuth()
        if (denied) return denied
        const me = viewer!
        db.follows = db.follows.filter((f) => !(f.followerId === me.id && f.followeeId === target.id))
        if (m === 'POST' && target.id !== me.id) db.follows.push({ followerId: me.id, followeeId: target.id })
        return ok({ profile: profileOf(db, target, me) })
      }
    }

    // /tags
    if (root === 'tags' && a1 === undefined && m === 'GET') {
      const counts = new Map<string, number>()
      for (const a of db.articles) for (const t of a.tagList) counts.set(t, (counts.get(t) ?? 0) + 1)
      const tags = [...counts.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([t]) => t)
      return ok({ tags })
    }

    if (root === 'articles') {
      // /articles/feed
      if (a1 === 'feed' && a2 === undefined && m === 'GET') {
        const denied = requireAuth()
        if (denied) return denied
        const followed = new Set(db.follows.filter((f) => f.followerId === viewer!.id).map((f) => f.followeeId))
        const list = db.articles.filter((a) => followed.has(a.authorId)).sort(byNewest)
        const { limit, offset } = page(params)
        return ok({
          articles: list.slice(offset, offset + limit).map((a) => articleOf(db, a, viewer)),
          articlesCount: list.length,
        })
      }

      // /articles
      if (a1 === undefined) {
        if (m === 'GET') {
          let list = [...db.articles]
          const tag = params.get('tag')
          const author = params.get('author')
          const favorited = params.get('favorited')
          if (tag) list = list.filter((a) => a.tagList.includes(tag))
          if (author) {
            const u = findUser(author)
            list = u ? list.filter((a) => a.authorId === u.id) : []
          }
          if (favorited) {
            const u = findUser(favorited)
            list = u ? list.filter((a) => a.favoritedBy.includes(u.id)) : []
          }
          list.sort(byNewest)
          const { limit, offset } = page(params)
          return ok({
            articles: list.slice(offset, offset + limit).map((a) => articleOf(db, a, viewer)),
            articlesCount: list.length,
          })
        }
        if (m === 'POST') {
          const denied = requireAuth()
          if (denied) return denied
          const input = field(body, 'article')
          const title = str(input.title)
          const description = str(input.description)
          const text = typeof input.body === 'string' ? input.body.trim() : ''
          const errors: Record<string, string[]> = {}
          if (!title) errors.title = [EMPTY]
          if (!description) errors.description = [EMPTY]
          if (!text) errors.body = [EMPTY]
          if (title && db.articles.some((a) => a.slug === slugify(title))) errors.title = ['já existe um artigo com esse título']
          if (Object.keys(errors).length) return unprocessable(errors)
          const ts = stamp()
          const article: DemoArticle = {
            id: nextId(db, 'a'),
            slug: slugify(title),
            title,
            description,
            body: text,
            tagList: normalizeTags(input.tagList),
            createdAt: ts,
            updatedAt: ts,
            authorId: viewer!.id,
            favoritedBy: [],
          }
          db.articles.push(article)
          return ok({ article: articleOf(db, article, viewer) })
        }
      }

      const article = a1 ? findArticle(a1) : undefined

      // /articles/:slug
      if (a1 && a2 === undefined) {
        if (!article) return notFound()
        if (m === 'GET') return ok({ article: articleOf(db, article, viewer) })
        if (m === 'PUT' || m === 'DELETE') {
          const denied = requireAuth()
          if (denied) return denied
          if (article.authorId !== viewer!.id) return forbidden()
          if (m === 'DELETE') {
            db.articles = db.articles.filter((a) => a.id !== article.id)
            db.comments = db.comments.filter((c) => c.articleId !== article.id)
            return { status: 204, body: null }
          }
          const input = field(body, 'article')
          const errors: Record<string, string[]> = {}
          if ('title' in input && !str(input.title)) errors.title = [EMPTY]
          if ('description' in input && !str(input.description)) errors.description = [EMPTY]
          if ('body' in input && !str(input.body)) errors.body = [EMPTY]
          if ('title' in input) {
            const nextSlug = slugify(str(input.title))
            if (db.articles.some((a) => a.id !== article.id && a.slug === nextSlug)) {
              errors.title = ['já existe um artigo com esse título']
            }
          }
          if (Object.keys(errors).length) return unprocessable(errors)
          if ('title' in input) {
            article.title = str(input.title)
            article.slug = slugify(article.title)
          }
          if ('description' in input) article.description = str(input.description)
          if ('body' in input) article.body = String(input.body).trim()
          if ('tagList' in input) article.tagList = normalizeTags(input.tagList)
          article.updatedAt = stamp()
          return ok({ article: articleOf(db, article, viewer) })
        }
      }

      // /articles/:slug/favorite
      if (a1 && a2 === 'favorite' && a3 === undefined && (m === 'POST' || m === 'DELETE')) {
        const denied = requireAuth()
        if (denied) return denied
        if (!article) return notFound()
        article.favoritedBy = article.favoritedBy.filter((id) => id !== viewer!.id)
        if (m === 'POST') article.favoritedBy.push(viewer!.id)
        return ok({ article: articleOf(db, article, viewer) })
      }

      // /articles/:slug/comments(/:id)
      if (a1 && a2 === 'comments') {
        if (!article) return notFound()
        if (a3 === undefined && m === 'GET') {
          const list = db.comments.filter((c) => c.articleId === article.id).sort(byNewest)
          return ok({ comments: list.map((c) => commentOf(db, c, viewer)) })
        }
        if (a3 === undefined && m === 'POST') {
          const denied = requireAuth()
          if (denied) return denied
          const text = str(field(body, 'comment').body)
          if (!text) return unprocessable({ body: [EMPTY] })
          const ts = stamp()
          const comment: DemoComment = {
            id: nextId(db, 'c'),
            articleId: article.id,
            authorId: viewer!.id,
            body: text,
            createdAt: ts,
            updatedAt: ts,
          }
          db.comments.push(comment)
          return ok({ comment: commentOf(db, comment, viewer) }, 201)
        }
        if (a3 && m === 'DELETE') {
          const denied = requireAuth()
          if (denied) return denied
          const comment = db.comments.find((c) => c.id === a3 && c.articleId === article.id)
          if (!comment) return notFound()
          if (comment.authorId !== viewer!.id && article.authorId !== viewer!.id) return forbidden()
          db.comments = db.comments.filter((c) => c.id !== comment.id)
          return { status: 204, body: null }
        }
      }
    }

    return notFound()
  }
}
