import { request } from './client'

export async function listTags(): Promise<string[]> {
  return (await request<{ tags: string[] }>('GET', '/tags')).tags
}
