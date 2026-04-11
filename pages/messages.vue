<template>
  <div class="flex flex-col h-[calc(100vh-6rem)] relative">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-white">Mensagens</h2>
      <div class="flex items-center gap-3">
        <button 
          @click="syncAll" 
          :disabled="syncingAll"
          class="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
        >
          <Icon :name="syncingAll ? 'ph:spinner-gap-bold' : 'ph:arrows-clockwise-bold'" class="w-4 h-4" :class="{ 'animate-spin': syncingAll }" />
          {{ syncingAll ? 'A sincronizar...' : 'Sincronizar Tudo' }}
        </button>
        <label class="text-sm font-medium text-zinc-600 dark:text-zinc-400">Assinatura no WhatsApp:</label>
        <div class="relative">
          <Icon name="ph:pen-nib-bold" class="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            v-model="agentSignature"
            type="text"
            placeholder="Ex: - *Suporte Lojou*"
            class="pl-9 pr-3 py-1.5 bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#FF009D]"
          />
        </div>
      </div>
    </div>

    <!-- Interface -->
    <div class="flex flex-1 bg-white dark:bg-[#09090b] rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm relative">
      <ContactList
        :contacts="activeConversations"
        :active-contact-id="activeContact?.id"
        @select="selectContact"
        @open-search="showSearchModal = true"
        @new-chat="onNewChat"
      />
      <ChatWindow
        :contact="activeContact"
        :messages="activeMessages"
        :sending="sending"
        @send="onSendText"
        @send-media="onSendMedia"
      />
    </div>

    <!-- Search Modal -->
    <div v-if="showSearchModal" class="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl px-4">
      <div class="bg-white dark:bg-[#09090b] w-full max-w-xl max-h-[80vh] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
        <div class="p-4 border-b border-zinc-200 dark:border-zinc-800 relative">
          <Icon v-if="!searchLoading" name="ph:magnifying-glass-bold" class="absolute left-7 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <Icon v-else name="ph:spinner-gap-bold" class="absolute left-7 top-1/2 -translate-y-1/2 text-[#FF009D] w-5 h-5 animate-spin" />
          <input
            v-model="globalSearchQuery"
            type="text"
            placeholder="Pesquisar por Nome, Email ou Número..."
            class="w-full pl-10 pr-10 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#FF009D] transition-colors"
            autofocus
          />
          <button @click="showSearchModal = false" class="absolute right-7 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
            <Icon name="ph:x-bold" class="w-5 h-5" />
          </button>
        </div>

        <div class="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800/50">
          <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            {{ globalSearchQuery ? `${searchedUsers.length} resultado(s)` : `${searchedUsers.length} contactos recentes` }}
          </span>
        </div>

        <div class="flex-1 overflow-y-auto p-2">
          <div v-if="searchLoading" class="py-8 text-center text-zinc-400">
            <Icon name="ph:spinner-gap-bold" class="w-8 h-8 mx-auto animate-spin text-[#FF009D] mb-2" />
            <p class="text-sm">A pesquisar...</p>
          </div>
          <template v-else>
            <div v-for="user in searchedUsers" :key="user.id"
              class="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-colors group">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#FF009D]/10 flex items-center justify-center text-[#FF009D] font-bold uppercase shrink-0 text-sm">
                  {{ getInitials(user.full_name || user.firstname || user.name || 'SN') }}
                </div>
                <div class="flex flex-col min-w-0">
                  <h4 class="font-semibold text-sm text-zinc-900 dark:text-white capitalize truncate pr-2">
                    {{ (user.full_name || user.firstname || user.name || 'Sem nome').toLowerCase() }}
                  </h4>
                  <p class="text-xs text-zinc-500 truncate mt-0.5">
                    {{ user.phone_number || user.email || `ID: ${user.id}` }}
                  </p>
                </div>
              </div>
              <button @click="startConversationWith(user)"
                class="opacity-0 group-hover:opacity-100 flex-shrink-0 px-4 py-1.5 bg-[#FF009D]/10 text-[#FF009D] hover:bg-[#FF009D] hover:text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all">
                Conversar
              </button>
            </div>
            <div v-if="searchedUsers.length === 0" class="py-10 text-center text-zinc-500">
              <Icon name="ph:users-three" class="w-10 h-10 mx-auto opacity-30 mb-2" />
              <p class="text-sm">Nenhum utilizador encontrado.</p>
            </div>
          </template>
        </div>

        <div class="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800/50 text-center">
          <span class="text-[11px] text-zinc-400">Base de {{ contactsStore.totalRecords || '...' }} utilizadores Lojou</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useContactStore } from '~/stores/contacts'
