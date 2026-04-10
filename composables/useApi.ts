import axios from 'axios'
import { useAuthStore } from '~/stores/auth'

export const useApi = () => {
  const auth = useAuthStore()

  const api = axios.create({
    baseURL: '/proxy-lojou'
  })

  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null
    return null
  }

  const isLojouDomain = (): boolean => {
    if (typeof window === 'undefined') return false
    return window.location.hostname.includes('lojou.app')
  }

  api.interceptors.request.use((req) => {
    let token: string | null = null

    if (isLojouDomain()) {
      // Em produção (lojou.app), usamos estritamente o cookie session_1
      token = getCookie('session_1')
    } else {
      // Em desenvolvimento local, usamos o token em memória
      token = auth.token
    }

    if (token) {
      // O token session_1 é injetado diretamente no header Authorization
      req.headers.Authorization = token
    }

    return req
  })

  return { api }
}
