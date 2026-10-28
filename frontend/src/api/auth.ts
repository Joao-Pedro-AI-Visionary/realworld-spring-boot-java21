import { request } from './client'
import type { LoginPayload, RegisterPayload, UpdateUserPayload, User } from './types'

type UserResponse = { user: User }

export async function login(payload: LoginPayload): Promise<User> {
  return (await request<UserResponse>('POST', '/users/login', { user: payload })).user
}

export async function register(payload: RegisterPayload): Promise<User> {
  return (await request<UserResponse>('POST', '/users', { user: payload })).user
}

export async function currentUser(): Promise<User> {
  return (await request<UserResponse>('GET', '/user')).user
}

export async function updateUser(payload: UpdateUserPayload): Promise<User> {
  return (await request<UserResponse>('PUT', '/user', { user: payload })).user
}
