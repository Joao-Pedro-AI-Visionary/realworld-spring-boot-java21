import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToastStore } from './toast'

beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.useRealTimers()
})

describe('toast store', () => {
  it('mostra com tom padrao success e some sozinho apos o tempo', () => {
    const toast = useToastStore()
    toast.show('Salvo')
    expect(toast.toasts).toHaveLength(1)
    expect(toast.toasts[0]).toMatchObject({ message: 'Salvo', tone: 'success' })
    vi.advanceTimersByTime(3499)
    expect(toast.toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toast.toasts).toHaveLength(0)
  })

  it('mantem no maximo 3 avisos, descartando os mais antigos', () => {
    const toast = useToastStore()
    for (const m of ['a', 'b', 'c', 'd']) toast.show(m, 'info')
    expect(toast.toasts.map((t) => t.message)).toEqual(['b', 'c', 'd'])
  })

  it('dismiss remove so o aviso pedido', () => {
    const toast = useToastStore()
    toast.show('um', 'error')
    toast.show('dois')
    toast.dismiss(toast.toasts[0].id)
    expect(toast.toasts.map((t) => t.message)).toEqual(['dois'])
  })
})
