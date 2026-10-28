import DOMPurify from 'dompurify'
import { marked } from 'marked'

/** Converte markdown em HTML sanitizado (o corpo do artigo vem de usuarios). */
export function renderMarkdown(source: string): string {
  const html = marked.parse(source ?? '', { async: false, gfm: true, breaks: false })
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}
