import axios from 'axios'

export const useApi = () => {
  const config = useRuntimeConfig()
  
  const api = axios.create({
    baseURL: config.public.apiBase || '/api'
  })

  api.interceptors.request.use((req) => {
    // Add auth token to requests if available
    return req
  })

  return {
    api
  }
}