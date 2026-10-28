const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d)
}

/** Minutos estimados de leitura (220 palavras por minuto). */
export function readingTime(text: string): number {
  const words = (text ?? '').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

const FIELD_LABELS: Record<string, string> = {
  email: 'E-mail',
  password: 'Senha',
  username: 'Nome de usuário',
  title: 'Título',
  description: 'Resumo',
  body: 'Conteúdo',
  bio: 'Bio',
  image: 'Imagem',
  tagList: 'Tags',
  'email or password': 'E-mail ou senha',
}

/** Achata o Record de erros da API em frases legiveis em portugues. */
export function errorMessages(errors: Record<string, string[]>): string[] {
  const out: string[] = []
  for (const [field, messages] of Object.entries(errors)) {
    const label = FIELD_LABELS[field] ?? field
    for (const msg of messages) out.push(label ? `${label}: ${msg}` : msg)
  }
  return out
}

export function initials(name: string): string {
  const parts = name.replace(/[_.-]+/g, ' ').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}