import { useMessageStore } from '~/stores/messages'
import { useApi } from '~/composables/useApi'
import { useEvolution } from '~/composables/useEvolution'

const contactsStore = useContactStore()
const messagesStore = useMessageStore()
const { api } = useApi()
const evo = useEvolution()

const agentSignature = ref('')
const activeContact = ref<any | null>(null)
const sending = ref(false)
const syncingAll = ref(false)

const syncAll = async () => {
  if (syncingAll.value) return
  syncingAll.value = true
  try {
    const chats = await evo.fetchChats()
    if (!chats.length) return

    // Limitamos a sincronização dos últimos chats para não estoiar a API em massa
    // Mas percorremos todos os JIDs retornados
    for (const chat of chats) {
      const jid = chat.id || chat.remoteJid
      if (!jid || jid.includes('@g.us')) continue // Pular grupos se virem

      const phone = jid.split('@')[0]
      
      // Tentar encontrar o contato no nosso store ou criar um local temporário
      let contact = contactsStore.contacts.find(c => {
        const cPhone = String(c.phone_number || c.phone || c.whatsapp || '').replace(/\D/g, '')
        return cPhone.endsWith(phone) || phone.endsWith(cPhone)
      })

      if (!contact) {
        contact = {
          id: 'ext_' + phone,
          phone_number: phone,
          name: chat.name || phone,
          full_name: chat.name || phone,
        }
      }

      // Buscar histórico (últimas 40 mensagens de cada)
      const history = await evo.fetchHistory(phone, 40)
      if (history.length > 0) {
        await messagesStore.syncFromEvolution(contact.id, history)
        markContactAsMessaged(contact)
      }
    }
    alert('Sincronização concluída com sucesso!')
  } catch (err) {
    console.error('[SYNC ALL]', err)
    alert('Erro durante a sincronização parcial.')
  } finally {
    syncingAll.value = false
  }
}

// Search
const showSearchModal = ref(false)
const globalSearchQuery = ref('')
const searchResults = ref<any[]>([])
const searchLoading = ref(false)
let debounceTimer: any = null

// Polling
let pollTimer: any = null
let globalPollTimer: any = null
const POLL_INTERVAL = 4000 // 4 segundos

onMounted(() => {
  if (typeof window !== 'undefined') {
    agentSignature.value = localStorage.getItem('lojou_agent_signature') || ''
  }
  if (contactsStore.contacts.length === 0) {
    contactsStore.fetchContacts({ is_paginate: 1, per_page: 100, page: 1 })
  }

  // Polling Global para novas mensagens em qualquer chat (a cada 5s)
  globalPollTimer = setInterval(async () => {
    try {
      const updatedChats = await evo.fetchChats()
      if (updatedChats?.length > 0) {
        // Sincroniza os 8 chats mais recentes para detectar novas mensagens
        for (const chat of updatedChats.slice(0, 8)) {
          const phone = (chat.id || chat.remoteJid || '').split('@')[0]
          if (!phone || phone.includes('status')) continue
          
          const msgs = await evo.fetchHistory(phone, 3)
          if (msgs.length > 0) {
            let contactId = phone
            const contact = contactsStore.contacts.find(c => {
               const cPhone = String(c.phone_number || c.phone || c.whatsapp || '').replace(/\D/g, '')
               return cPhone.endsWith(phone) || phone.endsWith(cPhone)
            })
            if (contact) contactId = contact.id
            await messagesStore.syncFromEvolution(contactId, msgs)
            if (contact) markContactAsMessaged(contact)
          }
        }
      }
    } catch (e) {
      console.warn('[GLOBAL POLL] Falhou:', e)
    }
  }, 5000)
})

