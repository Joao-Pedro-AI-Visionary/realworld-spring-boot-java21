import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { setTokenProvider, setTransport, type TransportResponse } from '@/api/client'
import type { Article } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { deferred, fakeTransport, makeArticle, makeRouter, makeUser } from '@/test/helpers'
import FavoriteButton from './FavoriteButton.vue'

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

function login(): void {
  const auth = useAuthStore()
  const u = makeUser()
  auth.user = u
  auth.token = u.token
}

/** Pai que aplica o evento update, como o ArticleList/ArticleView fazem. */
async function mountWithParent(initial: Article) {
  const router = makeRouter()
  await router.push('/')
  const current = ref(initial)
  const Parent = defineComponent({
    setup: () => () => h(FavoriteButton, { article: current.value, onUpdate: (a: Article) => (current.value = a) }),
  })
  const wrapper = mount(Parent, { global: { plugins: [pinia, router] } })
  return { wrapper, current, router }
}

describe('FavoriteButton', () => {
  it('mostra contagem e estado acessivel', async () => {
    const { wrapper } = await mountWithParent(makeArticle({ favoritesCount: 7 }))
    const btn = wrapper.get('[data-testid="favorite-button"]')
    expect(btn.attributes('aria-pressed')).toBe('false')
    expect(btn.attributes('aria-label')).toBe('Favoritar (7 favoritos)')
    expect(wrapper.get('[data-testid="favorite-count"]').text()).toBe('7')
  })

  it('deslogado leva para o login com redirect, sem chamar a API', async () => {
    const t = fakeTransport(() => ({ status: 200, body: {} }))
    setTransport(t)
    const { wrapper, router } = await mountWithParent(makeArticle())
    await wrapper.get('[data-testid="favorite-button"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/')
    expect(t.calls).toHaveLength(0)
  })

  it('logado: atualiza na hora (otimista) e confirma com a resposta da API', async () => {
    login()
    const pending = deferred<TransportResponse>()
    const t = fakeTransport(() => pending.promise)
    setTransport(t)
    const { wrapper, current } = await mountWithParent(makeArticle({ favoritesCount: 3 }))

    await wrapper.get('[data-testid="favorite-button"]').trigger('click')
    // Antes da resposta: ja aparece favoritado com +1.
    expect(current.value.favorited).toBe(true)
    expect(wrapper.get('[data-testid="favorite-count"]').text()).toBe('4')
    expect(wrapper.get('[data-testid="favorite-button"]').attributes('aria-busy')).toBe('true')
    expect(t.calls[0]).toMatchObject({ method: 'POST', path: '/articles/artigo-de-teste/favorite', token: 'tok-123' })

    pending.resolve({ status: 200, body: { article: makeArticle({ favorited: true, favoritesCount: 10 }) } })
    await flushPromises()
    expect(wrapper.get('[data-testid="favorite-count"]').text()).toBe('10')
    expect(wrapper.get('[data-testid="favorite-button"]').attributes('aria-pressed')).toBe('true')
  })

  it('desfavoritar usa DELETE', async () => {
    login()
    const t = fakeTransport(() => ({ status: 200, body: { article: makeArticle({ favorited: false, favoritesCount: 2 }) } }))
    setTransport(t)
    const { wrapper } = await mountWithParent(makeArticle({ favorited: true, favoritesCount: 3 }))
    await wrapper.get('[data-testid="favorite-button"]').trigger('click')
    await flushPromises()
    expect(t.calls[0].method).toBe('DELETE')
    expect(wrapper.get('[data-testid="favorite-count"]').text()).toBe('2')
  })

  it('reverte o estado e avisa quando a API falha', async () => {
    login()
    setTransport(fakeTransport(() => ({ status: 500, body: null })))
    const { wrapper, current } = await mountWithParent(makeArticle({ favoritesCount: 3 }))
    await wrapper.get('[data-testid="favorite-button"]').trigger('click')
    await flushPromises()
    expect(current.value.favorited).toBe(false)
    expect(current.value.favoritesCount).toBe(3)
    expect(useToastStore().toasts.at(-1)).toMatchObject({ tone: 'error' })
  })
})
