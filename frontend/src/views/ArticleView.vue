<!--
  Leis de UX nesta tela:
  - Von Restorff: "Favoritar" e o unico botao primario; seguir, editar e comentar usam estilo tonal; apagar usa perigo.
  - Proximidade: autor, data e tempo de leitura em um bloco; acoes do artigo agrupadas logo abaixo; comentarios separados.
  - Fitts: acoes com 48px; no mobile ficam em linha, largura confortavel para o polegar.
  - Jakob: leitura em coluna unica de ~70 caracteres, coracao para favoritar, comentarios no fim, como em blogs conhecidos.
  - Pragnanz: tipografia de leitura limpa, um nivel de cartao para comentarios.
  - Pico-Fim: o artigo termina com tags e um convite a comentar; ao publicar comentario ele aparece no topo na hora.
  - Doherty: skeleton do artigo e dos comentarios; favoritar e seguir otimistas.
  - Apagar pede confirmacao em linha (evita erro sem modal que trave a rolagem).
-->
<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { deleteArticle, getArticle } from '@/api/articles'
import { ApiError } from '@/api/client'
import { addComment, deleteComment, listComments } from '@/api/comments'
import type { Article, Comment, Profile } from '@/api/types'
import AppIcon from '@/components/AppIcon.vue'
import ErrorState from '@/components/ErrorState.vue'
import FavoriteButton from '@/components/FavoriteButton.vue'
import FollowButton from '@/components/FollowButton.vue'
import ListErrors from '@/components/ListErrors.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { formatDate, readingTime } from '@/lib/format'
import { renderMarkdown } from '@/lib/markdown'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{ slug: string }>()

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()

const article = ref<Article | null>(null)
const loading = ref(true)
const notFound = ref(false)
const failed = ref(false)

const comments = ref<Comment[]>([])
const commentsLoading = ref(true)
const commentsFailed = ref(false)
const newComment = ref('')
const commentErrors = ref<Record<string, string[]> | null>(null)
const posting = ref(false)

const confirmingDelete = ref(false)
const deleting = ref(false)

const isOwner = computed(() => !!article.value && article.value.author.username === auth.user?.username)
const html = computed(() => (article.value ? renderMarkdown(article.value.body) : ''))

async function loadArticle(): Promise<void> {
  loading.value = true
  failed.value = false
  notFound.value = false
  try {
    article.value = await getArticle(props.slug)
    document.title = `${article.value.title} · Conduit`
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound.value = true
    else failed.value = true
  } finally {
    loading.value = false
  }
}

async function loadComments(): Promise<void> {
  commentsLoading.value = true
  commentsFailed.value = false
  try {
    comments.value = await listComments(props.slug)
  } catch {
    commentsFailed.value = true
  } finally {
    commentsLoading.value = false
  }
}

onMounted(() => {
  void loadArticle()
  void loadComments()
})

function onAuthorUpdate(profile: Profile): void {
  if (article.value) article.value = { ...article.value, author: profile }
}

async function confirmDelete(): Promise<void> {
  if (!article.value || deleting.value) return
  deleting.value = true
  try {
    await deleteArticle(article.value.slug)
    toast.show('Artigo apagado.', 'info')
    await router.push({ name: 'home' })
  } catch {
    toast.show('Não foi possível apagar o artigo.', 'error')
  } finally {
    deleting.value = false
    confirmingDelete.value = false
  }
}

async function postComment(): Promise<void> {
  if (posting.value) return
  commentErrors.value = null
  if (!newComment.value.trim()) {
    commentErrors.value = { body: ['não pode ficar vazio'] }
    return
  }
  posting.value = true
  try {
    const c = await addComment(props.slug, newComment.value.trim())
    comments.value = [c, ...comments.value]
    newComment.value = ''
    toast.show('Comentário publicado.')
  } catch (e) {
    commentErrors.value = e instanceof ApiError && Object.keys(e.errors).length ? e.errors : { '': ['não foi possível comentar agora'] }
  } finally {
    posting.value = false
  }
}

async function removeComment(c: Comment): Promise<void> {
  const before = comments.value
  comments.value = comments.value.filter((x) => x.id !== c.id)
  try {
    await deleteComment(props.slug, c.id)
    toast.show('Comentário apagado.', 'info')
    await nextTick()
    document.getElementById('comments-title')?.focus()
  } catch {
    comments.value = before
    toast.show('Não foi possível apagar o comentário.', 'error')
  }
}

