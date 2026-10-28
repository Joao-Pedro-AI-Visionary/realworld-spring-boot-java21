<script setup lang="ts">
// Barra inferior no mobile: ate 4 destinos na zona do polegar (Fitts + Hick). Some no desktop.
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AppIcon from './AppIcon.vue'
import type { IconName } from './icons'

const auth = useAuthStore()

interface Item {
  to: string
  label: string
  icon: IconName
  testid: string
  exact?: boolean
}

const items = computed<Item[]>(() =>
  auth.isLoggedIn && auth.user
    ? [
        { to: '/', label: 'Início', icon: 'home', testid: 'bottom-home', exact: true },
        { to: '/editor', label: 'Escrever', icon: 'edit', testid: 'bottom-editor' },
        { to: `/profile/${encodeURIComponent(auth.user.username)}`, label: 'Perfil', icon: 'user', testid: 'bottom-profile' },
        { to: '/settings', label: 'Ajustes', icon: 'settings', testid: 'bottom-settings' },
      ]
    : [
        { to: '/', label: 'Início', icon: 'home', testid: 'bottom-home', exact: true },
        { to: '/login', label: 'Entrar', icon: 'login', testid: 'bottom-login' },
        { to: '/register', label: 'Criar conta', icon: 'user', testid: 'bottom-register' },
      ],
)
</script>

<template>
  <nav class="bottom-nav" aria-label="Navegação inferior" data-testid="bottom-nav">
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="item"
      :active-class="item.exact ? '' : 'is-active'"
      :exact-active-class="'is-active'"
      :data-testid="item.testid"
    >
      <AppIcon :name="item.icon" :size="22" />
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 40;
  display: flex;
  justify-content: space-around;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2) calc(var(--space-1) + env(safe-area-inset-bottom));
  background: var(--overlay);
  backdrop-filter: saturate(160%) blur(14px);
  -webkit-backdrop-filter: saturate(160%) blur(14px);
  border-top: 1px solid var(--border);
}

.item {
  flex: 1 1 0;
  max-width: 120px;
  min-height: 56px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 2px;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  transition:
    color var(--dur-fast) ease,
    background-color var(--dur-fast) ease;
}

.item:hover {
  text-decoration: none;
  color: var(--text);
}

.item.is-active {
  color: var(--brand-text);
  background: var(--brand-soft);
}

@media (min-width: 768px) {
  .bottom-nav {
    display: none;
  }
}
</style>
