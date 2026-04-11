<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-10 px-4 sm:px-6">
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-zinc-900 dark:text-white">Transmissão em Massa</h2>
      <p class="text-sm text-zinc-500 mt-1">Dispare mensagens de forma profissional para listas filtradas da base Evolution.</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Coluna Esquerda: Compositor de Mensagem -->
      <div class="lg:col-span-8 flex flex-col gap-6">
         <div class="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div class="flex items-center gap-3">
                 <div class="w-10 h-10 rounded-lg bg-[#FF009D]/10 flex items-center justify-center text-[#FF009D]">
                   <Icon name="ph:speaker-high-bold" class="w-5 h-5" />
                 </div>
                 <div>
                   <h3 class="font-semibold text-zinc-900 dark:text-white text-base">Nova Transmissão</h3>
                   <p class="text-xs text-zinc-500">Configure o título e o corpo da sua mensagem</p>
                 </div>
              </div>
            </div>
            
            <div class="p-6 space-y-6">
              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Título / Assunto (Apenas controle interno)</label>
                <input v-model="campaignName" type="text" placeholder="Ex: Black Friday 2026 - Somente Moçambique" class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FF009D] transition-shadow placeholder-zinc-400" />
              </div>

              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between">
                   <label class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Mensagem do WhatsApp</label>
                   <span class="text-[11px] font-bold tracking-wider uppercase text-zinc-400 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded">Variáveis: {nome} {email} {status}</span>
                </div>
                <textarea v-model="messageTemplate" rows="8" placeholder="Olá {nome}, temos um lançamento imperdível. Aproveite hoje mesmo..." class="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FF009D] transition-shadow resize-none"></textarea>
                <p class="text-xs text-zinc-500 text-right mt-1">{{ messageTemplate.length }} caracteres</p>
              </div>
            </div>
            
            <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 rounded-b-2xl">
              <button class="px-5 py-2 font-medium text-sm text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Salvar Rascunho</button>
              <button @click="sendCampaign" :disabled="sendingCampaign" class="px-6 py-2 bg-[#FF009D] text-white font-medium text-sm rounded-lg flex items-center gap-2 hover:bg-[#D90085] transition-colors shadow-lg shadow-[#FF009D]/20 disabled:opacity-50">
                <Icon :name="sendingCampaign ? 'ph:spinner-gap-bold' : 'ph:paper-plane-right-bold'" :class="{ 'animate-spin': sendingCampaign }" /> 
                {{ sendingCampaign ? 'A Enviar...' : 'Disparar Agora' }}
              </button>
            </div>
         </div>
      </div>

      <!-- Coluna Direita: Filtros e Preview -->
      <div class="lg:col-span-4 flex flex-col gap-6">
        
        <!-- Preview em Tempo Real -->
        <div class="bg-green-50 dark:bg-[#111b11] border border-green-200 dark:border-green-900/30 rounded-2xl p-5 shadow-sm">
           <h4 class="font-semibold text-emerald-800 dark:text-emerald-500 text-sm mb-3 flex items-center gap-2">
             <Icon name="ph:device-mobile-bold" class="w-4 h-4"/> Preview WhatsApp
           </h4>
           <div class="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap font-sans border border-zinc-100 dark:border-zinc-800 relative">
             <div class="absolute right-0 top-0 w-8 h-full bg-gradient-to-l from-white dark:from-zinc-900 to-transparent pointer-events-none"></div>
             <div class="absolute right-[-6px] top-4 w-3 h-3 bg-white dark:bg-zinc-900 rotate-45 border-r border-t border-zinc-100 dark:border-zinc-800"></div>
             <p class="break-words opacity-80" v-if="!messageTemplate">Escreva algo para ver o preview aqui...</p>
             <p class="break-words" v-else>{{ simulatedMessage }}</p>
             <span class="text-[10px] text-zinc-400 float-right mt-2">Agora</span>
           </div>
        </div>

        <!-- Filtros de Audiência -->
        <div class="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col flex-1 h-full max-h-[700px]">
          <div class="p-5 border-b border-zinc-200 dark:border-zinc-800">
             <h3 class="font-semibold text-zinc-900 dark:text-white text-base">Audiência</h3>
             <p class="text-xs text-zinc-500 mt-1">Selecione quem vai receber ({{ filteredContacts.length }} de {{ store.contacts.length }})</p>
          </div>
          
          <div class="p-5 flex flex-col gap-4 border-b border-zinc-100 dark:border-zinc-800/50 shadow-inner">
             <div class="flex flex-col gap-1.5">
               <label class="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Intenção de Compra</label>
               <select v-model="filters.status" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-[#FF009D]">
                 <option value="all">Envio geral (Todos)</option>
                 <option value="purchased">Já fizeram compra</option>
                 <option value="not_purchased">Nunca compraram (Leads)</option>
               </select>
             </div>
             
             <div class="flex flex-col gap-1.5">
               <label class="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Status de Verificação</label>
               <select v-model="filters.verification" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-[#FF009D]">
                 <option value="all">Qualquer um</option>
                 <option value="verified">Somente verificados</option>
               </select>
             </div>
          </div>
          
          <!-- Lista de Usuários com Busca -->
          <div class="flex-1 flex flex-col overflow-hidden min-h-[350px]">
             <!-- Busca e Acoes em massa -->
             <div class="p-4 border-b border-zinc-100 dark:border-zinc-800/50 space-y-3 bg-zinc-50/30 dark:bg-zinc-900/20">
               <div class="relative">
                 <Icon name="ph:magnifying-glass-bold" class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                 <input v-model="searchQuery" type="text" placeholder="Nome, e-mail ou telefone..." class="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF009D]" />
               </div>
               <div class="flex justify-between items-center px-1">
                 <span class="text-[10px] font-bold tracking-wider uppercase text-zinc-500">{{ selectedContacts.length }} Selecionados</span>
                 <label class="flex items-center gap-2 cursor-pointer text-[11px] font-bold uppercase text-[#FF009D] hover:opacity-80 transition-opacity">
                   Tudo <input type="checkbox" v-model="selectAll" class="accent-[#FF009D] w-3.5 h-3.5" />
                 </label>
               </div>
             </div>
             
             <!-- Area Scrollavel -->
             <div class="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <div class="flex flex-col gap-1">
                  <label v-for="contact in filteredContacts" :key="contact.id" class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 cursor-pointer border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-800 transition-all active:scale-[0.98]">
                    <input type="checkbox" v-model="selectedContacts" :value="contact.id" class="accent-[#FF009D] w-4 h-4" />
                    <div class="flex flex-col min-w-0">
                       <span class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{{ contact.full_name || contact.firstname || contact.name || 'Sem nome' }}</span>
                       <span class="text-[11px] text-zinc-500 truncate leading-tight">{{ contact.email || contact.phone_number || '-' }}</span>
                    </div>
                  </label>
                  <div v-if="filteredContacts.length === 0" class="flex flex-col items-center justify-center py-12 text-zinc-400 opacity-60">
                    <Icon name="ph:users-slash-bold" class="w-8 h-8 mb-2" />
                    <p class="text-xs font-medium">Nenhum contato encontrado</p>
                  </div>
                </div>
             </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useContactStore } from '~/stores/contacts'
import { useHead } from '#imports'

useHead({ title: 'Transmissão - Lojou Messaging' })

const store = useContactStore()
const evo = useEvolution()

const filters = reactive({
  status: 'all',
  verification: 'all'
})

const sendingCampaign = ref(false)
const campaignName = ref('')
const messageTemplate = ref('')
const searchQuery = ref('')
const selectedContacts = ref<(string | number)[]>([])

const simulatedMessage = computed(() => {
  let msg = messageTemplate.value || ''
  msg = msg.replace(/{nome}/g, 'Joaquim Alberto')
  msg = msg.replace(/{email}/g, 'cliente@gmail.com')
  msg = msg.replace(/{status}/g, 'verified')
  return msg
})

onMounted(() => {
  // Sempre forçamos o carregamento da lista completa (2000+) ao entrar na transmissão
  // para garantir que nenhum contato fique de fora, ignorando caches parciais de outras páginas.
  store.fetchContacts({ is_paginate: 1, per_page: 2000, page: 1 })
})

const filteredContacts = computed(() => {
  return store.contacts.filter((c: any) => {
    // Filtro de Busca Texto
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const name = (c.full_name || c.firstname || c.name || '').toLowerCase()
      const email = (c.email || '').toLowerCase()
      const phone = (c.phone_number || c.phone || '').toLowerCase()
      if (!name.includes(q) && !email.includes(q) && !phone.includes(q)) return false
    }

    // Filtros de Status
    let matchStatus = true
    if (filters.status === 'purchased') matchStatus = c.has_purchased === true
    if (filters.status === 'not_purchased') matchStatus = c.has_purchased === false || !c.has_purchased
    
    // Filtros de Verificação
    let matchVer = true
    if (filters.verification === 'verified') matchVer = c.verified === true
    
    return matchStatus && matchVer
  })
})

