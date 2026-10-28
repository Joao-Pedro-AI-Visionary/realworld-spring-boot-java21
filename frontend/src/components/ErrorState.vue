<script setup lang="ts">
import AppIcon from './AppIcon.vue'

withDefaults(defineProps<{ title?: string; message?: string; retryable?: boolean }>(), {
  title: 'Algo deu errado',
  message: 'Não conseguimos carregar este conteúdo agora.',
  retryable: true,
})
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="state state-error card" role="alert" data-testid="error-state">
    <span class="state-icon"><AppIcon name="alert" :size="26" /></span>
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
    <button v-if="retryable" type="button" class="btn btn-tonal" data-testid="retry-button" @click="emit('retry')">
      <AppIcon name="refresh" :size="18" />
      Tentar de novo
    </button>
  </div>
</template>
