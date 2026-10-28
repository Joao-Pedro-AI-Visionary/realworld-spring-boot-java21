<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { initials } from '@/lib/format'

const props = withDefaults(defineProps<{ username: string; image?: string | null; size?: number }>(), {
  image: null,
  size: 40,
})

const broken = ref(false)
watch(
  () => props.image,
  () => (broken.value = false),
)
const showImage = computed(() => !!props.image && !broken.value)
</script>

<template>
  <span
    class="avatar"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.38)}px` }"
    aria-hidden="true"
  >
    <img v-if="showImage" :src="image!" alt="" loading="lazy" @error="broken = true" />
    <template v-else>{{ initials(username) }}</template>
  </span>
</template>
