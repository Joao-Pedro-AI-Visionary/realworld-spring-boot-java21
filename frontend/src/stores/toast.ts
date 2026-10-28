import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
}

// Feedback curto ao fim de cada tarefa (regra do Pico-Fim).
export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  let seq = 0

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function show(message: string, tone: Toast['tone'] = 'success', ms = 3500): void {
    const id = ++seq
    toasts.value = [...toasts.value.slice(-2), { id, message, tone }]
    setTimeout(() => dismiss(id), ms)
  }

  return { toasts, show, dismiss }
})
