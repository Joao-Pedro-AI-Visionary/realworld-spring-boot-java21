<script setup lang="ts">
import type { Article } from '@/api/types'
import { formatDate, readingTime } from '@/lib/format'
import FavoriteButton from './FavoriteButton.vue'
import UserAvatar from './UserAvatar.vue'

defineProps<{ article: Article }>()
const emit = defineEmits<{ update: [article: Article] }>()
</script>

<template>
  <article class="preview card" data-testid="article-preview" :data-slug="article.slug">
    <!-- Proximidade: autor e data juntos; acao de favoritar isolada a direita. -->
    <header class="meta">
      <RouterLink
        :to="{ name: 'profile', params: { username: article.author.username } }"
        class="author"
        data-testid="article-author"
      >
        <UserAvatar :username="article.author.username" :image="article.author.image" :size="36" />
        <span class="author-text">
          <span class="name">{{ article.author.username }}</span>
          <time class="date" :datetime="article.createdAt">{{ formatDate(article.createdAt) }}</time>
        </span>
      </RouterLink>
      <FavoriteButton :article="article" @update="emit('update', $event)" />
    </header>

    <RouterLink
      :to="{ name: 'article', params: { slug: article.slug } }"
      class="body-link"
      data-testid="article-link"
    >
      <h2 class="title" data-testid="article-title">{{ article.title }}</h2>
      <p class="desc">{{ article.description }}</p>
    </RouterLink>

    <footer class="foot">
      <ul v-if="article.tagList.length" class="tag-list" aria-label="Tags do artigo">
        <li v-for="tag in article.tagList" :key="tag" class="tag-pill" data-testid="article-tag">{{ tag }}</li>
      </ul>
      <span class="read muted">{{ readingTime(article.body) }} min de leitura</span>
    </footer>
  </article>
</template>

<style scoped>
.preview {
  padding: var(--space-5);
  display: grid;
  gap: var(--space-4);
  transition:
    box-shadow var(--dur-base) ease,
    transform var(--dur-base) var(--ease-out),
    border-color var(--dur-base) ease;
}

.preview:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border-strong);
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .preview:hover {
    transform: translateY(-2px);
  }
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.author {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--tap);
  color: var(--text);
  min-width: 0;
}

.author:hover {
  text-decoration: none;
}

.author:hover .name {
  text-decoration: underline;
}

.author-text {
  display: grid;
  line-height: 1.3;
  min-width: 0;
}

.name {
  font-weight: 700;
  font-size: var(--fs-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date {
  color: var(--text-muted);
  font-size: var(--fs-xs);
}

.body-link {
  color: inherit;
  display: grid;
  gap: var(--space-2);
  border-radius: var(--radius-sm);
}

.body-link:hover {
  text-decoration: none;
}

.body-link:hover .title {
  color: var(--brand-text);
}

.title {
  font-size: var(--fs-xl);
  font-weight: 750;
  transition: color var(--dur-fast) ease;
}

.desc {
  color: var(--text-muted);
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.read {
  font-size: var(--fs-xs);
  font-weight: 500;
}
</style>
