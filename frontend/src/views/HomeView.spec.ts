import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { RouterView } from 'vue-router'
import { setTokenProvider, setTransport, type TransportResponse } from '@/api/client'
import { deferred, fakeTransport, makeArticle, makeRouter } from '@/test/helpers'
import HomeView from './HomeView.vue'

let pinia: Pinia

beforeEach(() => {
  localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
})

afterEach(() => {
  setTransport(null)
  setTokenProvider(() => null)
})

const articles = [
  makeArticle({ slug: 'a', title: 'Primeiro' }),
  makeArticle({ slug: 'b', title: 'Segundo', tagList: ['java'] }),
]

async function mountHome(path = '/') {
  const router = makeRouter(HomeView)
  await router.push(path)
  const wrapper = mount(defineComponent({ render: () => h(RouterView) }), { global: { plugins: [pinia, router] } })
  return { wrapper, router }
}

describe('HomeView', () => {
  it('mostra skeleton e depois os cartoes do feed global e as tags populares', async () => {
    const list = deferred<TransportResponse>()
    const t = fakeTransport((req) => {
      if (req.path.startsWith('/articles')) return list.promise
      if (req.path === '/tags') return { status: 200, body: { tags: ['vue', 'java'] } }
      return { status: 404, body: null }
    })
    setTransport(t)
    const { wrapper } = await mountHome()

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="article-preview"]')).toHaveLength(0)
    expect(wrapper.get('[data-testid="feed-tab-global"]').attributes('aria-current')).toBe('page')

    list.resolve({ status: 200, body: { articles, articlesCount: 2 } })
    await flushPromises()

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="article-title"]').map((x) => x.text())).toEqual(['Primeiro', 'Segundo'])
    expect(wrapper.findAll('[data-testid="tag-pill"]').map((x) => x.text())).toEqual(['vue', 'java'])
    expect(t.calls.find((c) => c.path.startsWith('/articles'))!.path).toBe('/articles?offset=0&limit=10')
    // 2 artigos cabem em uma pagina: sem paginacao.
    expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(false)
  })

  it('filtra por tag e pagina pela query da URL', async () => {
    const t = fakeTransport((req) =>
      req.path === '/tags'
        ? { status: 200, body: { tags: ['java'] } }
        : { status: 200, body: { articles: [articles[1]], articlesCount: 25 } },
    )
    setTransport(t)
    const { wrapper } = await mountHome('/?tag=java&page=2')
    await flushPromises()
    expect(wrapper.get('[data-testid="feed-tab-tag"]').text()).toBe('# java')
    expect(t.calls.some((c) => c.path === '/articles?tag=java&offset=10&limit=10')).toBe(true)
    expect(wrapper.get('[data-testid="page-2"]').attributes('aria-current')).toBe('page')
    expect(wrapper.find('[data-testid="page-3"]').exists()).toBe(true)
  })

  it('erro ao carregar mostra ErrorState e o retry recarrega com sucesso', async () => {
    let fail = true
    const t = fakeTransport((req) => {
      if (req.path === '/tags') return { status: 200, body: { tags: [] } }
      return fail ? { status: 500, body: null } : { status: 200, body: { articles, articlesCount: 2 } }
    })
    setTransport(t)
    const { wrapper } = await mountHome()
    await flushPromises()

    expect(wrapper.find('[data-testid="error-state"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="article-preview"]')).toHaveLength(0)

    fail = false
    await wrapper.get('[data-testid="retry-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="error-state"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="article-preview"]')).toHaveLength(2)
  })

  it('lista vazia mostra EmptyState', async () => {
    setTransport(
      fakeTransport((req) =>
        req.path === '/tags' ? { status: 200, body: { tags: [] } } : { status: 200, body: { articles: [], articlesCount: 0 } },
      ),
    )
    const { wrapper } = await mountHome()
    await flushPromises()
    expect(wrapper.get('[data-testid="empty-state"]').text()).toContain('Nenhum artigo encontrado')
  })
})
