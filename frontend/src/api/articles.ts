import { request, toQuery } from './client'
import type { Article, ArticleList, ArticlePayload, ArticleQuery } from './types'

type ArticleResponse = { article: Article }
const enc = encodeURIComponent

export function listArticles(query: ArticleQuery = {}): Promise<ArticleList> {
  return request<ArticleList>('GET', `/articles${toQuery({ ...query })}`)
}

export function feedArticles(query: Pick<ArticleQuery, 'limit' | 'offset'> = {}): Promise<ArticleList> {
  return request<ArticleList>('GET', `/articles/feed${toQuery({ ...query })}`)
}

export async function getArticle(slug: string): Promise<Article> {
  return (await request<ArticleResponse>('GET', `/articles/${enc(slug)}`)).article
}

export async function createArticle(payload: ArticlePayload): Promise<Article> {
  return (await request<ArticleResponse>('POST', '/articles', { article: payload })).article
}

export async function updateArticle(slug: string, payload: Partial<ArticlePayload>): Promise<Article> {
  return (await request<ArticleResponse>('PUT', `/articles/${enc(slug)}`, { article: payload })).article
}

export async function deleteArticle(slug: string): Promise<void> {
  await request<unknown>('DELETE', `/articles/${enc(slug)}`)
}

export async function favoriteArticle(slug: string): Promise<Article> {
  return (await request<ArticleResponse>('POST', `/articles/${enc(slug)}/favorite`)).article
}

export async function unfavoriteArticle(slug: string): Promise<Article> {
  return (await request<ArticleResponse>('DELETE', `/articles/${enc(slug)}/favorite`)).article
}
