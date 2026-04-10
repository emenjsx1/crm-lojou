import { defineStore } from 'pinia'

export const useAuthStore = defineStore('_legacy_auth', {
  state: () => ({
    isAuthenticated: false,
    user: null as { name: string; email: string; role: string } | null,
    token: ''
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin' || state.user?.role === 'super_admin'
  },

  actions: {
    login(email: string, password: string) {
      // Implementar autenticação real via API do Lojou
      this.isAuthenticated = true
      this.token = Math.random().toString(36).substring(7)
      this.user = {
        name: 'Admin',
        email: email,
        role: 'admin'
      }
    },

    logout() {
      this.isAuthenticated = false
      this.user = null
      this.token = ''
    },

    getToken(): string {
      return this.token
    }
  }
})