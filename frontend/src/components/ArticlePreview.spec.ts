import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setTokenProvider, setTransport } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { fakeTransport, makeArticle, makeRouter, makeUser } from '@/test/helpers'
import ArticlePreview from './ArticlePreview.vue'

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

async function mountPreview(article = makeArticle()) {
  const router = makeRouter()
  await router.push('/')
  const wrapper = mount(ArticlePreview, { props: { article }, global: { plugins: [pinia, router] } })
  return { wrapper, router }
}

describe('ArticlePreview', () => {
  it('renderiza titulo, resumo, autor, tags e favoritos com links certos', async () => {
    const { wrapper } = await mountPreview(
      makeArticle({ slug: 'meu-slug', title: 'Meu título', tagList: ['vue', 'pinia'], favoritesCount: 5 }),
    )
    expect(wrapper.get('[data-testid="article-preview"]').attributes('data-slug')).toBe('meu-slug')
    expect(wrapper.get('[data-testid="article-title"]').text()).toBe('Meu título')
    expect(wrapper.text()).toContain('Resumo do artigo')
    expect(wrapper.get('[data-testid="article-author"]').text()).toContain('ana_ribeiro')
    expect(wrapper.get('[data-testid="article-author"]').attributes('href')).toBe('/profile/ana_ribeiro')
    expect(wrapper.get('[data-testid="article-link"]').attributes('href')).toBe('/article/meu-slug')
    expect(wrapper.findAll('[data-testid="article-tag"]').map((t) => t.text())).toEqual(['vue', 'pinia'])
    expect(wrapper.get('[data-testid="favorite-count"]').text()).toBe('5')
  })

  it('sem tags nao renderiza a lista de tags', async () => {
    const { wrapper } = await mountPreview(makeArticle({ tagList: [] }))
    expect(wrapper.findAll('[data-testid="article-tag"]')).toHaveLength(0)
  })

  it('clique em favoritar (logado) chama a API e repassa o artigo atualizado em update', async () => {
    const auth = useAuthStore()
    auth.user = makeUser()
    auth.token = 'tok-123'
    const t = fakeTransport(() => ({ status: 200, body: { article: makeArticle({ favorited: true, favoritesCount: 4 }) } }))
    setTransport(t)
    const { wrapper } = await mountPreview()
    await wrapper.get('[data-testid="favorite-button"]').trigger('click')
    await flushPromises()
    expect(t.calls[0]).toMatchObject({ method: 'POST', path: '/articles/artigo-de-teste/favorite' })
    const events = wrapper.emitted('update') as [{ favorited: boolean; favoritesCount: number }][]
    expect(events).toHaveLength(2)
    expect(events[0][0]).toMatchObject({ favorited: true, favoritesCount: 4 })
    expect(events[1][0]).toMatchObject({ favorited: true, favoritesCount: 4 })
  })
})
