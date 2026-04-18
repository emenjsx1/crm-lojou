<template>
  <div class="flex flex-col h-[calc(100vh-6rem)] relative">
    <!-- Header -->
    <div class="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-white">Mensagens</h2>
      <div class="flex flex-wrap items-center gap-2">
        <button
          @click="refreshChats"
          class="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg text-sm font-semibold transition-all"
        >
          <Icon name="ph:arrows-clockwise-bold" class="w-4 h-4" />
          <span class="hidden xs:inline">Actualizar</span>
        </button>
        <label class="hidden sm:inline text-sm font-medium text-zinc-600 dark:text-zinc-400 shrink-0">Assinatura:</label>
        <div class="relative flex-1 min-w-[140px]">
          <Icon name="ph:pen-nib-bold" class="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            v-model="agentSignature"
            type="text"
            placeholder="Ex: - *Suporte Lojou*"
            class="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#FF009D]"
          />
        </div>
      </div>
    </div>

    <!-- Interface -->
    <div class="flex flex-1 bg-white dark:bg-[#09090b] rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm relative h-full">
      <ContactList
        :contacts="activeConversations"
        :active-contact-id="activeContact?.id"
        class="w-full lg:w-80"
        :class="{ 'hidden lg:flex': activeContact }"
        @select="selectContact"
        @open-search="showSearchModal = true"
        @new-chat="onNewChat"
      />
      <ChatWindow
        :contact="activeContact"
        :messages="activeMessages"
        :sending="sending"
        class="flex-1"
        :class="{ 'hidden lg:flex': !activeContact }"
        @send="onSendText"
        @send-media="onSendMedia"
        @delete-message="onDeleteMessage"
        @back="activeContact = null"
        @user-found="onUserFound"
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
import { useSupabaseClient } from '#imports'
import { useContactStore } from '~/stores/contacts'
import { useMessageStore } from '~/stores/messages'
import { useApi } from '~/composables/useApi'
import { useEvolution } from '~/composables/useEvolution'

const contactsStore = useContactStore()
const messagesStore = useMessageStore()
const { api } = useApi()
const evo = useEvolution()

// ── Estado ───────────────────────────────────────────────────────────────────
const agentSignature = ref('')
const activeContact = ref<any | null>(null)
const sending = ref(false)
const chats = ref<any[]>([])                  // lista de conversas (Evolution)
let pollTimer: any = null                       // polling do chat activo
let chatsPollTimer: any = null                  // polling da lista de chats
let realtimeChannel: any = null                 // Supabase Realtime

// Search modal
const showSearchModal = ref(false)
const globalSearchQuery = ref('')
const searchResults = ref<any[]>([])
const searchLoading = ref(false)
let debounceTimer: any = null

// ── Helpers ───────────────────────────────────────────────────────────────────
const buildJid = (raw: string | null | undefined): string => {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  const full = digits.length === 9 && digits.startsWith('8') ? `258${digits}` : digits
  return `${full}@s.whatsapp.net`
}

const getContactJid = (contact: any): string => {
  const jid = String(contact?.remote_jid || '')
  if (jid.includes('@')) return jid
  const phone = String(contact?.phone_number || contact?.phone || contact?.whatsapp || '')
  return buildJid(phone)
}

const getContactPhone = (contact: any): string =>
  String(contact?.phone_number || contact?.phone || contact?.whatsapp || '')

// ── Normalizar phone para match (remove DDI 258) ─────────────────────────────
const normalizePhone = (raw: string) => String(raw || '').replace(/\D/g, '').replace(/^258/, '')

// ── Match com Lojou: retorna o utilizador Lojou ou null ─────────────────────
const findLojouUser = (jidPhone: string) => {
  const local = normalizePhone(jidPhone) // ex: "855253617"
  if (!local || local.length < 7) return null
  return contactsStore.contacts.find((c: any) => {
    // A Lojou pode retornar phone_number, mobile_number, ou phone
    const raw = c.phone_number || c.mobile_number || c.phone || ''
    const cp = normalizePhone(String(raw))
    return cp.length >= 7 && cp === local
  }) || null
}

