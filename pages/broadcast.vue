<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-10">
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-zinc-900 dark:text-white">Transmissão em Massa</h2>
      <p class="text-sm text-zinc-500 mt-1">Dispare mensagens de forma profissional para listas filtradas da base Evolution.</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Left Column: Composer (Col-span 8) -->
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

      <!-- Right Column: Filtering & Preview (Col-span 4) -->
      <div class="lg:col-span-4 flex flex-col gap-6">
        
        <!-- Live Preview -->
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

        <!-- Audience Filter -->
        <div class="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col flex-1">
          <div class="p-5 border-b border-zinc-200 dark:border-zinc-800">
             <h3 class="font-semibold text-zinc-900 dark:text-white text-base">Audiência</h3>
             <p class="text-xs text-zinc-500 mt-1">Selecione quem vai receber ({{ filteredContacts.length }} de {{ store.contacts.length }})</p>
          </div>
          <div class="p-5 flex flex-col gap-5 border-b border-zinc-100 dark:border-zinc-800/50">
             <div class="flex flex-col gap-2">
               <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Intenção de Compra</label>
               <select v-model="filters.status" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-[#FF009D]">
                 <option value="all">Envio geral (Todos)</option>
                 <option value="purchased">Já fizeram compra</option>
                 <option value="not_purchased">Nunca compraram (Leads)</option>
               </select>
             </div>
             
             <div class="flex flex-col gap-2">
               <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Status de Verificação</label>
               <select v-model="filters.verification" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-[#FF009D]">
                 <option value="all">Qualquer um</option>
                 <option value="verified">Somente verificados</option>
               </select>
             </div>
          </div>
          
          <!-- Users Log -->
          <div class="flex-1 min-h-[300px] flex flex-col overflow-hidden">
             <!-- Search and Actions -->
             <div class="p-3 border-b border-zinc-100 dark:border-zinc-800/50 space-y-3">
               <div class="relative">
                 <Icon name="ph:magnifying-glass-bold" class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                 <input v-model="searchQuery" type="text" placeholder="Pesquisar contatos..." class="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF009D]" />
               </div>
               <div class="flex justify-between items-center px-1">
                 <span class="text-[10px] font-bold tracking-wider uppercase text-zinc-500">{{ selectedContacts.length }} / {{ filteredContacts.length }} Selecionados</span>
                 <label class="flex items-center gap-2 cursor-pointer text-[11px] font-bold uppercase text-[#FF009D] hover:opacity-80 transition-opacity">
                   Selecionar tudo <input type="checkbox" v-model="selectAll" class="accent-[#FF009D] w-3 h-3" />
                 </label>
               </div>
             </div>
             
             <div class="flex-1 overflow-y-auto p-2">
             <div class="p-2 flex flex-col gap-1">
               <label v-for="contact in filteredContacts" :key="contact.id" class="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-colors">
                 <input type="checkbox" v-model="selectedContacts" :value="contact.id" class="accent-[#FF009D]" />
                 <div class="flex flex-col min-w-0">
                    <span class="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{{ contact.full_name || contact.firstname || contact.name || 'Sem nome' }}</span>
                    <span class="text-[10px] text-zinc-500 truncate">{{ contact.email || contact.phone_number || '-' }}</span>
                 </div>
               </label>
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
import { useToast } from '#imports'

useHead({ title: 'Transmissão - Lojou Messaging' })

const store = useContactStore()
const toast = useToast()
const evo = useEvolution()

const filters = reactive({
  status: 'all',
  verification: 'all'
})

const sendingCampaign = ref(false)
const campaignName = ref('')
const messageTemplate = ref('')
const searchQuery = ref('')

const simulatedMessage = computed(() => {
  let msg = messageTemplate.value
  msg = msg.replace(/{nome}/g, 'Joaquim Alberto')
  msg = msg.replace(/{email}/g, 'cliente@gmail.com')
  msg = msg.replace(/{status}/g, 'verified')
  return msg
})

onMounted(() => {
  if(store.contacts.length === 0) {
    // Carregamos um número alto para cobrir todos os contatos como solicitado (ex: 2000)
    store.fetchContacts({ is_paginate: 1, per_page: 2000, page: 1 })
  }
})

const filteredContacts = computed(() => {
  return store.contacts.filter((c: any) => {
    // Search filter
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const name = (c.full_name || c.firstname || c.name || '').toLowerCase()
      const email = (c.email || '').toLowerCase()
      const phone = (c.phone_number || c.phone || '').toLowerCase()
      if (!name.includes(q) && !email.includes(q) && !phone.includes(q)) return false
    }

    let matchStatus = true
    if (filters.status === 'purchased') matchStatus = c.has_purchased === true
    if (filters.status === 'not_purchased') matchStatus = c.has_purchased === false || !c.has_purchased
    
    let matchVer = true
    if (filters.verification === 'verified') matchVer = c.verified === true
    
    return matchStatus && matchVer
  })
})

const selectedContacts = ref<any[]>([])

const selectAll = computed({
  get: () => filteredContacts.value.length > 0 && selectedContacts.value.length === filteredContacts.value.length,
  set: (val) => {
    if (val) selectedContacts.value = filteredContacts.value.map((c:any) => c.id)
    else selectedContacts.value = []
  }
})

const sendCampaign = async () => {
  if (!campaignName.value || !messageTemplate.value || selectedContacts.value.length === 0) {
    alert('Erro: Preencha todos os campos e selecione contatos.')
    return
  }
  
  if(confirm(`Tem certeza que deseja enviar para ${selectedContacts.value.length} destinatários? A ação não pode ser desfeita.`)){
    sendingCampaign.value = true
    try {
      const targets = filteredContacts.value.filter((c:any) => selectedContacts.value.includes(c.id))
      for (const contact of targets) {
        const rawPhone = contact.phone_number || contact.phone || contact.whatsapp
        if (!rawPhone) continue
        
        // Parse message
        let msg = messageTemplate.value
        msg = msg.replace(/{nome}/g, contact.firstname || contact.name || 'Cliente')
        msg = msg.replace(/{email}/g, contact.email || '')
        msg = msg.replace(/{status}/g, contact.status || '')
        
        await evo.sendText(rawPhone, msg)
        await new Promise(resolve => setTimeout(resolve, 1500)) // Antiban delay
      }
      alert('Transmissão concluída com sucesso!')
      campaignName.value = ''
      messageTemplate.value = ''
      selectedContacts.value = []
    } catch (e: any) {
      alert('Erro durante o disparo: ' + (e?.response?.data || e.message))
    } finally {
      sendingCampaign.value = false
    }
  }
}
</script>