<script setup lang="ts">
import { computed } from 'vue'
import { errorMessages } from '@/lib/format'

const props = defineProps<{ errors: Record<string, string[]> | null }>()
const messages = computed(() => (props.errors ? errorMessages(props.errors) : []))
</script>

<template>
  <div v-if="messages.length" class="error-summary" role="alert" tabindex="-1" data-testid="form-errors">
    <strong>Revise os campos abaixo:</strong>
    <ul>
      <li v-for="msg in messages" :key="msg">{{ msg }}</li>
    </ul>
  </div>
</template>
