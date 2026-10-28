<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
import AppIcon from './AppIcon.vue'

const theme = useThemeStore()
</script>

<template>
  <button
    type="button"
    class="btn btn-ghost icon-btn"
    :aria-label="theme.theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'"
    :aria-pressed="theme.theme === 'dark'"
    :title="theme.theme === 'dark' ? 'Tema claro' : 'Tema escuro'"
    data-testid="theme-toggle"
    @click="theme.toggle()"
  >
    <AppIcon :name="theme.theme === 'dark' ? 'sun' : 'moon'" />
  </button>
</template>
