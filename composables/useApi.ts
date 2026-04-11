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
      // Em desenvolvimento local, usamos o token em memória ou um fallback para testes
      token = auth.token || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2FwcC5ibG9kYXF1ZS5jb20vYXBpL3ZlbmRvci9hdXRoL2xvZ2luIiwiaWF0IjoxNzczNDg1NDYwLCJleHAiOjE3ODY4MjEwNjAsIm5iZiI6MTc3MzQ4NTQ2MCwianRpIjoiTTdWY3lDTmZyUm1oZXBxTCIsInN1YiI6IjM5IiwicHJ2IjoiMjNiZDVjODk0OWY2MDBhZGIzOWU3MDFjNDAwODcyZGI3YTU5NzZmNyJ9.4bcQEBQ_NSBf6gDeq641uO_RMMIpUTkDgAbRjorXE6w'
    }

    if (token) {
      // Garante que o Bearer prefix seja enviado para a API Laravel/Evolution
      req.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`
    }

    return req
  })

  return { api }
}
