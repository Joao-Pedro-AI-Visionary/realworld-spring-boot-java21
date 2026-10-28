// Decide o modo de operacao a partir das variaveis de ambiente do Vite.

export function apiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL ?? '').trim()
  return raw.replace(/\/+$/, '')
}

export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true' || apiBaseUrl() === ''
}
