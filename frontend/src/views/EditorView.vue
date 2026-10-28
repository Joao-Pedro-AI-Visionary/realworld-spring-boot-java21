<!--
  Leis de UX nesta tela:
  - Hick: so 4 campos (titulo, resumo, conteudo, tags); pre-visualizacao fica atras de uma aba.
  - Von Restorff: "Publicar artigo" e o unico botao primario.
  - Fitts: botao de publicar grande e fixo no fim do formulario, largura total no mobile; remover tag com botao de 48px dentro do chip.
  - Jakob: tags entram com Enter ou virgula, como nos editores populares.
  - Proximidade: cada label colado ao seu campo; dica de markdown logo abaixo do conteudo.
  - Pico-Fim: ao publicar, leva direto ao artigo pronto com um aviso de sucesso.
  - Doherty: spinner imediato no envio e skeleton ao carregar um artigo existente.
-->
<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createArticle, getArticle, updateArticle } from '@/api/articles'
import { ApiError } from '@/api/client'
import AppIcon from '@/components/AppIcon.vue'
import ErrorState from '@/components/ErrorState.vue'
import ListErrors from '@/components/ListErrors.vue'
import { renderMarkdown } from '@/lib/markdown'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{ slug?: string }>()

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()

const isEdit = computed(() => !!props.slug)
const form = reactive({ title: '', description: '', body: '', tagList: [] as string[] })
const tagInput = ref('')
const errors = ref<Record<string, string[]> | null>(null)
const saving = ref(false)
const loading = ref(false)
const loadError = ref<string | null>(null)
const preview = ref(false)
const previewHtml = computed(() => (preview.value ? renderMarkdown(form.body) : ''))

async function load(): Promise<void> {
  if (!props.slug) return
  loading.value = true
  loadError.value = null
  try {
    const a = await getArticle(props.slug)
    if (a.author.username !== auth.user?.username) {
      loadError.value = 'Só quem escreveu o artigo pode editá-lo.'
      return
    }
    form.title = a.title
    form.description = a.description
    form.body = a.body
    form.tagList = [...a.tagList]
  } catch (e) {
    loadError.value =
      e instanceof ApiError && e.status === 404 ? 'Este artigo não existe mais.' : 'Não foi possível carregar o artigo.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function addTags(raw: string): void {
  for (const part of raw.split(',')) {
    const t = part.trim().toLowerCase()
    if (t && !form.tagList.includes(t)) form.tagList.push(t)
  }
}

function onTagKey(e: KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addTags(tagInput.value)
    tagInput.value = ''
  } else if (e.key === 'Backspace' && !tagInput.value && form.tagList.length) {
    form.tagList.pop()
  }
}

function flushTagInput(): void {
  if (!tagInput.value.trim()) return
  addTags(tagInput.value)
  tagInput.value = ''
}

function removeTag(tag: string): void {
  form.tagList = form.tagList.filter((t) => t !== tag)
}

async function submit(): Promise<void> {
  if (saving.value) return
  flushTagInput()
  saving.value = true
  errors.value = null
  const payload = {
    title: form.title.trim(),
    description: form.description.trim(),
    body: form.body,
    tagList: form.tagList,
  }
  try {
    const article = props.slug ? await updateArticle(props.slug, payload) : await createArticle(payload)
    toast.show(isEdit.value ? 'Artigo atualizado.' : 'Artigo publicado. Parabéns!')
    await router.push({ name: 'article', params: { slug: article.slug } })
  } catch (e) {
    errors.value = e instanceof ApiError && Object.keys(e.errors).length ? e.errors : { '': ['não foi possível salvar agora'] }
    await nextTick()
    document.querySelector<HTMLElement>('[data-testid="form-errors"]')?.focus()
  } finally {
    saving.value = false
  }
}

const invalid = (field: string) => (errors.value && errors.value[field] ? 'true' : undefined)
</script>

