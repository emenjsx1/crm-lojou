<template>
  <div class="h-full flex flex-col bg-zinc-50 dark:bg-black overflow-hidden relative">
    


    <!-- Top Header Bar -->
    <header class="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-[#FF009D]/10 flex items-center justify-center">
          <Icon name="ph:users-three-fill" class="w-5 h-5 text-[#FF009D]" />
        </div>
        <h1 class="text-xl font-semibold text-zinc-900 dark:text-white">Usuários Lojou</h1>
      </div>
      <div class="flex items-center gap-3">

        <div class="relative">
          <Icon name="ph:magnifying-glass" class="w-5 h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            v-model="searchQuery" 
            @keyup.enter="applyFilters"
            type="text" 
            placeholder="Buscar usuário (Enter para buscar)..." 
            class="pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF009D]/50 w-64 transition-all"
          />
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 overflow-auto p-6 flex flex-col gap-6">

      <!-- Filters Toolbar Lojou Style -->
      <div class="flex flex-wrap items-end gap-3 p-4 bg-white dark:bg-[#09090b] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        
        <!-- Field Select -->
        <div class="flex flex-col gap-1.5 w-40">
          <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Buscar por</label>
          <select v-model="searchType" class="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF009D]/50 text-zinc-700 dark:text-zinc-300">
            <option value="email">Email</option>
            <option value="name">Nome</option>
            <option value="id">ID</option>
          </select>
        </div>

        <!-- Input Pesquisar -->
        <div class="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Pesquisar usuários</label>
          <input 
            v-model="searchQuery" 
            @keyup.enter="applyFilters"
            type="text" 
            placeholder="Pesquisar por ID, nome ou email" 
            class="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF009D]/50 text-zinc-700 dark:text-zinc-300"
          />
        </div>

        <!-- Filter Select -->
        <div class="flex flex-col gap-1.5 w-48">
          <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Filtros</label>
          <select v-model="selectedFilterType" @change="applyFilters" class="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF009D]/50 text-zinc-700 dark:text-zinc-300">
            <option value="todos">Todos</option>
            <option value="verified">Verificados</option>
            <option value="has_purchased">Compraram</option>
            <option value="has_product">Têm Produtos</option>
          </select>
        </div>

        <!-- Filter Button -->
        <button @click="applyFilters" class="px-6 py-2 bg-black dark:bg-zinc-800 text-white font-medium text-sm rounded-lg hover:opacity-80 transition-all h-[38px] min-w-[120px]">
          Filtrar
        </button>
      </div>

      <!-- Table Container -->
      <div class="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
        
        <div v-if="loading" class="p-16 flex flex-col items-center justify-center text-zinc-500">
          <Icon name="ph:spinner-gap-bold" class="w-8 h-8 animate-spin text-[#FF009D] mb-4" />
          <p>Sincronizando usuários da API Lojou...</p>
        </div>

        <div v-else-if="contacts.length > 0" class="overflow-x-auto">
          <table class="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
            <thead class="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th class="px-6 py-4 font-semibold text-xs tracking-wide">ID</th>
                <th class="px-6 py-4 font-semibold text-xs tracking-wide">Nome</th>
                <th class="px-6 py-4 font-semibold text-xs tracking-wide">Email</th>
                <th class="px-6 py-4 font-semibold text-xs tracking-wide text-center">Status</th>
                <th class="px-6 py-4 font-semibold text-xs tracking-wide text-center">Total de pedidos</th>
                <th class="px-6 py-4 font-semibold text-xs tracking-wide text-right">Total ganho</th>
                <th class="px-6 py-4 font-semibold text-xs tracking-wide text-right">Total pago</th>
                <th class="px-6 py-4 font-semibold text-xs tracking-wide text-center">Moeda</th>
                <th class="px-6 py-4 font-semibold text-xs tracking-wide text-right">Criado em</th>
                <th class="px-6 py-4 font-semibold text-xs tracking-wide text-right">Último acesso em</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              <tr v-for="contact in contacts" :key="contact.id" class="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                
                <td class="px-6 py-4 text-zinc-600 dark:text-zinc-400 font-medium">{{ contact.id }}</td>
                <td class="px-6 py-4 text-zinc-900 dark:text-white">{{ contact.full_name || contact.firstname || contact.name || 'Sem nome' }}</td>
                <td class="px-6 py-4 text-zinc-900 dark:text-white font-medium">{{ contact.email || '-' }}</td>

                <td class="px-6 py-4 text-center">
                   <div :class="[
                     'text-[13px] font-medium tracking-wide',
                     contact.status === 'ativo' || contact.status === 'verified' || contact.status === 'active' || contact.status === 'success' || !contact.status
                      ? 'text-emerald-500' 
                      : 'text-red-500'
                   ]">
                     {{ capitalize(contact.status || 'Active') }}
                   </div>
                </td>

                <td class="px-6 py-4 text-center text-zinc-700 dark:text-zinc-300">
                  {{ contact.total_orders ?? '0' }}
                </td>

                <td class="px-6 py-4 text-right text-zinc-700 dark:text-zinc-300">
                  {{ formatNumber(contact.total_earned) }}
                </td>

                <td class="px-6 py-4 text-right text-zinc-700 dark:text-zinc-300">
                  {{ formatNumber(contact.total_paid) }}
                </td>

                <td class="px-6 py-4 text-center text-zinc-600 dark:text-zinc-400 font-medium">
                  {{ contact.currency || 'MZN' }}
                </td>

                <td class="px-6 py-4 text-right text-zinc-700 dark:text-zinc-300">
                  {{ formatDate(contact.created_at) || '-' }}
                </td>

                <td class="px-6 py-4 text-right text-zinc-700 dark:text-zinc-300 font-medium">
                   {{ timeAgo(contact.updated_at || contact.last_access_at) || '-' }}
                </td>

              </tr>
            </tbody>
          </table>
        </div>
          
        <!-- Empty State / Debug Board -->
        <div v-else class="p-16 flex flex-col items-center justify-center text-zinc-500 text-center relative">
          <Icon name="ph:users" class="w-12 h-12 mb-4 opacity-50" />
          <h3 class="text-lg font-medium text-zinc-900 dark:text-white">Nenhum usuário encontrado na API.</h3>
          <p class="text-sm mt-1 max-w-sm mb-6">Tente limpar os filtros ou verifique se o seu token session_1 está válido.</p>
          
          <div v-if="apiError" class="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-lg max-w-2xl w-full text-left font-mono mb-4 break-words">
             <b>Erro na Requisição:</b><br/> {{ apiError }}
          </div>
          
          <div v-if="rawResponse" class="p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs rounded-lg max-w-2xl w-full text-left font-mono break-words">
             <b>Resposta Recebida (Debug):</b><br/>
             {{ rawResponse }}
          </div>
        </div>
        
        <!-- Pagination Simulator Footer -->
        <div class="border-t border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between text-sm text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 mt-auto">
           <span>Total: <b>{{ totalRecords }}</b> registros vindos da Lojou</span>
           <div class="flex gap-2">
             <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1" class="px-3 py-1 border border-zinc-200 dark:border-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50 transition-all">Anterior</button>
             <button class="px-3 py-1 border border-[#FF009D] bg-[#FF009D]/10 text-[#FF009D] rounded font-medium disabled:opacity-50 transition-all">Pág {{ currentPage }}</button>
             <button @click="changePage(currentPage + 1)" class="px-3 py-1 border border-zinc-200 dark:border-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50 transition-all">Próxima</button>
           </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useContactStore } from '~/stores/contacts'
