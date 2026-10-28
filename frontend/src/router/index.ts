import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import HomeView from '@/views/HomeView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    title?: string
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView, meta: { title: 'Início' } },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/AuthView.vue'),
    props: { mode: 'login' },
    meta: { guestOnly: true, title: 'Entrar' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/AuthView.vue'),
    props: { mode: 'register' },
    meta: { guestOnly: true, title: 'Criar conta' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { requiresAuth: true, title: 'Configurações' },
  },
  {
    path: '/editor',
    name: 'editor-new',
    component: () => import('@/views/EditorView.vue'),
    meta: { requiresAuth: true, title: 'Novo artigo' },
  },
  {
    path: '/editor/:slug',
    name: 'editor-edit',
    component: () => import('@/views/EditorView.vue'),
    props: true,
    meta: { requiresAuth: true, title: 'Editar artigo' },
  },
  {
    path: '/article/:slug',
    name: 'article',
    component: () => import('@/views/ArticleView.vue'),
    props: true,
    meta: { title: 'Artigo' },
  },
  {
    path: '/profile/:username',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    props: (route) => ({ username: String(route.params.username), tab: 'articles' }),
    meta: { title: 'Perfil' },
  },
  {
    path: '/profile/:username/favorites',
    name: 'profile-favorites',
    component: () => import('@/views/ProfileView.vue'),
    props: (route) => ({ username: String(route.params.username), tab: 'favorites' }),
    meta: { title: 'Favoritos' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Página não encontrada' },
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    // Troca de aba/pagina na mesma tela nao deve pular o usuario para o topo.
    if (to.name === from.name && to.path === from.path) return false
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isLoggedIn) return { name: 'home' }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Conduit` : 'Conduit'
})
