<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
import AppIcon from './AppIcon.vue'

const toast = useToastStore()
</script>

<template>
  <div class="toast-host" role="status" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="fade">
      <div v-for="t in toast.toasts" :key="t.id" class="toast" :class="`is-${t.tone}`" data-testid="toast">
        <AppIcon :name="t.tone === 'error' ? 'alert' : t.tone === 'info' ? 'info' : 'check'" :size="18" />
        <span>{{ t.message }}</span>
        <button type="button" class="close" aria-label="Fechar aviso" @click="toast.dismiss(t.id)">
          <AppIcon name="x" :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  z-index: 60;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--bottom-nav-h) + var(--space-4) + env(safe-area-inset-bottom));
  width: min(92vw, 420px);
  display: grid;
  gap: var(--space-2);
  pointer-events: none;
}

@media (min-width: 768px) {
  .toast-host {
    bottom: var(--space-6);
  }
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--text);
  color: var(--bg);
  box-shadow: var(--shadow-lg);
  font-size: var(--fs-sm);
  font-weight: 600;
}

.toast span {
  flex: 1;
}

.is-error svg:first-child {
  color: var(--danger);
}

.close {
  width: var(--tap);
  height: var(--tap);
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.close:focus-visible {
  outline-color: var(--bg);
}
</style>