const canDelete = (c: Comment) => !!auth.user && (c.author.username === auth.user.username || isOwner.value)
</script>

<template>
  <div class="article-page">
    <!-- carregando -->
    <div v-if="loading" class="container page narrow" aria-busy="true" data-testid="skeleton">
      <span class="skeleton" style="width: 85%; height: 40px" />
      <span class="skeleton" style="width: 55%; height: 40px; margin-top: 12px" />
      <div class="row" style="margin-top: 28px">
        <span class="skeleton" style="width: 44px; height: 44px; border-radius: 50%" />
        <span class="skeleton" style="width: 160px; height: 14px" />
      </div>
      <div class="stack" style="margin-top: 32px">
        <span v-for="n in 6" :key="n" class="skeleton" :style="{ width: `${100 - (n % 3) * 12}%`, height: '16px' }" />
      </div>
    </div>

    <div v-else-if="notFound" class="container page narrow">
      <ErrorState
        title="Artigo não encontrado"
        message="Ele pode ter sido apagado ou o endereço está errado."
        :retryable="false"
      />
      <div class="center"><RouterLink to="/" class="btn btn-tonal">Voltar para o início</RouterLink></div>
    </div>

    <div v-else-if="failed" class="container page narrow">
      <ErrorState title="Não deu para abrir o artigo" message="Verifique sua conexão e tente de novo." @retry="loadArticle" />
    </div>

    <template v-else-if="article">
      <article class="container page narrow" data-testid="article-page">
        <header class="art-head">
          <ul v-if="article.tagList.length" class="tag-list" aria-label="Tags do artigo">
            <li v-for="t in article.tagList" :key="t">
              <RouterLink :to="{ name: 'home', query: { tag: t } }" class="tag-pill" data-testid="article-tag">{{ t }}</RouterLink>
            </li>
          </ul>
          <h1 class="art-title" data-testid="article-title">{{ article.title }}</h1>
          <p class="art-desc">{{ article.description }}</p>

          <div class="byline">
            <RouterLink
              :to="{ name: 'profile', params: { username: article.author.username } }"
              class="author"
              data-testid="article-author"
            >
              <UserAvatar :username="article.author.username" :image="article.author.image" :size="44" />
              <span class="author-text">
                <span class="name">{{ article.author.username }}</span>
                <span class="muted small">
                  <time :datetime="article.createdAt">{{ formatDate(article.createdAt) }}</time>
                  · {{ readingTime(article.body) }} min de leitura
                </span>
              </span>
            </RouterLink>
          </div>

          <div class="actions" role="group" aria-label="Ações do artigo">
            <FavoriteButton :article="article" variant="primary" @update="article = $event" />
            <FollowButton v-if="!isOwner" :profile="article.author" @update="onAuthorUpdate" />
            <template v-if="isOwner">
              <RouterLink
                :to="{ name: 'editor-edit', params: { slug: article.slug } }"
                class="btn btn-tonal"
                data-testid="edit-article"
              >
                <AppIcon name="edit" :size="18" /> Editar
              </RouterLink>
              <button
                v-if="!confirmingDelete"
                type="button"
                class="btn btn-danger"
                data-testid="delete-article"
                @click="confirmingDelete = true"
              >
                <AppIcon name="trash" :size="18" /> Apagar
              </button>
              <span v-else class="confirm" role="alert">
                <span class="small">Apagar de vez?</span>
                <button type="button" class="btn btn-danger" :disabled="deleting" data-testid="confirm-delete-article" @click="confirmDelete">
                  <span v-if="deleting" class="spinner" aria-hidden="true" /> Sim, apagar
                </button>
                <button type="button" class="btn btn-ghost" @click="confirmingDelete = false">Cancelar</button>
              </span>
            </template>
          </div>
        </header>

        <!-- eslint-disable-next-line vue/no-v-html -- HTML sanitizado com DOMPurify -->
        <div class="prose art-body" data-testid="article-body" v-html="html" />
      </article>

      <section class="container narrow comments" aria-labelledby="comments-title" data-testid="comments">
        <h2 id="comments-title" tabindex="-1">
          Comentários <span class="muted count">{{ comments.length }}</span>
        </h2>

        <form v-if="auth.isLoggedIn && auth.user" class="card comment-form" data-testid="comment-form" @submit.prevent="postComment">
          <label for="comment-body" class="sr-only">Escreva um comentário</label>
          <div class="cf-row">
            <UserAvatar :username="auth.user.username" :image="auth.user.image" :size="36" />
            <textarea
              id="comment-body"
              v-model="newComment"
              class="input"
              rows="3"
              placeholder="Escreva um comentário..."
              data-testid="comment-input"
            />
          </div>
          <ListErrors :errors="commentErrors" />
          <div class="cf-actions">
            <button type="submit" class="btn btn-tonal" :disabled="posting" data-testid="comment-submit">
              <span v-if="posting" class="spinner" aria-hidden="true" />
              <AppIcon v-else name="message" :size="18" /> Comentar
            </button>
          </div>
        </form>
        <p v-else class="card login-hint" data-testid="comment-login-hint">
          <RouterLink :to="{ name: 'login', query: { redirect: `/article/${article.slug}` } }">Entre</RouterLink>
          ou
          <RouterLink :to="{ name: 'register', query: { redirect: `/article/${article.slug}` } }">crie uma conta</RouterLink>
          para comentar.
        </p>

        <div v-if="commentsLoading" class="stack" aria-hidden="true">
          <div v-for="n in 2" :key="n" class="card comment">
            <span class="skeleton" style="width: 90%; height: 14px" />
            <span class="skeleton" style="width: 60%; height: 14px" />
          </div>
        </div>
        <ErrorState
          v-else-if="commentsFailed"
          title="Comentários indisponíveis"
          message="Não conseguimos carregar os comentários."
          @retry="loadComments"
        />
        <p v-else-if="!comments.length" class="muted empty" data-testid="comments-empty">
          Ninguém comentou ainda. Que tal começar a conversa?
        </p>
        <TransitionGroup v-else name="fade" tag="ul" class="comment-list">
          <li v-for="c in comments" :key="c.id" class="card comment" data-testid="comment-item">
            <p class="c-body">{{ c.body }}</p>
            <div class="c-foot">
              <RouterLink :to="{ name: 'profile', params: { username: c.author.username } }" class="c-author">
                <UserAvatar :username="c.author.username" :image="c.author.image" :size="28" />
                {{ c.author.username }}
              </RouterLink>
              <time class="muted small" :datetime="c.createdAt">{{ formatDate(c.createdAt) }}</time>
              <button
                v-if="canDelete(c)"
                type="button"
                class="btn btn-ghost icon-btn c-del"
                :aria-label="`Apagar comentário de ${c.author.username}`"
                data-testid="comment-delete"
                @click="removeComment(c)"
              >
                <AppIcon name="trash" :size="18" />
              </button>
            </div>
          </li>
        </TransitionGroup>
      </section>
    </template>
  </div>
