<script setup lang="ts">
// Aviso discreto no fluxo da pagina (nao sobrepoe conteudo), dispensavel e lembrado no navegador.
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'

const KEY = 'conduit.demo.bannerDismissed'

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

const visible = ref(!wasDismissed())

function dismiss(): void {
  visible.value = false
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* ignora */
  }
}
</script>

<template>
  <aside v-if="visible" class="demo-banner" aria-label="Aviso de modo demo" data-testid="demo-banner">
    <div class="container inner">
      <AppIcon name="info" :size="16" />
      <p>
        <strong>Modo demo:</strong> dados ficam só no seu navegador. Entre com
        <code>demo@conduit.dev</code> / <code>demo1234</code>.
      </p>
      <button
        type="button"
        class="close"
        aria-label="Dispensar aviso de modo demo"
        data-testid="demo-banner-dismiss"
        @click="dismiss"
      >
        <AppIcon name="x" :size="16" />
      </button>
    </div>
  </aside>
</template>

<style scoped>
.demo-banner {
  background: var(--warning-soft);
  border-bottom: 1px solid var(--border);
  color: var(--text);
  font-size: var(--fs-xs);
}

.inner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--tap);
}

.inner p {
  flex: 1;
  padding-block: var(--space-2);
  line-height: 1.45;
}

code {
  font-family: var(--font-mono);
  font-size: 0.95em;
  background: var(--surface-2);
  border-radius: 4px;
  padding: 0 4px;
}

.close {
  flex: 0 0 auto;
  width: var(--tap);
  height: var(--tap);
  margin-right: calc(var(--space-2) * -1);
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.close:hover {
  background: var(--surface-2);
  color: var(--text);
}
</style>
