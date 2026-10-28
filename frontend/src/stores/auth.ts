import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authApi from '@/api/auth'
import { ApiError, setTokenProvider } from '@/api/client'
import type { LoginPayload, RegisterPayload, UpdateUserPayload, User } from '@/api/types'

export const TOKEN_KEY = 'conduit.token'

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* sem storage: sessao fica so em memoria */
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(readToken())
  const user = ref<User | null>(null)
  const ready = ref(false)
  let initPromise: Promise<void> | null = null

  setTokenProvider(() => token.value)

  const isLoggedIn = computed(() => !!token.value && !!user.value)

  function setSession(u: User): void {
    user.value = u
    token.value = u.token
    writeToken(u.token)
  }

  function clearSession(): void {
    user.value = null
    token.value = null
    writeToken(null)
  }

  async function fetchCurrent(): Promise<void> {
    if (!token.value) return
    try {
      const u = await authApi.currentUser()
      // O backend devolve o mesmo token; mantemos o atual se vier vazio.
      setSession({ ...u, token: u.token || token.value })
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403 || e.status === 404)) clearSession()
      else throw e
    }
  }

  /** Resolve a sessao salva uma unica vez (usado pela guarda de rota). */
  function init(): Promise<void> {
    if (!initPromise) {
      initPromise = fetchCurrent()
        .catch(() => {
          /* falha de rede: segue deslogado nesta carga, token fica salvo */
        })
        .finally(() => {
          ready.value = true
        })
    }
    return initPromise
  }

  async function login(payload: LoginPayload): Promise<User> {
    const u = await authApi.login(payload)
    setSession(u)
    return u
  }

  async function register(payload: RegisterPayload): Promise<User> {
    const u = await authApi.register(payload)
    setSession(u)
    return u
  }

  async function update(payload: UpdateUserPayload): Promise<User> {
    const u = await authApi.updateUser(payload)
    setSession({ ...u, token: u.token || token.value || '' })
    return user.value!
  }

  function logout(): void {
    clearSession()
  }

  return { token, user, ready, isLoggedIn, init, fetchCurrent, login, register, update, logout }
})
