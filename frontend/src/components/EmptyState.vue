<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import type { IconName } from './icons'

withDefaults(defineProps<{ title: string; message?: string; icon?: IconName }>(), {
  message: '',
  icon: 'inbox',
})
</script>

<template>
  <div class="state card" data-testid="empty-state">
    <span class="state-icon"><AppIcon :name="icon" :size="26" /></span>
    <h2>{{ title }}</h2>
    <p v-if="message">{{ message }}</p>
    <slot />
  </div>
</template>
