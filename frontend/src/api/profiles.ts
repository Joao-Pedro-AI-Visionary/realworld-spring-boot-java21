import { request } from './client'
import type { Profile } from './types'

type ProfileResponse = { profile: Profile }
const enc = encodeURIComponent

export async function getProfile(username: string): Promise<Profile> {
  return (await request<ProfileResponse>('GET', `/profiles/${enc(username)}`)).profile
}

export async function followUser(username: string): Promise<Profile> {
  return (await request<ProfileResponse>('POST', `/profiles/${enc(username)}/follow`)).profile
}

export async function unfollowUser(username: string): Promise<Profile> {
  return (await request<ProfileResponse>('DELETE', `/profiles/${enc(username)}/follow`)).profile
}