const selectAll = computed({
  get: () => filteredContacts.value.length > 0 && selectedContacts.value.length === filteredContacts.value.length,
  set: (val) => {
    if (val) selectedContacts.value = filteredContacts.value.map((c: any) => c.id)
    else selectedContacts.value = []
  }
})

const sendCampaign = async () => {
  if (!campaignName.value || !messageTemplate.value || selectedContacts.value.length === 0) {
    alert('Erro: Preencha o título, a mensagem e selecione pelo menos um contato.')
    return
  }
  
  if (confirm(`Atenção: Deseja iniciar o disparo para ${selectedContacts.value.length} contatos?`)) {
    sendingCampaign.value = true
    try {
      const targets = store.contacts.filter((c: any) => selectedContacts.value.includes(c.id))
      
      for (const contact of targets) {
        const rawPhone = contact.phone_number || contact.phone || contact.whatsapp
        if (!rawPhone) continue
        
        let msg = messageTemplate.value
        msg = msg.replace(/{nome}/g, contact.firstname || contact.name || 'Cliente')
        msg = msg.replace(/{email}/g, contact.email || '')
        msg = msg.replace(/{status}/g, contact.status || '')
        
        await evo.sendText(rawPhone, msg)
        // Delay anti-ban seguro (1.5s)
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
      
      alert('Campanha enviada com sucesso para a fila de processamento!')
      campaignName.value = ''
      messageTemplate.value = ''
      selectedContacts.value = []
    } catch (e: any) {
      alert('Erro no disparo: ' + (e?.message || 'Houve um problema na comunicação com a Evolution.'))
    } finally {
      sendingCampaign.value = false
    }
  }
}
</script>