import { defineStore } from 'pinia'

export interface Contact {
  id: string | number
  name: string
  phone: string
  email?: string
  status: 'active' | 'inactive' | 'pending'
  has_sold: boolean
  is_verified: boolean
  last_sale_at?: string
  created_at: string
}

export const useContactsStore = defineStore('_legacy_contacts', {
  state: () => ({
    contacts: [] as Contact[],
    filteredContacts: [] as Contact[],
    selectedContacts: [] as Contact[],
    filters: {
      has_sold: null as boolean | null,
      is_verified: null as boolean | null
    },
    loading: false,
    total: 0
  }),

  getters: {
    getContactById: (state) => {
      return (id: string | number) =>
        state.contacts.find(c => c.id === id)
    },

    getSelectedCount: (state) => state.selectedContacts.length,

    filterStats: (state) => ({
      total: state.total,
      verified: state.contacts.filter(c => c.is_verified).length,
      unverified: state.contacts.filter(c => !c.is_verified).length,
      sellers: state.contacts.filter(c => c.has_sold).length,
      non_sellers: state.contacts.filter(c => !c.has_sold).length
    })
  },

  actions: {
    async fetchContacts(apiUrl: string, token: string) {
      this.loading = true
      try {
        const response = await $fetch('/api/contacts', {
          headers: {
            Authorization: `Bearer ${token}`
          },
          baseURL: apiUrl
        })
        this.contacts = response.data
        this.total = response.total
        this.applyFilters()
      } catch (error) {
        console.error('Error fetching contacts:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    applyFilters() {
      let filtered = [...this.contacts]

      if (this.filters.has_sold !== null) {
        filtered = filtered.filter(c => c.has_sold === this.filters.has_sold)
      }

      if (this.filters.is_verified !== null) {
        filtered = filtered.filter(c => c.is_verified === this.filters.is_verified)
      }

      this.filteredContacts = filtered
    },

    setFilter(key: 'has_sold' | 'is_verified', value: boolean | null) {
      this.filters[key] = value
      this.applyFilters()
    },

    toggleContactSelection(contact: Contact) {
      const index = this.selectedContacts.findIndex(c => c.id === contact.id)
      if (index > -1) {
        this.selectedContacts.splice(index, 1)
      } else {
        this.selectedContacts.push(contact)
      }
    },

    selectAll(filteredOnly: boolean = true) {
      const contactsToSelect = filteredOnly ? this.filteredContacts : this.contacts
      this.selectedContacts = [...contactsToSelect]
    },

    clearSelection() {
      this.selectedContacts = []
    },

    isSelected(contact: Contact): boolean {
      return this.selectedContacts.some(c => c.id === contact.id)
    }
  }
})