import axios from 'axios'
import { useAuthStore } from '~/stores/auth'

// Token padrão da API Lojou (session_1)
const DEFAULT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2FwcC5ibG9kYXF1ZS5jb20vYXBpL3ZlbmRvci9hdXRoL2xvZ2luIiwiaWF0IjoxNzczNDg1NDYwLCJleHAiOjE3ODY4MjEwNjAsIm5iZiI6MTc3MzQ4NTQ2MCwianRpIjoiTTdWY3lDTmZyUm1oZXBxTCIsInN1YiI6IjM5IiwicHJ2IjoiMjNiZDVjODk0OWY2MDBhZGIzOWU3MDFjNDAwODcyZGI3YTU5NzZmNyJ9.4bcQEBQ_NSBf6gDeq641uO_RMMIpUTkDgAbRjorXE6w'

export const useApi = () => {
  const auth = useAuthStore()

  const api = axios.create({
    baseURL: '/proxy-lojou'
  })

  // Helper function to get cookie value by name
  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  }

  api.interceptors.request.use((req) => {
    let token = null;

    // 1. Cookie session_1 (produção lojou.app)
    if (typeof window !== 'undefined') {
       token = getCookie('session_1');
    }

    // 2. Auth store (Pinia global)
    if (!token && auth.token) {
       token = auth.token;
    }

    // 3. localStorage
    if (!token && typeof window !== 'undefined') {
       token = localStorage.getItem('lojou_session_1');
    }

    // 4. Token padrão hardcoded (fallback final)
    if (!token) {
       token = DEFAULT_TOKEN;
    }

    if (token) {
      req.headers.Authorization = `Bearer ${token}`
    }
    
    return req
  })

  return {
    api
  }
}