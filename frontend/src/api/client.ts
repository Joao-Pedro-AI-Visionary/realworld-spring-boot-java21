// Cliente HTTP do contrato RealWorld com transporte injetavel (fetch real, demo ou teste).

import { apiBaseUrl, isDemoMode } from './config'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface TransportRequest {
  method: HttpMethod
  path: string
  body?: unknown
  token: string | null
}

export interface TransportResponse {
  status: number
  body: unknown
}

export type Transport = (req: TransportRequest) => Promise<TransportResponse>

export class ApiError extends Error {
  readonly status: number
  readonly errors: Record<string, string[]>

  constructor(status: number, errors: Record<string, string[]> = {}) {
    super(ApiError.summarize(status, errors))
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  private static summarize(status: number, errors: Record<string, string[]>): string {
    const first = Object.entries(errors)[0]
    if (first && first[1].length) return `${first[0]} ${first[1][0]}`.trim()
    return `Erro HTTP ${status}`
  }
}

/** Normaliza os formatos de erro do backend ({errors:{...}} ou {message}) para Record<string,string[]>. */
export function normalizeErrors(body: unknown): Record<string, string[]> {
  if (!body || typeof body !== 'object') return {}
  const obj = body as Record<string, unknown>
  if (obj.errors && typeof obj.errors === 'object') {
    const out: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(obj.errors as Record<string, unknown>)) {
      out[key] = Array.isArray(value) ? value.map(String) : [String(value)]
    }
    return out
  }
  if (typeof obj.message === 'string') return { '': [obj.message] }
  return {}
}

export function createFetchTransport(baseUrl: string, fetchImpl: typeof fetch = fetch): Transport {
  return async ({ method, path, body, token }) => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers.Authorization = `Token ${token}`
    let res: Response
    try {
      res = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      return { status: 0, body: { errors: { '': ['não foi possível falar com o servidor'] } } }
    }
    const text = await res.text()
    let parsed: unknown = null
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = null
      }
    }
    return { status: res.status, body: parsed }
  }
}

let transport: Transport | null = null
let tokenProvider: () => string | null = () => null

/** Injeta um transporte (testes ou modo demo). Passe null para voltar ao padrao. */
export function setTransport(t: Transport | null): void {
  transport = t
}

export function setTokenProvider(fn: () => string | null): void {
  tokenProvider = fn
}

async function defaultTransport(): Promise<Transport> {
  if (isDemoMode()) {
    const { createDemoTransport } = await import('./demo')
    return createDemoTransport()
  }
  return createFetchTransport(apiBaseUrl())
}

export async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  if (!transport) transport = await defaultTransport()
  const res = await transport({ method, path, body, token: tokenProvider() })
  if (res.status === 0 || res.status >= 400) {
    throw new ApiError(res.status, normalizeErrors(res.body))
  }
  return res.body as T
}

/** Monta query string ignorando valores vazios. */
export function toQuery(params: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}