onUnmounted(() => {
  clearInterval(pollTimer)
  clearInterval(globalPollTimer)
})

const markContactAsMessaged = (contact: any) => {
  if (!contact || !contact.id) return
  const current = [...recentChats.value]
  const idx = current.findIndex((c: any) => c.id == contact.id)
  
  const trimContact = {
    id: contact.id,
    name: contact.name,
    firstname: contact.firstname,
    full_name: contact.full_name,
    phone_number: contact.phone_number || contact.phone || contact.whatsapp,
    email: contact.email,
    status: contact.status
  }

  if (idx === -1) {
    current.unshift(trimContact)
  } else {
    current.splice(idx, 1)
    current.unshift(trimContact)
  }
  
  localStorage.setItem('lojou_recent_chats_v2', JSON.stringify(current))
  recentChats.value = current
}

watch(agentSignature, (val) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lojou_agent_signature', val)
  }
})

// Lista de conversas: Puxa do localStorage
const recentChats = ref<any[]>([])
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('lojou_recent_chats_v2')
  if (stored) {
    try { recentChats.value = JSON.parse(stored) } catch(e){}
  }
}

const activeConversations = computed(() => {
  return recentChats.value.map(contact => {
    const contactMessages = messagesStore.getMessagesByContact(contact.id)
    const lastMsg = contactMessages[contactMessages.length - 1]
    return {
      ...contact,
      lastMessage: lastMsg?.content || '',
      lastMessageTime: lastMsg?.timestamp || contact.created_at || new Date().toISOString()
    }
  })
})

// Mensagens do contacto activo — ordenadas
const activeMessages = computed(() => {
  if (!activeContact.value) return []
  return messagesStore.getMessagesByContact(activeContact.value.id)
})

// Selecciona contacto e carrega histórico
const selectContact = async (contact: any) => {
  activeContact.value = contact
  clearInterval(pollTimer)

  const phone = contact.phone_number || contact.phone || contact.whatsapp
  if (!phone) return

  // Primeiro carrega o que já temos no Supabase (offline/cache)
  await messagesStore.fetchFromSupabase(contact.id)

  // Depois sincroniza o histórico mais recente da Evolution
  const history = await evo.fetchHistory(phone)
  if (history.length > 0) {
    await messagesStore.syncFromEvolution(contact.id, history)
    markContactAsMessaged(contact)
  }

  // Polling para o contacto activo (mais frequente/profundo enquanto a conversa está aberta)
  pollTimer = setInterval(async () => {
    if (!activeContact.value) return
    const ph = activeContact.value.phone_number || activeContact.value.phone || activeContact.value.whatsapp
    if (!ph) return
    const msgs = await evo.fetchHistory(ph, 20)
    if (msgs.length > 0) {
      await messagesStore.syncFromEvolution(activeContact.value.id, msgs)
    }
  }, POLL_INTERVAL)
}

onUnmounted(() => {
  clearInterval(pollTimer)
  // Certifique-se de limpar o globalPollTimer se ele for definido no escopo acessível
})

