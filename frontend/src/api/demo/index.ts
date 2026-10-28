// Transporte do modo demo: roda o handler puro sobre um banco persistido em localStorage.

import type { Transport } from '../client'
import { createDemoHandler } from './handler'
import { createSeed, DEMO_DB_VERSION, type DemoDb } from './seed'

export const DEMO_DB_KEY = 'conduit.demo.db'

export interface DemoStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function defaultStorage(): DemoStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function loadDemoDb(storage: DemoStorage | null = defaultStorage()): DemoDb {
  const raw = storage?.getItem(DEMO_DB_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoDb
      if (parsed && parsed.version === DEMO_DB_VERSION && Array.isArray(parsed.users)) return parsed
    } catch {
      /* banco corrompido: recomeca da semente */
    }
  }
  return createSeed()
}

export function saveDemoDb(db: DemoDb, storage: DemoStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(DEMO_DB_KEY, JSON.stringify(db))
  } catch {
    /* cota cheia ou modo privado: segue so em memoria */
  }
}

export function resetDemoDb(storage: DemoStorage | null = defaultStorage()): void {
  storage?.removeItem(DEMO_DB_KEY)
}

export interface DemoTransportOptions {
  storage?: DemoStorage | null
  /** Latencia simulada em ms (abaixo de 400ms, limiar de Doherty). */
  latencyMs?: number
}

export function createDemoTransport(options: DemoTransportOptions = {}): Transport {
  const storage = options.storage === undefined ? defaultStorage() : options.storage
  const latency = options.latencyMs ?? 220
  const db = loadDemoDb(storage)
  const handler = createDemoHandler(db)
  return async ({ method, path, body, token }) => {
    if (latency > 0) await new Promise((r) => setTimeout(r, latency))
    // Clona a entrada e a saida para imitar a fronteira de rede (sem referencias compartilhadas).
    const input = body === undefined ? undefined : JSON.parse(JSON.stringify(body))
    const res = handler(method, path, input, token)
    if (method !== 'GET') saveDemoDb(db, storage)
    return { status: res.status, body: res.body === null ? null : JSON.parse(JSON.stringify(res.body)) }
  }
}

export { createDemoHandler } from './handler'
export { createSeed } from './seed'
