import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as any | null,
    token: null as string | null
  }),
  actions: {
    setToken(token: string) {
      this.token = token && token.trim() ? token.trim() : null
    },
    logout() {
      this.user = null
      this.token = null
    }
  }
})
