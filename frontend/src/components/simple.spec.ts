// Componentes de apresentacao: paginacao, estados de erro/vazio, lista de erros, banner demo e tema.
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import DemoBanner from './DemoBanner.vue'
import EmptyState from './EmptyState.vue'
import ErrorState from './ErrorState.vue'
import ListErrors from './ListErrors.vue'
import PaginationNav from './PaginationNav.vue'
import ThemeToggle from './ThemeToggle.vue'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('PaginationNav', () => {
  it('nao aparece com uma pagina so', () => {
    const w = mount(PaginationNav, { props: { page: 1, totalPages: 1 } })
    expect(w.find('[data-testid="pagination"]').exists()).toBe(false)
  })

  it('mostra no maximo 5 numeros em janela em volta da pagina atual', () => {
    const w = mount(PaginationNav, { props: { page: 6, totalPages: 10 } })
    const nums = w.findAll('button[data-testid^="page-"]').filter((b) => /^page-\d+$/.test(b.attributes('data-testid')!))
    expect(nums.map((b) => b.text())).toEqual(['4', '5', '6', '7', '8'])
    expect(w.get('[data-testid="page-6"]').attributes('aria-current')).toBe('page')
    expect(w.get('[data-testid="page-5"]').attributes('aria-current')).toBeUndefined()
  })

  it('janela encosta no fim', () => {
    const w = mount(PaginationNav, { props: { page: 10, totalPages: 10 } })
    expect(w.find('[data-testid="page-6"]').exists()).toBe(true)
    expect(w.find('[data-testid="page-5"]').exists()).toBe(false)
  })

  it('desabilita anterior na primeira e proxima na ultima', () => {
    const first = mount(PaginationNav, { props: { page: 1, totalPages: 2 } })
    expect(first.get('[data-testid="page-prev"]').attributes('disabled')).toBeDefined()
    expect(first.get('[data-testid="page-next"]').attributes('disabled')).toBeUndefined()
    const last = mount(PaginationNav, { props: { page: 2, totalPages: 2 } })
    expect(last.get('[data-testid="page-next"]').attributes('disabled')).toBeDefined()
  })

  it('emite change com a pagina clicada, anterior e proxima', async () => {
    const w = mount(PaginationNav, { props: { page: 2, totalPages: 3 } })
    await w.get('[data-testid="page-3"]').trigger('click')
    await w.get('[data-testid="page-prev"]').trigger('click')
    await w.get('[data-testid="page-next"]').trigger('click')
    expect(w.emitted('change')).toEqual([[3], [1], [3]])
  })
})

describe('ErrorState', () => {
  it('mostra textos padrao e emite retry', async () => {
    const w = mount(ErrorState)
    expect(w.get('[data-testid="error-state"]').attributes('role')).toBe('alert')
    expect(w.text()).toContain('Algo deu errado')
    await w.get('[data-testid="retry-button"]').trigger('click')
    expect(w.emitted('retry')).toHaveLength(1)
  })

  it('sem retryable nao mostra o botao', () => {
    const w = mount(ErrorState, { props: { title: 'X', message: 'Y', retryable: false } })
    expect(w.text()).toContain('X')
    expect(w.text()).toContain('Y')
    expect(w.find('[data-testid="retry-button"]').exists()).toBe(false)
  })
})

describe('EmptyState', () => {
  it('renderiza titulo, mensagem e slot', () => {
    const w = mount(EmptyState, {
      props: { title: 'Nada aqui', message: 'Escreva algo' },
      slots: { default: '<a data-testid="acao">Ação</a>' },
    })
    expect(w.get('[data-testid="empty-state"]').text()).toContain('Nada aqui')
    expect(w.text()).toContain('Escreva algo')
    expect(w.find('[data-testid="acao"]').exists()).toBe(true)
  })

  it('omite o paragrafo sem mensagem', () => {
    const w = mount(EmptyState, { props: { title: 'Só título' } })
    expect(w.findAll('p')).toHaveLength(0)
  })
})

describe('ListErrors', () => {
  it('nao renderiza sem erros', () => {
    expect(mount(ListErrors, { props: { errors: null } }).find('[data-testid="form-errors"]').exists()).toBe(false)
    expect(mount(ListErrors, { props: { errors: {} } }).find('[data-testid="form-errors"]').exists()).toBe(false)
  })

  it('traduz o nome do campo e lista cada mensagem', () => {
    const w = mount(ListErrors, {
      props: { errors: { email: ['já está em uso'], password: ['curta', 'fraca'], '': ['falha geral'] } },
    })
    const items = w.findAll('li').map((li) => li.text())
    expect(items).toEqual(['E-mail: já está em uso', 'Senha: curta', 'Senha: fraca', 'falha geral'])
    expect(w.get('[data-testid="form-errors"]').attributes('role')).toBe('alert')
  })
})

describe('DemoBanner', () => {
  it('aparece, some ao dispensar e continua oculto na proxima montagem', async () => {
    const w = mount(DemoBanner)
    expect(w.find('[data-testid="demo-banner"]').exists()).toBe(true)
    expect(w.text()).toContain('demo@conduit.dev')
    await w.get('[data-testid="demo-banner-dismiss"]').trigger('click')
    expect(w.find('[data-testid="demo-banner"]').exists()).toBe(false)
    expect(localStorage.getItem('conduit.demo.bannerDismissed')).toBe('1')
    expect(mount(DemoBanner).find('[data-testid="demo-banner"]').exists()).toBe(false)
  })
})

describe('ThemeToggle', () => {
  it('alterna tema, rotulo acessivel e atributo do html', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const w = mount(ThemeToggle, { global: { plugins: [pinia] } })
    const btn = () => w.get('[data-testid="theme-toggle"]')
    expect(btn().attributes('aria-pressed')).toBe('false')
    expect(btn().attributes('aria-label')).toBe('Ativar tema escuro')
    await btn().trigger('click')
    expect(btn().attributes('aria-pressed')).toBe('true')
    expect(btn().attributes('aria-label')).toBe('Ativar tema claro')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    await btn().trigger('click')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
