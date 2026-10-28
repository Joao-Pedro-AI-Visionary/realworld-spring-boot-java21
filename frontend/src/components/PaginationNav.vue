<script setup lang="ts">
// Paginacao compacta: no maximo 5 numeros visiveis (Hick) + anterior/proxima com alvo de 48px (Fitts).
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ page: number; totalPages: number }>()
const emit = defineEmits<{ change: [page: number] }>()

const pages = computed(() => {
  const total = props.totalPages
  const start = Math.max(1, Math.min(props.page - 2, total - 4))
  const end = Math.min(total, start + 4)
  const out: number[] = []
  for (let p = start; p <= end; p++) out.push(p)
  return out
})
</script>

<template>
  <nav v-if="totalPages > 1" class="pager" aria-label="Paginação" data-testid="pagination">
    <button
      type="button"
      class="btn btn-ghost icon-btn"
      :disabled="page <= 1"
      aria-label="Página anterior"
      data-testid="page-prev"
      @click="emit('change', page - 1)"
    >
      <AppIcon name="chevron-left" />
    </button>
    <ul>
      <li v-for="p in pages" :key="p">
        <button
          type="button"
          class="btn icon-btn page"
          :class="p === page ? 'is-current' : 'btn-ghost'"
          :aria-current="p === page ? 'page' : undefined"
          :aria-label="`Página ${p}`"
          :data-testid="`page-${p}`"
          @click="emit('change', p)"
        >
          {{ p }}
        </button>
      </li>
    </ul>
    <button
      type="button"
      class="btn btn-ghost icon-btn"
      :disabled="page >= totalPages"
      aria-label="Próxima página"
      data-testid="page-next"
      @click="emit('change', page + 1)"
    >
      <AppIcon name="chevron-right" />
    </button>
  </nav>
</template>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  padding-top: var(--space-4);
}

.pager ul {
  display: flex;
  gap: var(--space-1);
  list-style: none;
  margin: 0;
  padding: 0;
}

.page {
  font-variant-numeric: tabular-nums;
}

.is-current {
  --btn-bg: var(--brand-soft);
  --btn-fg: var(--brand-text);
  --btn-border: var(--brand-text);
}
</style>