<template>
  <div class="container page editor">
    <header class="head">
      <h1>{{ isEdit ? 'Editar artigo' : 'Novo artigo' }}</h1>
      <p class="muted">Escreva em markdown. Você pode pré-visualizar antes de publicar.</p>
    </header>

    <div v-if="loading" class="card panel" aria-busy="true" data-testid="skeleton">
      <span class="skeleton" style="height: 48px" />
      <span class="skeleton" style="height: 48px" />
      <span class="skeleton" style="height: 240px" />
    </div>

    <ErrorState v-else-if="loadError" title="Não dá para editar" :message="loadError" :retryable="false" />

    <form v-else class="card panel form" novalidate data-testid="editor-form" @submit.prevent="submit">
      <div class="field">
        <label for="ed-title">Título</label>
        <input
          id="ed-title"
          v-model="form.title"
          class="input title-input"
          required
          :aria-invalid="invalid('title')"
          data-testid="input-title"
        />
      </div>

      <div class="field">
        <label for="ed-desc">Resumo</label>
        <input
          id="ed-desc"
          v-model="form.description"
          class="input"
          required
          placeholder="Uma frase que convide à leitura"
          :aria-invalid="invalid('description')"
          data-testid="input-description"
        />
      </div>

      <div class="field">
        <div class="body-head">
          <label for="ed-body" class="label">Conteúdo</label>
          <div class="tabs mini" role="tablist" aria-label="Modo do editor">
            <button
              type="button"
              role="tab"
              class="tab"
              :aria-selected="!preview"
              aria-controls="ed-body-panel"
              data-testid="editor-write-tab"
              @click="preview = false"
            >
              Escrever
            </button>
            <button
              type="button"
              role="tab"
              class="tab"
              :aria-selected="preview"
              aria-controls="ed-body-panel"
              data-testid="editor-preview-tab"
              @click="preview = true"
            >
              Pré-visualizar
            </button>
          </div>
        </div>
        <div id="ed-body-panel" role="tabpanel">
          <textarea
            v-show="!preview"
            id="ed-body"
            v-model="form.body"
            class="input body-input"
            rows="14"
            required
            aria-describedby="ed-body-hint"
            :aria-invalid="invalid('body')"
            data-testid="input-body"
          />
          <div v-if="preview" class="prose preview-box" data-testid="editor-preview">
            <!-- eslint-disable-next-line vue/no-v-html -- HTML sanitizado com DOMPurify -->
            <div v-if="form.body.trim()" v-html="previewHtml" />
            <p v-else class="muted">Nada para pré-visualizar ainda.</p>
          </div>
        </div>
        <span id="ed-body-hint" class="hint">Suporta **negrito**, listas, `código`, blocos de código e links.</span>
      </div>

      <div class="field">
        <label for="ed-tags">Tags</label>
        <div class="tags-box">
          <ul v-if="form.tagList.length" class="tag-list" aria-label="Tags adicionadas">
            <li v-for="t in form.tagList" :key="t" class="tag-pill chip" data-testid="editor-tag">
              {{ t }}
              <button type="button" class="chip-x" :aria-label="`Remover tag ${t}`" @click="removeTag(t)">
                <AppIcon name="x" :size="14" />
              </button>
            </li>
          </ul>
          <input
            id="ed-tags"
            v-model="tagInput"
            class="input"
            placeholder="Digite e aperte Enter"
            aria-describedby="ed-tags-hint"
            data-testid="input-tags"
            @keydown="onTagKey"
            @blur="flushTagInput"
          />
        </div>
        <span id="ed-tags-hint" class="hint">Separe com Enter ou vírgula.</span>
      </div>

      <ListErrors :errors="errors" />

      <div class="actions">
        <button type="submit" class="btn btn-primary btn-lg" :disabled="saving" data-testid="editor-submit">
          <span v-if="saving" class="spinner" aria-hidden="true" />
          {{ isEdit ? 'Salvar alterações' : 'Publicar artigo' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.editor {
  max-width: 820px;
  display: grid;
  gap: var(--space-6);
}

.head {
  display: grid;
  gap: var(--space-1);
}

.head h1 {
  font-size: var(--fs-2xl);
  font-weight: 800;
}

.panel {
  padding: var(--space-5);
  display: grid;
  gap: var(--space-5);
}

@media (min-width: 768px) {
  .panel {
    padding: var(--space-8);
  }
}

.title-input {
  font-size: var(--fs-lg);
  font-weight: 700;
}

.body-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.tabs.mini .tab {
  min-height: var(--tap);
}

.body-input {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  min-height: 280px;
}

.preview-box {
  min-height: 280px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.tags-box {
  display: grid;
  gap: var(--space-3);
}

.chip {
  gap: var(--space-1);
  min-height: var(--tap);
  padding-right: var(--space-1);
  color: var(--text);
}

.chip-x {
  width: var(--tap);
  height: var(--tap);
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.chip-x:hover {
  background: var(--surface-3);
  color: var(--text);
}

.actions .btn {
  width: 100%;
}

@media (min-width: 768px) {
  .actions {
    display: flex;
    justify-content: flex-end;
  }

  .actions .btn {
    width: auto;
  }
}
</style>