// ── Carregar chats do Supabase (via webhook) + match Lojou ───────────────────
// O webhook guarda cada mensagem → Supabase é a fonte da verdade para a sidebar
const loadChats = async () => {
  try {
    const supabase = useSupabaseClient()

    // 1. Buscar JIDs com mensagens, ordenados pela última mensagem
    const { data: msgs } = await (supabase as any)
      .from('messages')
      .select('remote_jid, content, timestamp, is_outgoing')
      .order('timestamp', { ascending: false })
      .limit(300)

    if (!msgs || msgs.length === 0) return

    // 2. Agrupar por remote_jid — primeira ocorrência = mais recente
    const seen = new Map<string, any>()
    for (const m of msgs) {
      if (!m.remote_jid) continue
      if (!seen.has(m.remote_jid)) seen.set(m.remote_jid, m)
    }

    // 3. Para cada JID, buscar nome no contacto Supabase e match Lojou
    const { data: contacts } = await (supabase as any)
      .from('contacts')
      .select('remote_jid, name, phone')

    const contactMap = new Map<string, any>()
    for (const c of (contacts || [])) {
      if (c.remote_jid) contactMap.set(c.remote_jid, c)
    }

    // 4. Construir lista final
    chats.value = Array.from(seen.values()).map(m => {
      const jid = m.remote_jid
      const phone = jid.split('@')[0]
      const dbContact = contactMap.get(jid)
      const lojou = findLojouUser(phone)

      return {
        id: jid,
        remote_jid: jid,
        name: lojou
          ? (lojou.full_name || lojou.firstname || lojou.name)
          : (dbContact?.name || phone),
        phone_number: phone,
        lastMessage: m.content || '',
        lastMessageTime: m.timestamp || new Date().toISOString(),
        user_id: lojou?.id || null,
        // Passar objecto users completo → ChatWindow não mostra banner "Lead"
        users: lojou ? {
          id: lojou.id,
          name: lojou.full_name || lojou.firstname || lojou.name,
          balance: lojou.balance || 0,
          status: lojou.status || 'active'
        } : null
      }
    })
  } catch (e) {
    console.warn('[CHATS] Falha ao carregar chats:', e)
  }
}

const refreshChats = () => loadChats()

// ── Seleccionar contacto e carregar histórico ────────────────────────────────
const selectContact = async (contact: any) => {
  clearInterval(pollTimer)
  activeContact.value = contact

  const jid = getContactJid(contact)
  if (!jid) return

  // Limpar mensagens anteriores e carregar do Evolution
  messagesStore.clearJid(jid)

  const phone = jid.split('@')[0]
  try {
    const msgs = await evo.fetchHistory(jid, 60)
    if (msgs.length > 0) {
      messagesStore.loadFromEvolution(jid, msgs)
    }
  } catch (e) {
    console.warn('[SELECT] Erro ao carregar histórico:', e)
  }

  // Polling do chat activo (a cada 4s)
  pollTimer = setInterval(async () => {
    if (!activeContact.value) return
    const currentJid = getContactJid(activeContact.value)
    try {
      const msgs = await evo.fetchHistory(currentJid, 30)
      if (msgs.length > 0) {
        messagesStore.loadFromEvolution(currentJid, msgs)
      }
    } catch (e) {
      console.warn('[POLL CHAT] Erro:', e)
    }
  }, 4000)
}

// ── Computed ──────────────────────────────────────────────────────────────────
const activeConversations = computed(() => chats.value)

const activeMessages = computed(() => {
  if (!activeContact.value) return []
  const jid = getContactJid(activeContact.value)
  return messagesStore.getMessagesByJid(jid)
})

// ── Envio de texto ────────────────────────────────────────────────────────────
const onSendText = async (content: string, quotedId?: string) => {
  if (!activeContact.value || sending.value) return
  const phone = getContactPhone(activeContact.value) || activeContact.value?.remote_jid?.split('@')[0]
  if (!phone) return

  const finalContent = agentSignature.value.trim()
    ? `${content}\n\n${agentSignature.value.trim()}`
    : content

  const jid = getContactJid(activeContact.value)
  const localId = messagesStore.addOutgoing(jid, finalContent)
  sending.value = true

  try {
    const res = await evo.sendText(phone, finalContent, quotedId)
    const realId = res?.key?.id || res?.id
    if (realId) messagesStore.confirmOutgoing(localId, jid, realId)
  } catch (err: any) {
    console.error('[SEND TEXT]', err?.response?.data || err?.message)
    messagesStore.updateStatus(localId, 'error')
  } finally {
    sending.value = false
  }
}

// ── Envio de media ────────────────────────────────────────────────────────────
const onSendMedia = async (opts: {
  type: 'image' | 'audio' | 'video' | 'document'
  base64: string
  filename: string
  mimeType: string
  caption?: string
}) => {
  if (!activeContact.value || sending.value) return
  const phone = getContactPhone(activeContact.value) || activeContact.value?.remote_jid?.split('@')[0]
  if (!phone) return

  const jid = getContactJid(activeContact.value)
  const previewContent = opts.caption || (opts.type === 'image' ? '[Imagem]' : opts.type === 'audio' ? '[Áudio]' : '[Ficheiro]')
  const localId = messagesStore.addOutgoing(jid, previewContent, opts.type)
  sending.value = true

  try {
    const res = await evo.sendMedia(phone, opts)
    const realId = res?.key?.id || res?.id
    if (realId) messagesStore.confirmOutgoing(localId, jid, realId)
  } catch (err: any) {
    console.error('[SEND MEDIA]', err?.response?.data || err?.message)
    messagesStore.updateStatus(localId, 'error')
  } finally {
    sending.value = false
  }
}

