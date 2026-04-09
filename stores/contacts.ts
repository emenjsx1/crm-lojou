import { defineStore } from 'pinia'
import { useApi } from '~/composables/useApi'

// Modelo presumido com base nos parâmetros de filtro da API Lojou
export interface Contact {
  id: number | string
  name: string
  email: string
  status?: string // Ex: 'active', 'inactive', 'verified'
  total_orders?: number
  total_earned?: number
  total_paid?: number
  currency?: string
  created_at?: string
  last_access_at?: string
  
  // Retrocompatibilidade opcional com nossos filtros criados
  phone?: string
  verified?: boolean
  has_purchased?: boolean
  has_product?: boolean
  [key: string]: any
}

export interface FetchContactsParams {
  search?: string
  has_product?: boolean
  has_purchased?: boolean
  verified?: boolean
  is_paginate?: boolean
  page?: number
  per_page?: number
  'filters[start_at]'?: string
  'filters[end_at]'?: string
}

export const useContactStore = defineStore('contacts', {
  state: () => ({
    contacts: [] as Contact[],
    loading: false,
    totalRecords: 0,
    currentPage: 1,
    perPage: 10,
    apiError: null as string | null,
    rawResponse: null as string | null
  }),
  actions: {
    async fetchContacts(params: FetchContactsParams = {}) {
      this.loading = true
      this.apiError = null
      this.rawResponse = null
      const { api } = useApi()

      try {
        const queryParams: Record<string, any> = {
            page: this.currentPage,
            per_page: this.perPage
        }

        // Adiciona apenas as chaves que tem valor para não bugar a API
        Object.keys(params).forEach(key => {
            if (params[key as keyof FetchContactsParams] !== undefined && params[key as keyof FetchContactsParams] !== '') {
                queryParams[key] = params[key as keyof FetchContactsParams]
            }
        })

        const response = await api.get('/admin/users', { params: queryParams })
        
        console.log("Resposta da API Lojou: ", response.data) // Para debugar no console F12
        this.rawResponse = JSON.stringify(response.data).substring(0, 500) // Salvar na tela os primeiros 500 chars

        // A API Lojou retorna a lista de usuários e metadados na raiz
        let list = response.data

        if (response.data?.users && Array.isArray(response.data.users)) {
           list = response.data.users // Se for Paginação (10 items) com Root object
        } else if (response.data?.data && Array.isArray(response.data.data)) {
           list = response.data.data
        }

        if (Array.isArray(list)) {
          this.contacts = list
          this.totalRecords = response.data?.total || list.length
          
          // Se as páginas vierem setadas, a gente sincroniza (Lojou envia page, last_page, per_page)
          if(response.data?.page) {
             this.currentPage = response.data.page
          }
        } else if (typeof list === 'object' && Object.keys(list).length > 0 && !list.status) {
           this.contacts = [list]
           this.totalRecords = 1
        } else {
          this.contacts = []
          this.totalRecords = 0
        }
      } catch (error: any) {
        console.error('Erro ao buscar contatos na API Lojou:', error)
        this.apiError = error.message || String(error)
        if (error.response) {
            this.apiError += " | Status: " + error.response.status + " | Data: " + JSON.stringify(error.response.data)
        }
      } finally {
        this.loading = false
      }
    }
  }
})
