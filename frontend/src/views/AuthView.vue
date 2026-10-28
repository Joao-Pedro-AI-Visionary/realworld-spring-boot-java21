<!--
  Leis de UX nesta tela (login e cadastro):
  - Hick: so os campos indispensaveis (2 no login, 3 no cadastro), sem distracoes ao redor.
  - Von Restorff: um unico botao primario (Entrar / Criar conta), largura total.
  - Fitts: campos e botao com 48px+ de altura e largura total no mobile.
  - Jakob: formulario centralizado com link para a outra opcao logo abaixo, padrao conhecido.
  - Proximidade: label colado ao campo; erros aparecem acima do botao, perto de onde o usuario esta olhando.
  - Pico-Fim: termina com um aviso de boas-vindas e volta para onde o usuario queria ir (?redirect).
  - Doherty: botao mostra spinner imediatamente ao enviar.
-->
<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isDemoMode } from '@/api/config'
import { ApiError } from '@/api/client'
import ListErrors from '@/components/ListErrors.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{ mode: 'login' | 'register' }>()

const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()
const router = useRouter()

const isRegister = computed(() => props.mode === 'register')
const form = reactive({ username: '', email: '', password: '' })
const errors = ref<Record<string, string[]> | null>(null)
const submitting = ref(false)
const demo = isDemoMode()

function redirectTarget(): string {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/'
}

async function submit(): Promise<void> {
  if (submitting.value) return
  submitting.value = true
  errors.value = null
  try {
    if (isRegister.value) {
      const u = await auth.register({ username: form.username.trim(), email: form.email.trim(), password: form.password })
      toast.show(`Conta criada. Boas-vindas, ${u.username}!`)
    } else {
      const u = await auth.login({ email: form.email.trim(), password: form.password })
      toast.show(`Que bom ter você de volta, ${u.username}.`)
    }
    await router.replace(redirectTarget())
  } catch (e) {
    errors.value = e instanceof ApiError ? e.errors : { '': ['erro inesperado, tente de novo'] }
    if (!Object.keys(errors.value).length) errors.value = { '': [`não foi possível concluir (HTTP ${(e as ApiError).status})`] }
    await nextTick()
    document.querySelector<HTMLElement>('[data-testid="form-errors"]')?.focus()
  } finally {
    submitting.value = false
  }
}

function fillDemo(): void {
  form.email = 'demo@conduit.dev'
  form.password = 'demo1234'
}

const invalid = (field: string) => (errors.value && errors.value[field] ? 'true' : undefined)
</script>

<template>
  <div class="container page auth">
    <section class="card panel" :aria-labelledby="`${mode}-title`">
      <header class="head">
        <h1 :id="`${mode}-title`">{{ isRegister ? 'Crie sua conta' : 'Entre no Conduit' }}</h1>
        <p class="muted">
          <template v-if="isRegister">
            Já tem conta?
            <RouterLink :to="{ name: 'login', query: route.query }" data-testid="switch-auth">Entrar</RouterLink>
          </template>
          <template v-else>
            Novo por aqui?
            <RouterLink :to="{ name: 'register', query: route.query }" data-testid="switch-auth">Criar conta</RouterLink>
          </template>
        </p>
      </header>

      <form class="form" novalidate :data-testid="`${mode}-form`" @submit.prevent="submit">
        <div v-if="isRegister" class="field">
          <label for="auth-username">Nome de usuário</label>
          <input
            id="auth-username"
            v-model="form.username"
            class="input"
            name="username"
            autocomplete="username"
            required
            :aria-invalid="invalid('username')"
            data-testid="input-username"
          />
        </div>
        <div class="field">
          <label for="auth-email">E-mail</label>
          <input
            id="auth-email"
            v-model="form.email"
            class="input"
            type="email"
            name="email"
            inputmode="email"
            autocomplete="email"
            required
            :aria-invalid="invalid('email')"
            data-testid="input-email"
          />
        </div>
        <div class="field">
          <label for="auth-password">Senha</label>
          <input
            id="auth-password"
            v-model="form.password"
            class="input"
            type="password"
            name="password"
            :autocomplete="isRegister ? 'new-password' : 'current-password'"
            required
            :aria-invalid="invalid('password')"
            data-testid="input-password"
          />
        </div>

        <ListErrors :errors="errors" />

        <button type="submit" class="btn btn-primary btn-lg btn-block" :disabled="submitting" data-testid="auth-submit">
          <span v-if="submitting" class="spinner" aria-hidden="true" />
          {{ isRegister ? 'Criar conta' : 'Entrar' }}
        </button>
      </form>

      <p v-if="demo && !isRegister" class="demo-hint">
        Modo demo: use <code>demo@conduit.dev</code> / <code>demo1234</code>.
        <button type="button" class="link-btn" data-testid="fill-demo" @click="fillDemo">Preencher para mim</button>
      </p>
    </section>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  place-items: start center;
}

.panel {
  width: 100%;
  max-width: 440px;
  padding: var(--space-6);
  display: grid;
  gap: var(--space-6);
}

@media (min-width: 768px) {
  .panel {
    padding: var(--space-10);
    margin-top: var(--space-6);
    box-shadow: var(--shadow-md);
  }
}

.head {
  display: grid;
  gap: var(--space-2);
  text-align: center;
}

.head h1 {
  font-size: var(--fs-2xl);
  font-weight: 800;
}

.head a {
  font-weight: 600;
  display: inline-flex;
  min-height: var(--tap);
  align-items: center;
}

.demo-hint {
  font-size: var(--fs-sm);
  color: var(--text-muted);
  text-align: center;
}

.demo-hint code {
  font-family: var(--font-mono);
  background: var(--surface-2);
  padding: 0 4px;
  border-radius: 4px;
}

.link-btn {
  border: 0;
  background: none;
  color: var(--brand-text);
  font-weight: 600;
  cursor: pointer;
  min-height: var(--tap);
  padding: 0 var(--space-2);
}

.link-btn:hover {
  text-decoration: underline;
}
</style>
