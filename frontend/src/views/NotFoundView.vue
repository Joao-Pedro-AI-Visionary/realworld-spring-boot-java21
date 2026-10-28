<!--
  Leis de UX nesta tela:
  - Jakob: 404 com mensagem clara e saida obvia para o inicio, como o usuario espera.
  - Von Restorff: um unico botao primario ("Voltar para o início").
  - Hick: uma saida principal e uma secundaria, nada mais.
  - Pico-Fim: tom leve para nao terminar a visita com frustracao.
-->
<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
</script>

<template>
  <div class="container page nf" data-testid="not-found">
    <p class="code" aria-hidden="true">404</p>
    <h1>Esta página saiu para um café</h1>
    <p class="muted">O endereço pode estar errado ou o conteúdo foi removido.</p>
    <div class="row">
      <RouterLink to="/" class="btn btn-primary btn-lg"><AppIcon name="home" :size="18" /> Voltar para o início</RouterLink>
      <button type="button" class="btn btn-ghost btn-lg" @click="$router.back()">Página anterior</button>
    </div>
  </div>
</template>

<style scoped>
.nf {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: var(--space-4);
  padding-block: var(--space-16);
}

.code {
  font-size: clamp(4rem, 3rem + 6vw, 7rem);
  font-weight: 800;
  line-height: 1;
  background: var(--hero-grad);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nf h1 {
  font-size: var(--fs-2xl);
  font-weight: 800;
}

.row {
  justify-content: center;
}
</style>
