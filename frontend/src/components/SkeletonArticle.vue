<script setup lang="ts">
withDefaults(defineProps<{ count?: number }>(), { count: 3 })
</script>

<template>
  <div class="stack" aria-hidden="true" data-testid="skeleton">
    <div v-for="n in count" :key="n" class="card sk">
      <div class="row">
        <span class="skeleton" style="width: 36px; height: 36px; border-radius: 50%" />
        <span class="stack" style="gap: 6px">
          <span class="skeleton" style="width: 110px; height: 12px" />
          <span class="skeleton" style="width: 70px; height: 10px" />
        </span>
      </div>
      <span class="skeleton" style="width: 78%; height: 22px" />
      <span class="skeleton" style="width: 95%; height: 14px" />
      <span class="skeleton" style="width: 60%; height: 14px" />
    </div>
  </div>
</template>

<style scoped>
.sk {
  padding: var(--space-5);
  display: grid;
  gap: var(--space-3);
}
</style>