// ── Apagar mensagem ───────────────────────────────────────────────────────────
const onDeleteMessage = async (msgId: string) => {
  try {
    await evo.deleteMessage(msgId)
    const jid = activeContact.value ? getContactJid(activeContact.value) : ''
    if (jid) {
      messagesStore.clearJid(jid)
      const msgs = await evo.fetchHistory(jid, 30)
      if (msgs.length > 0) messagesStore.loadFromEvolution(jid, msgs)
    }
  } catch (err) {
    console.error('[DELETE]', err)
  }
}

// ── User found (Lojou check) ──────────────────────────────────────────────────
const onUserFound = (_userData: any) => { /* futuro */ }

// ── Assinatura ────────────────────────────────────────────────────────────────
watch(agentSignature, (val) => {
  if (typeof window !== 'undefined') localStorage.setItem('lojou_agent_signature', val)
})

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  if (typeof window !== 'undefined') {
    agentSignature.value = localStorage.getItem('lojou_agent_signature') || ''
  }

  // 1. Carregar contactos Lojou primeiro (necessário para o match na sidebar)
  if (contactsStore.contacts.length === 0) {
    await contactsStore.fetchContacts({ is_paginate: true, per_page: 500, page: 1 })
  }

  // 2. Carregar chats da Evolution (agora com match Lojou)
  await loadChats()

  // 3. Polling da lista de chats a cada 15s
  chatsPollTimer = setInterval(async () => {
    try { await loadChats() } catch (e) { console.warn('[CHATS POLL]', e) }
  }, 15000)

  // 4. Supabase Realtime — recebe mensagens em tempo real via webhook
  const supabase = useSupabaseClient()
  realtimeChannel = supabase
    .channel('messages-rt')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
      const m = payload.new
      if (!m?.remote_jid || !m?.id) return

      const jid = m.remote_jid

      // Adicionar ao store in-memory
      messagesStore.upsertIntoStore({
        id: m.message_id || m.id,
        remote_jid: jid,
        content: m.content || '',
        status: m.status || 'delivered',
        timestamp: m.timestamp || new Date().toISOString(),
        is_outgoing: Boolean(m.is_outgoing),
        type: m.type || 'text',
        mediaUrl: m.media_url,
        mimeType: m.mime_type,
        caption: m.caption
      })

      // Actualizar última mensagem da sidebar
      const chatIdx = chats.value.findIndex(c => c.remote_jid === jid)
      if (chatIdx >= 0) {
        chats.value[chatIdx].lastMessage = m.content || ''
        chats.value[chatIdx].lastMessageTime = m.timestamp || new Date().toISOString()
        // Mover para o topo
        const updated = chats.value.splice(chatIdx, 1)[0]
        chats.value.unshift(updated)
      } else {
        // Chat novo — recarregar lista
        loadChats()
      }
    })
    .subscribe()
})

onUnmounted(() => {
  clearInterval(pollTimer)
  clearInterval(chatsPollTimer)
  if (realtimeChannel) realtimeChannel.unsubscribe()
})

// ── Search Modal ──────────────────────────────────────────────────────────────
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
      let list: any[] = []
      if (data?.users && Array.isArray(data.users)) list = data.users
      else if (data?.data && Array.isArray(data.data)) list = data.data
      else if (Array.isArray(data)) list = data
      searchResults.value = list
    } catch {
      const q2 = q.trim().toLowerCase()
      searchResults.value = contactsStore.contacts.filter((c: any) =>
        (c.full_name || c.name || '').toLowerCase().includes(q2) ||
        (c.email || '').toLowerCase().includes(q2) ||
        (c.phone_number || '').includes(q2)
      )
    } finally {
      searchLoading.value = false
    }
  }, 400)
})

watch(showSearchModal, async (open) => {
  if (open) {
    globalSearchQuery.value = ''
    if (contactsStore.contacts.length > 0) {
      searchResults.value = [...contactsStore.contacts.slice(0, 25)] as any[]
    } else {
      searchLoading.value = true
      await contactsStore.fetchContacts({ is_paginate: true, per_page: 100, page: 1 })
      searchResults.value = [...contactsStore.contacts.slice(0, 25)] as any[]
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
  selectContact({
    ...user,
    name: user.full_name || user.firstname || user.name,
    phone_number: user.phone_number || user.phone,
    remote_jid: buildJid(user.phone_number || user.phone)
  })
}

const onNewChat = (phone: string) => {
  const cleanPhone = phone.replace(/\D/g, '')
  if (!cleanPhone) return
  selectContact({
    id: 'local_' + Date.now(),
    phone_number: cleanPhone,
    name: cleanPhone,
    remote_jid: buildJid(cleanPhone)
  })
}

// ── Sync all (mantido para compatibilidade com botão) ─────────────────────────
const syncAll = refreshChats
</script>
