<!--
  Leis de UX nesta tela:
  - Proximidade: campos agrupados em "Perfil publico" e "Conta"; a acao de sair fica separada, em zona propria.
  - Von Restorff: "Salvar alteracoes" e o unico botao primario; "Sair" usa estilo de perigo em contorno.
  - Fitts: botoes de largura total no mobile, 48px de altura.
  - Hick: senha opcional (so preenche quem quer trocar), sem configuracoes extras.
  - Pico-Fim: confirmacao "Perfil atualizado" ao salvar.
  - Doherty: spinner imediato no botao durante o envio.
-->
<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import type { UpdateUserPayload } from '@/api/types'
import AppIcon from '@/components/AppIcon.vue'
import ListErrors from '@/components/ListErrors.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()

const form = reactive({
  image: auth.user?.image ?? '',
  username: auth.user?.username ?? '',
  bio: auth.user?.bio ?? '',
  email: auth.user?.email ?? '',
  password: '',
})
const errors = ref<Record<string, string[]> | null>(null)
const saving = ref(false)

async function save(): Promise<void> {
  if (saving.value) return
  saving.value = true
  errors.value = null
  const payload: UpdateUserPayload = {
    image: form.image.trim(),
    username: form.username.trim(),
    bio: form.bio.trim(),
    email: form.email.trim(),
  }
  if (form.password) payload.password = form.password
  try {
    await auth.update(payload)
    form.password = ''
    toast.show('Perfil atualizado.')
  } catch (e) {
    errors.value = e instanceof ApiError && Object.keys(e.errors).length ? e.errors : { '': ['não foi possível salvar agora'] }
    await nextTick()
    document.querySelector<HTMLElement>('[data-testid="form-errors"]')?.focus()
  } finally {
    saving.value = false
  }
}

async function logout(): Promise<void> {
  auth.logout()
  toast.show('Você saiu da sua conta.', 'info')
  await router.push({ name: 'home' })
}
</script>

<template>
  <div class="container page settings">
    <header class="head">
      <h1>Configurações</h1>
      <p class="muted">Como as pessoas veem você no Conduit.</p>
    </header>

    <form class="card panel form" novalidate data-testid="settings-form" @submit.prevent="save">
      <fieldset class="group">
        <legend>Perfil público</legend>
        <div class="avatar-row">
          <UserAvatar :username="form.username || '?'" :image="form.image || null" :size="64" />
          <div class="field grow">
            <label for="set-image">URL da foto de perfil</label>
            <input id="set-image" v-model="form.image" class="input" type="url" inputmode="url" placeholder="https://..." data-testid="input-image" />
          </div>
        </div>
        <div class="field">
          <label for="set-username">Nome de usuário</label>
          <input id="set-username" v-model="form.username" class="input" autocomplete="username" required data-testid="input-username" />
        </div>
        <div class="field">
          <label for="set-bio">Bio</label>
          <textarea id="set-bio" v-model="form.bio" class="input" rows="4" placeholder="Conte um pouco sobre você" data-testid="input-bio" />
        </div>
      </fieldset>

      <fieldset class="group">
        <legend>Conta</legend>
        <div class="field">
          <label for="set-email">E-mail</label>
          <input id="set-email" v-model="form.email" class="input" type="email" autocomplete="email" required data-testid="input-email" />
        </div>
        <div class="field">
          <label for="set-password">Nova senha</label>
          <input
            id="set-password"
            v-model="form.password"
            class="input"
            type="password"
            autocomplete="new-password"
            aria-describedby="set-password-hint"
            data-testid="input-password"
          />
          <span id="set-password-hint" class="hint">Deixe em branco para manter a senha atual.</span>
        </div>
      </fieldset>

      <ListErrors :errors="errors" />

      <div class="actions">
        <button type="submit" class="btn btn-primary btn-lg" :disabled="saving" data-testid="settings-submit">
          <span v-if="saving" class="spinner" aria-hidden="true" />
          Salvar alterações
        </button>
      </div>
    </form>

    <section class="card panel danger-zone" aria-labelledby="logout-title">
      <div>
        <h2 id="logout-title">Sair da conta</h2>
        <p class="muted">Você pode entrar de novo quando quiser.</p>
      </div>
      <button type="button" class="btn btn-danger" data-testid="logout-button" @click="logout">
        <AppIcon name="logout" :size="18" /> Sair
      </button>
    </section>
  </div>
</template>

<style scoped>
.settings {
  max-width: 720px;
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
}

@media (min-width: 768px) {
  .panel {
    padding: var(--space-8);
  }
}

.group {
  border: 0;
  padding: 0;
  margin: 0;
  display: grid;
  gap: var(--space-5);
}

.group + .group {
  padding-top: var(--space-6);
  border-top: 1px solid var(--border);
}

legend {
  font-weight: 700;
  font-size: var(--fs-lg);
  margin-bottom: var(--space-4);
  padding: 0;
}

.avatar-row {
  display: flex;
  gap: var(--space-4);
  align-items: end;
}

.grow {
  flex: 1;
  min-width: 0;
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

.danger-zone {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.danger-zone h2 {
  font-size: var(--fs-lg);
}
</style>
