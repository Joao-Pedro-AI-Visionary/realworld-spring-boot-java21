// Tipos do contrato RealWorld consumido pelo app (espelham os DTOs do backend).

export interface User {
  email: string
  token: string
  username: string
  bio: string | null
  image: string | null
}

export interface Profile {
  username: string
  bio: string | null
  image: string | null
  following: boolean
}

export interface Article {
  slug: string
  title: string
  description: string
  body: string
  tagList: string[]
  createdAt: string
  updatedAt: string
  favorited: boolean
  favoritesCount: number
  author: Profile
}

export interface Comment {
  id: string
  body: string
  createdAt: string
  updatedAt: string
  author: Profile
}

export interface ArticleList {
  articles: Article[]
  articlesCount: number
}

export interface ArticleQuery {
  tag?: string
  author?: string
  favorited?: string
  limit?: number
  offset?: number
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload extends LoginPayload {
  username: string
}

export interface UpdateUserPayload {
  email?: string
  username?: string
  password?: string
  bio?: string | null
  image?: string | null
}

export interface ArticlePayload {
  title: string
  description: string
  body: string
  tagList: string[]
}
