import axios from 'axios'

export const useApi = () => {
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

  api.interceptors.request.use((req) => {
    // Apenas o cookie session_1 do domínio lojou.app é aceito
    // Nenhum token hardcoded ou fallback permitido por segurança
    const token = getCookie('session_1')

    if (token) {
      req.headers.Authorization = `Bearer ${token}`
    }

    return req
  })

  return { api }
}