// Envio de texto
const onSendText = async (content: string) => {
  if (!activeContact.value || sending.value) return

  const rawPhone = activeContact.value.phone_number || activeContact.value.phone || activeContact.value.whatsapp || ''
  if (!rawPhone) return

  const finalContent = agentSignature.value.trim()
    ? `${content}\n\n${agentSignature.value.trim()}`
    : content

  sending.value = true
  const msgId = messagesStore.addOutgoing(activeContact.value.id, finalContent, 'text')

  try {
    await evo.sendText(rawPhone, finalContent)
    messagesStore.updateStatus(msgId, 'delivered')
    markContactAsMessaged(activeContact.value)
  } catch (err: any) {
    console.error('[SEND TEXT]', err?.response?.data || err.message)
    messagesStore.updateStatus(msgId, 'error')
  } finally {
    sending.value = false
  }
}

// Envio de media (imagem, áudio, vídeo, documento)
const onSendMedia = async (opts: {
  type: 'image' | 'audio' | 'video' | 'document'
  base64: string
  filename: string
  mimeType: string
  caption?: string
}) => {
  if (!activeContact.value || sending.value) return

  const rawPhone = activeContact.value.phone_number || activeContact.value.phone || activeContact.value.whatsapp || ''
  if (!rawPhone) return

  sending.value = true

  // Mensagem optimista (preview local enquanto envia)
  const previewContent = opts.caption || (opts.type === 'image' ? '[Imagem]' : opts.type === 'audio' ? '[Áudio]' : '[Ficheiro]')
  const msgId = messagesStore.addOutgoing(activeContact.value.id, previewContent, opts.type, {
    mediaBase64: opts.base64.includes(',') ? opts.base64.split(',')[1] : opts.base64,
    mimeType: opts.mimeType,
    caption: opts.caption
  })

  try {
    await evo.sendMedia(rawPhone, opts)
    messagesStore.updateStatus(msgId, 'delivered')
    markContactAsMessaged(activeContact.value)
  } catch (err: any) {
    console.error('[SEND MEDIA]', err?.response?.data || err.message)
    messagesStore.updateStatus(msgId, 'error')
  } finally {
    sending.value = false
  }
}

// Search debounce
watch(globalSearchQuery, (q) => {
  clearTimeout(debounceTimer)
  if (!q.trim()) {
    searchResults.value = contactsStore.contacts.slice(0, 25)
    searchLoading.value = false
    return
  }
  searchLoading.value = true
  debounceTimer = setTimeout(async () => {
    try {
      const res = await api.get('/admin/users', { params: { search: q.trim(), is_paginate: 1, per_page: 50, page: 1 } })
      const data = res.data
      let list = []
      if (data?.users && Array.isArray(data.users)) list = data.users
      else if (data?.data && Array.isArray(data.data)) list = data.data
      else if (Array.isArray(data)) list = data
      searchResults.value = list
    } catch {
      const q2 = q.trim().toLowerCase()
      searchResults.value = contactsStore.contacts.filter((c: any) => {
        return (c.full_name || c.name || '').toLowerCase().includes(q2) ||
               (c.email || '').toLowerCase().includes(q2) ||
               (c.phone_number || '').includes(q2)
      })
    } finally {
      searchLoading.value = false
    }
  }, 400)
})

watch(showSearchModal, async (open) => {
  if (open) {
    globalSearchQuery.value = ''
    if (contactsStore.contacts.length > 0) {
      searchResults.value = contactsStore.contacts.slice(0, 25)
    } else {
      searchLoading.value = true
      await contactsStore.fetchContacts({ is_paginate: 1, per_page: 100, page: 1 })
      searchResults.value = contactsStore.contacts.slice(0, 25)
      searchLoading.value = false
    }
  }
})

const searchedUsers = computed(() => searchResults.value)

const getInitials = (name: string) => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].substring(0, 2).toUpperCase()
}

const startConversationWith = (user: any) => {
  showSearchModal.value = false
  globalSearchQuery.value = ''
  selectContact(user)
}

const onNewChat = (phone: string) => {
  const newContact = {
    id: 'local_' + Date.now(),
    phone_number: phone,
    name: phone,
    full_name: phone,
    status: 'active'
  }
  contactsStore.contacts.unshift(newContact as any)
  selectContact(newContact)
}
</script>
