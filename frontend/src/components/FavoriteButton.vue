<script setup lang="ts">
// Favoritar com atualizacao otimista: resposta visual imediata (Doherty), reverte se a API falhar.
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { favoriteArticle, unfavoriteArticle } from '@/api/articles'
import type { Article } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import AppIcon from './AppIcon.vue'

const props = withDefaults(defineProps<{ article: Article; variant?: 'compact' | 'primary' }>(), {
  variant: 'compact',
})
const emit = defineEmits<{ update: [article: Article] }>()

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()
const busy = ref(false)

async function toggle(): Promise<void> {
  if (!auth.isLoggedIn) {
    await router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    return
  }
  if (busy.value) return
  busy.value = true
  const before = props.article
  const wasFavorited = before.favorited
  emit('update', {
    ...before,
    favorited: !wasFavorited,
    favoritesCount: before.favoritesCount + (wasFavorited ? -1 : 1),
  })
  try {
    const updated = wasFavorited ? await unfavoriteArticle(before.slug) : await favoriteArticle(before.slug)
    emit('update', updated)
  } catch {
    emit('update', before)
    toast.show('Não foi possível atualizar o favorito. Tente de novo.', 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="btn fav"
    :class="[variant === 'primary' ? 'btn-primary' : 'btn-tonal', { 'is-on': article.favorited }]"
    :aria-pressed="article.favorited"
    :aria-label="
      article.favorited
        ? `Remover dos favoritos (${article.favoritesCount} favoritos)`
        : `Favoritar (${article.favoritesCount} favoritos)`
    "
    :aria-busy="busy"
    data-testid="favorite-button"
    @click="toggle"
  >
    <AppIcon :name="article.favorited ? 'heart-fill' : 'heart'" :size="18" />
    <span v-if="variant === 'primary'">{{ article.favorited ? 'Favoritado' : 'Favoritar' }}</span>
    <span class="count" data-testid="favorite-count">{{ article.favoritesCount }}</span>
  </button>
</template>

<style scoped>
.fav {
  padding-inline: var(--space-4);
}

.fav .count {
  font-variant-numeric: tabular-nums;
}

.fav.btn-primary .count {
  padding-left: var(--space-2);
  border-left: 1px solid rgba(255, 255, 255, 0.35);
}

.fav.is-on.btn-tonal {
  --btn-border: var(--brand-text);
}

.fav svg {
  transition: transform var(--dur-base) var(--ease-out);
}

.fav.is-on svg {
  transform: scale(1.12);
}
</style>
