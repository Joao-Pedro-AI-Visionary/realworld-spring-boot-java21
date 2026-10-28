<!--
  Leis de UX nesta tela:
  - Hick: no maximo 3 abas de feed (Global, Seguindo, tag ativa); no desktop so 12 tags aparecem ate pedir "Ver todas";
    no mobile as tags viram uma faixa unica com rolagem horizontal para nao empurrar o feed.
  - Von Restorff: um unico CTA primario no hero (Criar conta / Escrever artigo); o resto e tonal ou ghost.
  - Fitts: abas e tags com alvo >= 44-48px; no mobile a navegacao principal fica na barra inferior (zona do polegar).
  - Jakob: layout classico de blog (feed a esquerda, tags na lateral), coracao para favoritar.
  - Proximidade: autor, data e favorito agrupados no topo de cada cartao; tags e tempo de leitura no rodape.
  - Pragnanz: cartoes de forma unica e repetida, hierarquia por tamanho de fonte, sem ornamentos.
  - Doherty: skeleton imediato enquanto carrega e favoritar otimista (resposta < 400ms).
  - Estado na URL (?tab, ?tag, ?page): voltar do navegador funciona como esperado.
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { feedArticles, listArticles } from '@/api/articles'
import { listTags } from '@/api/tags'
import AppIcon from '@/components/AppIcon.vue'
import ArticleList from '@/components/ArticleList.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const tag = computed(() => (typeof route.query.tag === 'string' && route.query.tag ? route.query.tag : null))
const tab = computed<'global' | 'following' | 'tag'>(() => {
  if (tag.value) return 'tag'
  if (route.query.tab === 'following' && auth.isLoggedIn) return 'following'
  return 'global'
})
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

const queryKey = computed(() => `${tab.value}:${tag.value ?? ''}:${auth.user?.username ?? ''}`)
const fetcher = computed(() => {
  if (tab.value === 'following') return (offset: number, limit: number) => feedArticles({ offset, limit })
  const t = tag.value ?? undefined
  return (offset: number, limit: number) => listArticles({ tag: t, offset, limit })
})

function goPage(p: number): void {
  router.push({ query: { ...route.query, page: p > 1 ? String(p) : undefined } })
  document.getElementById('feed')?.scrollIntoView({ block: 'start' })
}

const tags = ref<string[]>([])
const tagsLoading = ref(true)
const tagsFailed = ref(false)
const showAllTags = ref(false)

async function loadTags(): Promise<void> {
  tagsLoading.value = true
  tagsFailed.value = false
  try {
    tags.value = await listTags()
  } catch {
    tagsFailed.value = true
  } finally {
    tagsLoading.value = false
  }
}

onMounted(loadTags)
</script>

