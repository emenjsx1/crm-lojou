import { defineStore } from 'pinia'

export interface Contact {
  id: number
  name: string
  phone: string
  status: 'verified' | 'unverified'
  has_purchased: boolean
}

export const useContactStore = defineStore('contacts', {
  state: () => ({
    contacts: [] as Contact[],
    loading: false
  }),
  actions: {
    async fetchContacts() {
      this.loading = true
      // Simulando delay de API
      setTimeout(() => {
        this.contacts = [
          { id: 1, name: 'João Silva', phone: '+5511999999999', status: 'verified', has_purchased: true },
          { id: 2, name: 'Maria Souza', phone: '+5511888888888', status: 'unverified', has_purchased: false },
          { id: 3, name: 'Carlos Santos', phone: '+5511777777777', status: 'verified', has_purchased: false }
        ]
        this.loading = false
      }, 500)
    }
  }
})