import { storeToRefs } from 'pinia'

const store = useContactStore()
const { contacts, loading, totalRecords, currentPage, apiError, rawResponse } = storeToRefs(store)

const searchType = ref('email')
const searchQuery = ref('')
const selectedFilterType = ref('todos')

const hasToken = ref(false)
const tempToken = ref('')

const checkToken = () => {
  if (typeof window !== 'undefined') {
    hasToken.value = !!localStorage.getItem('lojou_session_1')
  }
}

const saveToken = () => {
  if (typeof window !== 'undefined' && tempToken.value) {
    localStorage.setItem('lojou_session_1', tempToken.value.trim())
    hasToken.value = true
    applyFilters()
  }
}

const clearToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lojou_session_1')
    hasToken.value = false
    tempToken.value = ''
    store.contacts = [] 
  }
}

const formatNumber = (val: any) => {
  if (val === null || val === undefined) return '0'
  return parseFloat(val).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

const capitalize = (val: string) => {
  if(!val) return ''
  return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()
}

const formatDate = (dateStr: any) => {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if(isNaN(date.getTime())) return dateStr 
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

const timeAgo = (dateStr: any) => {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  
  let interval = seconds / 31536000
  if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " ano" : " anos")
  interval = seconds / 2592000
  if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " mês" : " meses")
  interval = seconds / 86400
  if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " dia" : " dias")
  interval = seconds / 3600
  if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " hora" : " horas")
  interval = seconds / 60
  if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " minuto" : " minutos")
  
  return "Agora mesmo"
}

const applyFilters = () => {
  const params: any = {
    is_paginate: 1,
    page: 1, 
    per_page: 10
  }

  if(searchQuery.value) params.search = searchQuery.value
  
  if (selectedFilterType.value === 'verified') params.verified = 1
  if (selectedFilterType.value === 'has_purchased') params.has_purchased = 1
  if (selectedFilterType.value === 'has_product') params.has_products = 1

  store.fetchContacts(params)
}

const changePage = (newPage: number) => {
  store.currentPage = newPage
  const params: any = {
    is_paginate: 1,
    page: newPage,
    per_page: 10
  }
  
  if(searchQuery.value) params.search = searchQuery.value
  
  if (selectedFilterType.value === 'verified') params.verified = 1
  if (selectedFilterType.value === 'has_purchased') params.has_purchased = 1
  if (selectedFilterType.value === 'has_product') params.has_products = 1

  store.fetchContacts(params)
}

onMounted(() => {
  checkToken()
  if (hasToken.value) {
    applyFilters()
  }
})
</script>
