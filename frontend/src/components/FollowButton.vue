<script setup lang="ts">
// Seguir/deixar de seguir com atualizacao otimista.
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { followUser, unfollowUser } from '@/api/profiles'
import type { Profile } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import AppIcon from './AppIcon.vue'

const props = withDefaults(defineProps<{ profile: Profile; primary?: boolean }>(), { primary: false })
const emit = defineEmits<{ update: [profile: Profile] }>()

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()
const busy = ref(false)

async function toggle(): Promise<void> {
  if (!auth.isLoggedIn) {
    await router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    return
  }
  if (busy.value) return
  busy.value = true
  const before = props.profile
  emit('update', { ...before, following: !before.following })
  try {
    const updated = before.following ? await unfollowUser(before.username) : await followUser(before.username)
    emit('update', updated)
  } catch {
    emit('update', before)
    toast.show('Não foi possível atualizar. Tente de novo.', 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="btn"
    :class="primary && !profile.following ? 'btn-primary' : 'btn-tonal'"
    :aria-pressed="profile.following"
    :aria-busy="busy"
    data-testid="follow-button"
    @click="toggle"
  >
    <AppIcon :name="profile.following ? 'check' : 'plus'" :size="18" />
    {{ profile.following ? 'Seguindo' : 'Seguir' }}
    <span class="sr-only">{{ profile.username }}</span>
  </button>
</template>