</template>

<style scoped>
.narrow {
  max-width: 760px;
}

.center {
  display: flex;
  justify-content: center;
  margin-top: var(--space-4);
}

.art-head {
  display: grid;
  gap: var(--space-4);
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-8);
}

.art-title {
  font-size: var(--fs-3xl);
  font-weight: 800;
}

.art-desc {
  font-size: var(--fs-lg);
  color: var(--text-muted);
}

.byline .author {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--tap);
  color: var(--text);
}

.byline .author:hover {
  text-decoration: none;
}

.byline .author:hover .name {
  text-decoration: underline;
}

.author-text {
  display: grid;
  line-height: 1.35;
}

.name {
  font-weight: 700;
}

.small {
  font-size: var(--fs-xs);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.confirm {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.art-body {
  padding-bottom: var(--space-10);
}

.comments {
  display: grid;
  gap: var(--space-4);
  padding-bottom: var(--space-16);
}

.comments h2 {
  font-size: var(--fs-xl);
  font-weight: 800;
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.count {
  font-size: var(--fs-md);
  font-weight: 600;
}

.comment-form {
  padding: var(--space-4);
  display: grid;
  gap: var(--space-3);
}

.cf-row {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}

.cf-row .input {
  flex: 1;
}

.cf-actions {
  display: flex;
  justify-content: flex-end;
}

.login-hint {
  padding: var(--space-4) var(--space-5);
}

.login-hint a {
  font-weight: 600;
}

.empty {
  padding: var(--space-4) 0;
}

.comment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-3);
}

.comment {
  padding: var(--space-4) var(--space-5);
  display: grid;
  gap: var(--space-3);
}

.c-body {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.c-foot {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.c-author {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--tap);
  font-weight: 600;
  font-size: var(--fs-sm);
  color: var(--text);
}

.c-del {
  margin-left: auto;
  color: var(--text-muted);
}

.c-del:hover {
  color: var(--danger);
}
</style>
