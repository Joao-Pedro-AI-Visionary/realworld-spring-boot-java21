<!--
  Leis de UX nesta tela:
  - Von Restorff: "Seguir" e o unico botao primario (no proprio perfil vira "Editar perfil" em estilo tonal).
  - Hick: apenas duas abas (Artigos e Favoritos).
  - Proximidade: avatar, nome, bio e acao agrupados no cabecalho; lista de artigos logo abaixo das abas.
  - Jakob: cabecalho de perfil centralizado com abas, padrao de redes sociais.
  - Fitts: abas e botao com 44-48px; no mobile o botao ocupa largura confortavel.
  - Doherty: skeleton do cabecalho e da lista; seguir otimista.
  - Abas com URL propria (/favorites) e pagina em ?page: o voltar do navegador funciona.
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listArticles } from '@/api/articles'
import { ApiError } from '@/api/client'
import { getProfile } from '@/api/profiles'
import type { Profile } from '@/api/types'
import AppIcon from '@/components/AppIcon.vue'
import ArticleList from '@/components/ArticleList.vue'
import ErrorState from '@/components/ErrorState.vue'
import FollowButton from '@/components/FollowButton.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ username: string; tab: 'articles' | 'favorites' }>()

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const profile = ref<Profile | null>(null)
const loading = ref(true)
const notFound = ref(false)
const failed = ref(false)

const isSelf = computed(() => auth.user?.username === props.username)
const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const queryKey = computed(() => `${props.tab}:${props.username}:${auth.user?.username ?? ''}`)
const fetcher = computed(() => {
  const u = props.username
  return props.tab === 'favorites'
    ? (offset: number, limit: number) => listArticles({ favorited: u, offset, limit })
    : (offset: number, limit: number) => listArticles({ author: u, offset, limit })
})

async function load(): Promise<void> {
  loading.value = true
  notFound.value = false
  failed.value = false
  try {
    profile.value = await getProfile(props.username)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound.value = true
    else failed.value = true
  } finally {
    loading.value = false
  }
}

watch(() => props.username, load, { immediate: true })

function goPage(p: number): void {
  router.push({ query: { ...route.query, page: p > 1 ? String(p) : undefined } })
}
</script>

<template>
  <div class="profile-page">
    <section class="profile-hero" aria-labelledby="profile-name">
      <div class="container hero-inner">
        <template v-if="loading">
          <span class="skeleton" style="width: 96px; height: 96px; border-radius: 50%" />
          <span class="skeleton" style="width: 180px; height: 28px" />
          <span class="skeleton" style="width: 260px; height: 14px" />
        </template>
        <template v-else-if="profile">
          <UserAvatar :username="profile.username" :image="profile.image" :size="96" />
          <h1 id="profile-name" data-testid="profile-username">{{ profile.username }}</h1>
          <p v-if="profile.bio" class="bio muted" data-testid="profile-bio">{{ profile.bio }}</p>
          <div class="row">
            <RouterLink v-if="isSelf" to="/settings" class="btn btn-tonal" data-testid="edit-profile">
              <AppIcon name="settings" :size="18" /> Editar perfil
            </RouterLink>
            <FollowButton v-else :profile="profile" primary @update="profile = $event" />
          </div>
        </template>
        <h1 v-else id="profile-name" class="sr-only">Perfil</h1>
      </div>
    </section>

    <div class="container page body">
      <ErrorState
        v-if="notFound"
        title="Perfil não encontrado"
        :message="`Não existe ninguém com o usuário ${username}.`"
        :retryable="false"
      />
      <ErrorState v-else-if="failed" title="Não deu para carregar o perfil" @retry="load" />
      <template v-else>
        <nav class="tabs" aria-label="Artigos do perfil" data-testid="profile-tabs">
          <RouterLink
            :to="{ name: 'profile', params: { username } }"
            class="tab"
            :aria-current="tab === 'articles' ? 'page' : undefined"
            data-testid="profile-tab-articles"
          >
            {{ isSelf ? 'Meus artigos' : 'Artigos' }}
          </RouterLink>
          <RouterLink
            :to="{ name: 'profile-favorites', params: { username } }"
            class="tab"
            :aria-current="tab === 'favorites' ? 'page' : undefined"
            data-testid="profile-tab-favorites"
          >
            Favoritos
          </RouterLink>
        </nav>
        <ArticleList
          :query-key="queryKey"
          :fetcher="fetcher"
          :page="page"
          :empty-title="tab === 'favorites' ? 'Nenhum favorito ainda' : 'Nenhum artigo publicado'"
          :empty-message="
            tab === 'favorites'
              ? 'Artigos favoritados aparecem aqui.'
              : isSelf
                ? 'Seu primeiro artigo pode ser curto. Que tal agora?'
                : `${username} ainda não publicou nada.`
          "
          @page-change="goPage"
        >
          <template #empty-action>
            <RouterLink v-if="isSelf && tab === 'articles'" to="/editor" class="btn btn-tonal">
              <AppIcon name="edit" :size="18" /> Escrever artigo
            </RouterLink>
          </template>
        </ArticleList>
      </template>
    </div>
  </div>
</template>

<style scoped>
.profile-hero {
  background:
    radial-gradient(1200px 300px at 50% -40%, var(--brand-soft), transparent),
    var(--surface);
  border-bottom: 1px solid var(--border);
}

.hero-inner {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: var(--space-3);
  padding-block: var(--space-10) var(--space-8);
}

.hero-inner h1 {
  font-size: var(--fs-2xl);
  font-weight: 800;
}

.bio {
  max-width: 52ch;
}

.body {
  max-width: 820px;
  display: grid;
  gap: var(--space-5);
}

.tabs {
  justify-self: start;
}
</style>
