import { request } from './client'
import type { Comment } from './types'

const enc = encodeURIComponent

export async function listComments(slug: string): Promise<Comment[]> {
  return (await request<{ comments: Comment[] }>('GET', `/articles/${enc(slug)}/comments`)).comments
}

export async function addComment(slug: string, body: string): Promise<Comment> {
  const res = await request<{ comment: Comment }>('POST', `/articles/${enc(slug)}/comments`, {
    comment: { body },
  })
  return res.comment
}

export async function deleteComment(slug: string, id: string): Promise<void> {
  await request<unknown>('DELETE', `/articles/${enc(slug)}/comments/${enc(id)}`)
}