<template>
  <div class="home">
    <section class="hero" aria-labelledby="hero-title">
      <div class="container hero-inner">
        <template v-if="auth.isLoggedIn && auth.user">
          <p class="eyebrow">Olá, {{ auth.user.username }}</p>
          <h1 id="hero-title">O que você aprendeu hoje?</h1>
          <p class="lead">Transforme o que você descobriu em um artigo curto. A comunidade agradece.</p>
          <div class="row">
            <RouterLink to="/editor" class="btn btn-primary btn-lg cta" data-testid="hero-cta">
              <AppIcon name="edit" :size="18" /> Escrever artigo
            </RouterLink>
          </div>
        </template>
        <template v-else>
          <p class="eyebrow">Comunidade de desenvolvimento</p>
          <h1 id="hero-title">Histórias de quem constrói software.</h1>
          <p class="lead">Leia, publique e discuta artigos sobre código, design e carreira.</p>
          <div class="row">
            <RouterLink to="/register" class="btn btn-primary btn-lg cta" data-testid="hero-cta">
              Criar conta grátis
            </RouterLink>
            <RouterLink to="/login" class="btn btn-ghost btn-lg ghost-on-hero">Já tenho conta</RouterLink>
          </div>
        </template>
      </div>
    </section>

    <div class="container layout page">
      <section id="feed" class="feed" aria-labelledby="feed-title">
        <h2 id="feed-title" class="sr-only">Artigos</h2>
        <nav class="tabs" aria-label="Filtrar artigos" data-testid="feed-tabs">
          <RouterLink
            :to="{ name: 'home' }"
            class="tab"
            :aria-current="tab === 'global' ? 'page' : undefined"
            data-testid="feed-tab-global"
          >
            Feed global
          </RouterLink>
          <RouterLink
            v-if="auth.isLoggedIn"
            :to="{ name: 'home', query: { tab: 'following' } }"
            class="tab"
            :aria-current="tab === 'following' ? 'page' : undefined"
            data-testid="feed-tab-following"
          >
            Seguindo
          </RouterLink>
          <span v-if="tag" class="tab" aria-current="page" data-testid="feed-tab-tag"># {{ tag }}</span>
        </nav>

        <ArticleList
          :query-key="queryKey"
          :fetcher="fetcher"
          :page="page"
          :empty-title="tab === 'following' ? 'Seu feed está vazio' : 'Nenhum artigo encontrado'"
          :empty-message="
            tab === 'following'
              ? 'Siga autores para ver os artigos deles aqui. Comece pelo feed global.'
              : tag
                ? `Ainda não há artigos com a tag ${tag}.`
                : 'Seja a primeira pessoa a publicar.'
          "
          @page-change="goPage"
        >
          <template #empty-action>
            <RouterLink v-if="tab !== 'global'" :to="{ name: 'home' }" class="btn btn-tonal">Ver feed global</RouterLink>
          </template>
        </ArticleList>
      </section>

      <aside class="sidebar" aria-labelledby="tags-title">
        <div class="card tags-card" data-testid="popular-tags">
          <h2 id="tags-title" class="side-title">Tags populares</h2>
          <div v-if="tagsLoading" class="tag-list" aria-hidden="true">
            <span v-for="n in 8" :key="n" class="skeleton" :style="{ width: `${50 + (n % 3) * 18}px`, height: '40px', borderRadius: '999px' }" />
          </div>
          <div v-else-if="tagsFailed" class="tags-error" role="alert">
            <p class="muted">Não foi possível carregar as tags.</p>
            <button type="button" class="btn btn-tonal" data-testid="tags-retry" @click="loadTags">
              <AppIcon name="refresh" :size="18" /> Tentar de novo
            </button>
          </div>
          <p v-else-if="!tags.length" class="muted">Nenhuma tag ainda.</p>
          <template v-else>
            <ul class="tag-list">
              <li v-for="(t, i) in tags" :key="t" :class="{ extra: i >= 12 && !showAllTags }">
                <RouterLink
                  :to="{ name: 'home', query: { tag: t } }"
                  class="tag-pill"
                  :aria-current="t === tag ? 'true' : undefined"
                  data-testid="tag-pill"
                >
                  {{ t }}
                </RouterLink>
              </li>
            </ul>
            <button
              v-if="tags.length > 12"
              type="button"
              class="btn btn-ghost more"
              :aria-expanded="showAllTags"
              @click="showAllTags = !showAllTags"
            >
              {{ showAllTags ? 'Mostrar menos' : `Ver todas (${tags.length})` }}
            </button>
          </template>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.hero {
  background: var(--hero-grad);
  color: #fff;
  position: relative;
  overflow: hidden;
}

.hero::after {
  content: '';
  position: absolute;
  inset: auto -20% -60% auto;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.18), transparent 65%);
  pointer-events: none;
}

.hero-inner {
  position: relative;
  z-index: 1;
  display: grid;
  gap: var(--space-3);
  padding-block: var(--space-8);
}

.eyebrow {
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.9;
}

.hero h1 {
  font-size: var(--fs-3xl);
  font-weight: 800;
  max-width: 18ch;
}

.lead {
  font-size: var(--fs-lg);
  max-width: 46ch;
  opacity: 0.95;
}

.hero .row {
  margin-top: var(--space-3);
}

/* No hero o CTA vira branco para manter contraste com o gradiente e continuar unico. */
.hero .cta {
  --btn-bg: #ffffff;
  --btn-fg: #2f2fb8;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.45);
}

.hero .cta:hover {
  --btn-bg: #f0f0ff;
}

.ghost-on-hero {
  --btn-fg: #ffffff;
}

.ghost-on-hero:hover {
  --btn-bg: rgba(255, 255, 255, 0.14);
}

.hero :focus-visible {
  outline-color: #ffffff;
}

.layout {
  display: grid;
  gap: var(--space-8);
}

.feed {
  display: grid;
  gap: var(--space-5);
  align-content: start;
  min-width: 0;
}

.tabs {
  justify-self: start;
  max-width: 100%;
}

.sidebar {
  order: -1;
}

.tags-card {
  padding: var(--space-5);
  display: grid;
  gap: var(--space-4);
}

.side-title {
  font-size: var(--fs-md);
  font-weight: 700;
}

.tags-error {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
}

.more {
  justify-self: start;
  padding-inline: var(--space-3);
}

@media (max-width: 959px) {
  .tags-card {
    padding: var(--space-4);
    gap: var(--space-3);
  }

  .tags-card .tag-list {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: var(--space-1);
    -webkit-overflow-scrolling: touch;
  }

  .tags-card .tag-list > * {
    flex: 0 0 auto;
  }

  .more {
    display: none;
  }
}

@media (min-width: 960px) {
  .extra {
    display: none;
  }
}

@media (min-width: 960px) {
  .layout {
    grid-template-columns: minmax(0, 1fr) 300px;
    align-items: start;
  }

  .sidebar {
    order: 0;
    position: sticky;
    top: calc(var(--header-h) + var(--space-6));
  }

  .hero-inner {
    padding-block: var(--space-16);
  }
}
</style>
