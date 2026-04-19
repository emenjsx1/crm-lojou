<template>
  <div class="h-full flex flex-col bg-white dark:bg-[#09090b] border-r dark:border-zinc-800">
    <!-- Search & New Chat -->
    <div class="p-4 border-b dark:border-zinc-800 flex flex-col gap-3">
      <div class="flex justify-between items-center">
        <h3 class="font-semibold text-zinc-900 dark:text-white">Mensagens</h3>
        <button @click="$emit('open-search')" class="w-8 h-8 rounded-lg bg-[#FF009D]/10 text-[#FF009D] hover:bg-[#FF009D]/20 flex items-center justify-center transition-colors tooltip-trigger" title="Nova Conversa / Pesquisar Contato">
          <Icon name="ph:chat-teardrop-text-bold" class="w-5 h-5" />
        </button>
      </div>
      <div class="relative">
        <Icon name="ph:magnifying-glass" class="w-5 h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input v-model="searchQuery" type="text" placeholder="Filtrar conversas..." class="w-full pl-10 pr-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF009D]/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500" />
      </div>
    </div>

    <!-- Contact List -->
    <div class="flex-1 overflow-y-auto">
      <div v-for="contact in filteredContacts" :key="contact.id" 
            class="p-4 border-b dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors relative"
            :class="{ 'bg-zinc-50 dark:bg-zinc-800': activeContactId === contact.id }"
            @click="$emit('select', contact)">
            
        <div v-if="activeContactId === contact.id" class="absolute left-0 top-0 bottom-0 w-1 bg-[#FF009D]"></div>
        
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold text-sm shrink-0 uppercase">
             {{ getInitials(contact.full_name || contact.firstname || contact.name || 'S N') }}
          </div>
          <div class="flex-1 min-w-0 pr-1">
            <div class="flex justify-between items-baseline mb-1">
              <h4 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                {{ (contact.full_name || contact.name || contact.firstname || 'Sem nome').toLowerCase() }}
                <Icon v-if="contact.user_id" name="ph:seal-check-fill" class="w-3.5 h-3.5 text-emerald-500" />
              </h4>
              <span class="text-[10px] text-zinc-400 font-medium">{{ formatTime(contact.lastMessageTime) }}</span>
            </div>
            <div class="flex items-center justify-between gap-2">
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate leading-relaxed">
                {{ contact.lastMessage || 'Sem mensagens' }}
              </p>
              <div class="shrink-0 flex gap-1">
                <span v-if="!contact.user_id" class="px-1 py-0.5 bg-amber-500/10 text-amber-600 rounded-[4px] text-[8px] font-black uppercase tracking-tighter">
                  LEAD
                </span>
                <span v-if="contact.unread" class="w-4 h-4 rounded-full bg-[#FF009D] text-white text-[9px] font-black flex items-center justify-center shadow-lg shadow-[#FF009D]/30">
                  {{ contact.unread }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="filteredContacts.length === 0" class="p-8 text-center text-zinc-500 text-sm">
        Nenhuma conversa ativa.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  contacts: any[]
  activeContactId?: number | string
}>()

const emit = defineEmits<{
  (e: 'select', contact: any): void
  (e: 'new-chat', phone: string): void
  (e: 'open-search'): void
}>()

const searchQuery = ref('')

const formatTime = (ts: string) => {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const filteredContacts = computed(() => {
  if (!searchQuery.value) return props.contacts
  const q = searchQuery.value.toLowerCase()
  return props.contacts.filter(c => {
    const name = (c.full_name || c.firstname || c.name || '').toLowerCase()
    const phone = (c.phone_number || c.mobile_number || '').toLowerCase()
    return name.includes(q) || phone.includes(q)
  })
})

const getInitials = (name: string) => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).substring(0,2)
  }
  return parts[0].substring(0, 2)
}
</script>