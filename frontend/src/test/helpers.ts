// Utilitarios compartilhados pelos testes unitarios (fixtures, router em memoria, transporte falso).
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { Transport, TransportRequest, TransportResponse } from '@/api/client'
import type { Article, User } from '@/api/types'

export function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    slug: 'artigo-de-teste',
    title: 'Artigo de teste',
    description: 'Resumo do artigo',
    body: 'Corpo **markdown** do artigo',
    tagList: ['vue', 'testes'],
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    favorited: false,
    favoritesCount: 3,
    author: { username: 'ana_ribeiro', bio: null, image: null, following: false },
    ...overrides,
  }
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    email: 'demo@conduit.dev',
    token: 'tok-123',
    username: 'demo',
    bio: null,
    image: null,
    ...overrides,
  }
}

const Stub = defineComponent({ name: 'RouteStub', render: () => h('div', { 'data-testid': 'route-stub' }) })

/** Router em memoria com os mesmos nomes de rota do app, sem guardas. */
export function makeRouter(home: unknown = Stub): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: home as typeof Stub },
      { path: '/login', name: 'login', component: Stub },
      { path: '/register', name: 'register', component: Stub },
      { path: '/settings', name: 'settings', component: Stub },
      { path: '/editor', name: 'editor-new', component: Stub },
      { path: '/editor/:slug', name: 'editor-edit', component: Stub },
      { path: '/article/:slug', name: 'article', component: Stub },
      { path: '/profile/:username', name: 'profile', component: Stub },
      { path: '/profile/:username/favorites', name: 'profile-favorites', component: Stub },
    ],
  })
}

export type Route = (req: TransportRequest) => TransportResponse | Promise<TransportResponse>

/** Transporte falso que registra as chamadas e delega a resposta a uma funcao. */
export function fakeTransport(route: Route): Transport & { calls: TransportRequest[] } {
  const calls: TransportRequest[] = []
  const t = (async (req: TransportRequest) => {
    calls.push(req)
    return route(req)
  }) as Transport & { calls: TransportRequest[] }
  t.calls = calls
  return t
}

export interface Deferred<T> {
  promise: Promise<T>
  resolve: (v: T) => void
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
