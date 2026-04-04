import { useAuthStore } from '~/stores/auth'

export const useAuth = () => {
  const store = useAuthStore()
  
  const login = async (credentials: any) => {
    // Implement login
    store.setToken('mock-token')
  }

  const logout = () => {
    store.logout()
  }

  return {
    login,
    logout,
    user: computed(() => store.user),
    isAuthenticated: computed(() => !!store.token)
  }
}