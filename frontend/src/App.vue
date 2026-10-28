<script setup lang="ts">
import { isDemoMode } from '@/api/config'
import AppHeader from '@/components/AppHeader.vue'
import BottomNav from '@/components/BottomNav.vue'
import DemoBanner from '@/components/DemoBanner.vue'
import ToastHost from '@/components/ToastHost.vue'

import type { RouteLocationNormalizedLoaded } from 'vue-router'

const demo = isDemoMode()

// Abas de perfil (artigos/favoritos) reaproveitam a mesma instancia da tela, sem piscar.
function viewKey(route: RouteLocationNormalizedLoaded): string {
  if (route.name === 'profile' || route.name === 'profile-favorites') return `profile:${String(route.params.username)}`
  return route.path
}
</script>

<template>
  <a href="#main" class="skip-link">Pular para o conteúdo</a>
  <AppHeader />
  <DemoBanner v-if="demo" />
  <main id="main" class="app-main" tabindex="-1">
    <RouterView v-slot="{ Component, route }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" :key="viewKey(route)" />
      </Transition>
    </RouterView>
  </main>
  <footer class="app-footer">
    <div class="container foot">
      <span><strong>Conduit</strong> · app RealWorld em Vue 3 sobre Spring Boot</span>
      <a href="https://github.com/gothinkster/realworld" rel="noopener" target="_blank">Especificação RealWorld</a>
    </div>
  </footer>
  <BottomNav />
  <ToastHost />
</template>

<style scoped>
.app-main {
  min-height: calc(100dvh - var(--header-h) - 120px);
  outline: none;
}

.app-footer {
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: var(--fs-xs);
  /* espaco para a barra inferior fixa no mobile */
  padding-bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + var(--space-4));
}

.foot {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  justify-content: space-between;
  align-items: center;
  padding-block: var(--space-5);
}

.foot a {
  min-height: var(--tap);
  display: inline-flex;
  align-items: center;
}

@media (min-width: 768px) {
  .app-footer {
    padding-bottom: 0;
  }
}
</style>
