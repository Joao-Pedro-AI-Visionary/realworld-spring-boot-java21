<script setup lang="ts">
// Cabecalho no padrao conhecido de blogs (Jakob): logo a esquerda volta para a home, navegacao a direita.
import { useAuthStore } from '@/stores/auth'
import AppIcon from './AppIcon.vue'
import ThemeToggle from './ThemeToggle.vue'
import UserAvatar from './UserAvatar.vue'

const auth = useAuthStore()
</script>

<template>
  <header class="app-header" data-testid="app-header">
    <div class="container bar">
      <RouterLink to="/" class="brand" aria-label="Conduit, ir para o início" data-testid="brand-link">
        <span class="logo" aria-hidden="true">C</span>
        <span class="word">Conduit</span>
      </RouterLink>

      <nav class="desk-nav" aria-label="Navegação principal">
        <RouterLink to="/" class="nav-link" exact-active-class="is-active">Início</RouterLink>
        <template v-if="auth.isLoggedIn && auth.user">
          <RouterLink to="/editor" class="nav-link" active-class="is-active" data-testid="nav-editor">
            <AppIcon name="edit" :size="18" /> Escrever
          </RouterLink>
          <RouterLink to="/settings" class="nav-link" active-class="is-active" data-testid="nav-settings">
            <AppIcon name="settings" :size="18" /> Configurações
          </RouterLink>
          <RouterLink
            :to="{ name: 'profile', params: { username: auth.user.username } }"
            class="nav-link me"
            active-class="is-active"
            data-testid="nav-profile"
          >
            <UserAvatar :username="auth.user.username" :image="auth.user.image" :size="28" />
            {{ auth.user.username }}
          </RouterLink>
        </template>
        <template v-else>
          <RouterLink to="/login" class="nav-link" active-class="is-active" data-testid="nav-login">Entrar</RouterLink>
          <RouterLink to="/register" class="nav-link" active-class="is-active" data-testid="nav-register">
            Criar conta
          </RouterLink>
        </template>
      </nav>

      <ThemeToggle />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--overlay);
  backdrop-filter: saturate(160%) blur(14px);
  -webkit-backdrop-filter: saturate(160%) blur(14px);
  border-bottom: 1px solid var(--border);
  padding-top: env(safe-area-inset-top);
}

.bar {
  height: var(--header-h);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--tap);
  color: var(--text);
  font-weight: 800;
  font-size: var(--fs-lg);
  letter-spacing: -0.02em;
  margin-right: auto;
}

.brand:hover {
  text-decoration: none;
}

.logo {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: var(--hero-grad);
  color: #fff;
  font-weight: 800;
  box-shadow: var(--shadow-lg);
}

.desk-nav {
  display: none;
  align-items: center;
  gap: var(--space-1);
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--tap);
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  color: var(--text-muted);
  font-weight: 600;
  font-size: var(--fs-sm);
  transition:
    color var(--dur-fast) ease,
    background-color var(--dur-fast) ease;
}

.nav-link:hover {
  color: var(--text);
  background: var(--surface-2);
  text-decoration: none;
}

.nav-link.is-active {
  color: var(--text);
  background: var(--surface-2);
}

@media (min-width: 768px) {
  .desk-nav {
    display: flex;
  }
}
</style>
