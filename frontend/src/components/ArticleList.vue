<script setup lang="ts">
// Lista de artigos com os 4 estados: carregando (skeleton), erro (com retry), vazio e preenchido.
import { computed, ref, watch } from 'vue'
import type { Article, ArticleList } from '@/api/types'
import ArticlePreview from './ArticlePreview.vue'
import EmptyState from './EmptyState.vue'
import ErrorState from './ErrorState.vue'
import PaginationNav from './PaginationNav.vue'
import SkeletonArticle from './SkeletonArticle.vue'

const props = withDefaults(
  defineProps<{
    /** Chave que identifica a consulta (muda = recarrega). */
    queryKey: string
    fetcher: (offset: number, limit: number) => Promise<ArticleList>
    page?: number
    limit?: number
    emptyTitle?: string
    emptyMessage?: string
  }>(),
  {
    page: 1,
    limit: 10,
    emptyTitle: 'Nenhum artigo por aqui ainda',
    emptyMessage: '',
  },
)
const emit = defineEmits<{ 'page-change': [page: number] }>()

const articles = ref<Article[]>([])
const count = ref(0)
const loading = ref(true)
const failed = ref(false)
let ticket = 0

const totalPages = computed(() => Math.max(1, Math.ceil(count.value / props.limit)))

async function load(): Promise<void> {
  const mine = ++ticket
  loading.value = true
  failed.value = false
  try {
    const res = await props.fetcher((props.page - 1) * props.limit, props.limit)
    if (mine !== ticket) return
    articles.value = res.articles
    count.value = res.articlesCount
  } catch {
    if (mine !== ticket) return
    failed.value = true
  } finally {
    if (mine === ticket) loading.value = false
  }
}

watch(() => [props.queryKey, props.page], load, { immediate: true })

function replace(updated: Article): void {
  articles.value = articles.value.map((a) => (a.slug === updated.slug ? updated : a))
}
</script>

<template>
  <section class="list" :aria-busy="loading" aria-live="polite" data-testid="article-list">
    <SkeletonArticle v-if="loading" :count="3" />
    <ErrorState
      v-else-if="failed"
      title="Não deu para carregar os artigos"
      message="Verifique sua conexão e tente novamente."
      @retry="load"
    />
    <EmptyState v-else-if="!articles.length" :title="emptyTitle" :message="emptyMessage" icon="compass">
      <slot name="empty-action" />
    </EmptyState>
    <template v-else>
      <TransitionGroup name="fade" tag="div" class="stack">
        <ArticlePreview v-for="a in articles" :key="a.slug" :article="a" @update="replace" />
      </TransitionGroup>
      <PaginationNav :page="page" :total-pages="totalPages" @change="emit('page-change', $event)" />
    </template>
  </section>
</template>
