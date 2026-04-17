<template>
  <div class="flex flex-col h-[calc(100vh-6rem)] relative">
    <!-- Header -->
    <div class="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <h2 class="text-xl font-semibold text-zinc-900 dark:text-white">Mensagens</h2>
      <div class="flex flex-wrap items-center gap-2">
        <button
          @click="syncAll"
          :disabled="syncingAll"
          class="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
        >
          <Icon :name="syncingAll ? 'ph:spinner-gap-bold' : 'ph:arrows-clockwise-bold'" class="w-4 h-4" :class="{ 'animate-spin': syncingAll }" />
          <span class="hidden xs:inline">{{ syncingAll ? 'A sincronizar...' : 'Sincronizar Tudo' }}</span>
          <span class="xs:hidden">{{ syncingAll ? '...' : 'Sync' }}</span>
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
import { useSupabaseClient, useHead, useRuntimeConfig } from '#imports'
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
      
      // Tentar encontrar o contato no nosso store de forma rigorosa
      let contact = contactsStore.contacts.find(c => {
        const rawVal = c.phone_number || c.phone || c.whatsapp || ''
        const cPhone = String(rawVal).replace(/\D/g, '')
        if (cPhone.length < 7 || phone.length < 7) return false
        
        return cPhone === phone || 
               cPhone === '258' + phone || 
               '258' + cPhone === phone ||
               cPhone.endsWith(phone.substring(1)) // Safe suffix match for varying DDIs
      })

      if (!contact) {
        contact = {
          id: 'ext_' + phone,
          phone_number: phone,
          name: chat.name || phone,
          full_name: chat.name || phone,
          email: ''
        }
      }

      if (contact) {
        // Buscar histórico (últimas 40 mensagens de cada)
        const history = await evo.fetchHistory(phone, 40)
        if (history && (history as any[]).length > 0) {
          await messagesStore.syncFromEvolution(phone, history)
          markContactAsMessaged(contact)
        }
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
let channel: any = null
let supabase: any = null
const POLL_INTERVAL = 4000 // 4 segundos
let globalPollFailCount = 0
const GLOBAL_POLL_MAX_FAILS = 5

onMounted(async () => {
  if (typeof window !== 'undefined') {
    agentSignature.value = localStorage.getItem('lojou_agent_signature') || ''
  }
  if (contactsStore.contacts.length === 0) {
    contactsStore.fetchContacts({ is_paginate: true, per_page: 100, page: 1 })
  }

  // Polling Global para novas mensagens em qualquer chat (a cada 5s)
  globalPollTimer = setInterval(async () => {
    try {
      const updatedChats = await evo.fetchChats()
      if (updatedChats?.length > 0) {
        // Sincroniza os 15 chats mais recentes
        for (const chat of updatedChats.slice(0, 15)) {
          const phone = (chat.id || chat.remoteJid || '').split('@')[0]
          if (!phone || phone.includes('status') || phone.includes('@')) continue

          // Normalização agressiva: drop prefixo 258 se existir
          const normalizePhone = (raw: string) => {
            let s = String(raw).replace(/\D/g, '')
            if (s.startsWith('258') && s.length > 9) s = s.slice(3)
            return s
          }
          const chatPhone = normalizePhone(phone)
          if (chatPhone.length < 7) continue

          // Matching estrito: os dois números normalizados precisam ser iguais
          // ou um deve ser o outro com DDI na frente (ex: 258 + 841234567)
          // Matching estrito: os dois números normalizados precisam ser iguais
          // ou um deve ser o outro com DDI na frente (ex: 258 + 841234567)
          const matched = contactsStore.contacts.find(c => {
            const rawVal = c.phone_number || c.phone || (c as any).whatsapp || (c as any).phone_whatsapp
            if (!rawVal) return false
            const cPhone = normalizePhone(String(rawVal)).replace(/\D/g, '')
            if (cPhone.length < 7) return false
            
            // Match estrito: evita casamentos falsos com números vazios ou curtos
            return cPhone === chatPhone || 
                   cPhone === '258' + chatPhone || 
                   '258' + cPhone === chatPhone
          })

          // Se encontramos um contato oficial da Lojou, usamos o ID dele.
          // Se não, ignoramos para não criar contatos "fantasmas" no polling global.
          // O usuário pode criar um contato manual via "Novo Chat".
          if (!matched) continue

          const msgs = await evo.fetchHistory(phone, 12)
          if (msgs && (msgs as any[]).length > 0) {
            await messagesStore.syncFromEvolution(chatPhone, msgs)
            
            // Se as mensagens novas chegarem, atualizamos a lista de "recentes" se necessário
            const isRecent = recentChats.value.some(rc => String(rc.id) === String(matched.id))
            if (!isRecent) {
               markContactAsMessaged(matched)
            }
          }
        }
      }
      globalPollFailCount = 0
    } catch (e) {
      globalPollFailCount++
      console.warn(`[POLLING AUDIT] Falha ${globalPollFailCount}/${GLOBAL_POLL_MAX_FAILS}:`, e)
      if (globalPollFailCount >= GLOBAL_POLL_MAX_FAILS) {
        console.error('[POLLING AUDIT] Polling desativado após 5 falhas consecutivas — verifique a conexão Evolution')
        clearInterval(globalPollTimer)
        globalPollTimer = null
      }
    }
  }, 10000) // Aumentado para 10s já que agora temos Realtime para agilidade

  // SUPABASE REALTIME SUBSCRIPTION
  supabase = useSupabaseClient()

  // Carregar lista inicial do Supabase
  await loadRecentChats()

  channel = supabase.channel('messages-realtime')
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages' 
    }, async (payload) => {
      const newMsg = payload.new
      const msgJid = newMsg.remote_jid
      
      if (!msgJid) return
      console.log(`[REALTIME] Nova mensagem: ${newMsg.id} para JID: ${msgJid}`)

      // 1. Atualizar histórico se for o contacto activo
      if (activeContact.value?.remote_jid === msgJid) {
        await messagesStore.fetchFromSupabase(msgJid)
      }

      // 2. Recarregar lista de contactos do Supabase (inclui novos leads)
      await loadRecentChats()

      // 3. Notificação de Lead para mensagens recebidas (não enviadas)
      if (!newMsg.is_outgoing) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('id, user_id, name, remote_jid, phone')
          .eq('remote_jid', msgJid)
          .maybeSingle()

        const toast = useToast()
        toast.add({
          title: contact?.user_id ? '💬 Nova Mensagem' : '🆕 Novo Lead!',
          description: `Mensagem de ${contact?.name || msgJid.split('@')[0]}`,
          icon: contact?.user_id ? 'i-heroicons-chat-bubble-left' : 'i-heroicons-user-plus',
          color: contact?.user_id ? 'emerald' : 'amber',
          timeout: 6000,
          actions: [{
            label: 'Atender',
            click: () => contact ? selectContact(contact) : onNewChat(msgJid.split('@')[0])
          }]
        })
      }
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'contacts'
    }, async () => {
      // Novo contacto criado pelo webhook → actualizar lista imediatamente
      await loadRecentChats()
    })
    .subscribe()
})

onUnmounted(() => {
  clearInterval(pollTimer)
  clearInterval(globalPollTimer)
  if (channel) {
    channel.unsubscribe()
  }
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

// Lista de conversas: carrega do Supabase contacts table (não do localStorage)
// Assim qualquer contacto criado via webhook aparece imediatamente
const recentChats = ref<any[]>([])

const loadRecentChats = async () => {
  if (!supabase) supabase = useSupabaseClient()
  
  // 1. Tentar carregar da tabela de contatos
  const { data: contactRows } = await supabase
    .from('contacts')
    .select('*, users(*)')
    .order('created_at', { ascending: false })
    .limit(50)
  
  let merged: any[] = contactRows || []

  // 2. Fallback/Complemento: Se não houver contatos ou poucos contatos, 
  // buscar pelos JIDs das mensagens recentes (garante que chats "órfãos" apareçam)
  if (merged.length < 15) {
    const { data: recentMsgs } = await supabase
      .from('messages')
      .select('remote_jid')
      .order('timestamp', { ascending: false })
      .limit(100)
    
    if (recentMsgs) {
      const uniqueJids = [...new Set(recentMsgs.map(m => m.remote_jid).filter(Boolean))]
      for (const jid of uniqueJids) {
        if (!merged.find(c => c.remote_jid === jid)) {
          merged.push({ 
            id: 'orphan_' + jid, 
            remote_jid: jid, 
            phone: jid.split('@')[0],
            name: jid.split('@')[0],
            metadata: { source: 'orphan' } 
          })
        }
      }
    }
  }

  if (merged.length > 0) {
    const enriched = await Promise.all(merged.map(async (c: any) => {
      // Normalização agressiva para busca e deduplicação
      const getPhone = (j: string) => j.split('@')[0].replace(/\D/g, '').replace(/^258/, '')
      const phoneLocal = getPhone(c.remote_jid || '')
      
      // Padronizar JID para busca de mensagens
      const standardJid = '258' + phoneLocal + '@s.whatsapp.net'

      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, timestamp, is_outgoing')
        .eq('remote_jid', standardJid)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      return {
        ...c,
        phoneLocal,
        remote_jid: standardJid,
        lastMessage: lastMsg?.content || '...',
        lastMessageTime: lastMsg?.timestamp || c.created_at || new Date().toISOString()
      }
    }))

    // ── DEDUPLICAÇÃO FINAL NA SIDEBAR ────────────────────────────────
    // Agrupar por phoneLocal e ficar com o que tiver mensagem mais recente
    const dedupedMap = new Map()
    for (const chat of enriched) {
      if (!dedupedMap.has(chat.phoneLocal) || 
          new Date(chat.lastMessageTime) > new Date(dedupedMap.get(chat.phoneLocal).lastMessageTime)) {
        dedupedMap.set(chat.phoneLocal, chat)
      }
    }
    
    recentChats.value = Array.from(dedupedMap.values()).sort(
      (a: any, b: any) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    )
  }
}

const activeConversations = computed(() => {
  if (!recentChats.value) return []
  return recentChats.value
})

// Mensagens do contacto activo — ordenadas por JID
const activeMessages = computed(() => {
  if (!activeContact.value) return []
  const p = activeContact.value.remote_jid || activeContact.value.phone_number || activeContact.value.phone || activeContact.value.whatsapp || ''
  const jid = p.includes('@') ? p : `${String(p).replace(/\D/g, '')}@s.whatsapp.net`
  return messagesStore.getMessagesByJid(jid)
})

// Selecciona contacto e carrega histórico
const selectContact = async (contact: any) => {
  const phoneRaw = contact.phone_number || contact.phone || contact.whatsapp
  if (!phoneRaw) return

  const normalizedPhone = String(phoneRaw).replace(/\D/g, '')
  const jid = phoneRaw.includes('@') ? phoneRaw : `${normalizedPhone}@s.whatsapp.net`

  // Buscar dados completos do contacto no Supabase usando o IDENTIFICADOR ÚNICO (remoteJid)
  const { data: fullContact } = await supabase
    .from('contacts')
    .select('*, users(*)')
    .eq('remote_jid', jid)
    .maybeSingle()

  if (fullContact) {
    activeContact.value = { ...contact, ...fullContact }
  } else {
    // Se não existir, garantir que temos pelo menos o JID correto para o store
    activeContact.value = { ...contact, remote_jid: jid }
  }

  clearInterval(pollTimer)

  // Primeiro carrega o que já temos no Supabase (offline/cache)
  await messagesStore.fetchFromSupabase(jid)

  // Depois sincroniza o histórico mais recente da Evolution
  const history = await evo.fetchHistory(normalizedPhone)
  if (history.length > 0) {
    await messagesStore.syncFromEvolution(jid, history)
    markContactAsMessaged(activeContact.value)
  }

  // Polling para o contacto activo
  pollTimer = setInterval(async () => {
    if (!activeContact.value) return
    const currentJid = activeContact.value.remote_jid
    try {
      const msgs = await evo.fetchHistory(normalizedPhone, 20)
      if (msgs.length > 0) {
        await messagesStore.syncFromEvolution(currentJid, msgs)
      }
    } catch (e) {
      console.warn('[POLLING CHAT] Falha ao buscar histórico:', e)
    }
  }, POLL_INTERVAL)
}

onUnmounted(() => {
  clearInterval(pollTimer)
})

// Quando o ChatWindow identifica o utilizador na Lojou, actualiza o contacto activo
const onUserFound = async (userData: { id: string, name: string, balance: number }) => {
  if (!activeContact.value) return

  const jid = activeContact.value.remote_jid
  if (!jid) return

  // Recarregar dados completos do contacto (agora já tem user_id)
  const { data: updatedContact } = await supabase
    .from('contacts')
    .select('*, users(*)')
    .eq('remote_jid', jid)
    .maybeSingle()

  if (updatedContact) {
    // Reactualizar contacto activo — o banner de "Lead" vai desaparecer automaticamente
    activeContact.value = { ...activeContact.value, ...updatedContact }
  }
}

const onDeleteMessage = async (msgId: string) => {
  try {
    await evo.deleteMessage(msgId)
    const jid = activeContact.value?.remote_jid
    if (jid) {
      messagesStore.clearJid(jid) 
      await messagesStore.fetchFromSupabase(jid)
    }
  } catch (err) {
    console.error('[DELETE MESSAGE] Erro:', err)
  }
}

// Envio de texto
const onSendText = async (content: string, quotedId?: string) => {
  if (!activeContact.value || sending.value) return

  const rawPhone = activeContact.value.phone_number || activeContact.value.phone || activeContact.value.whatsapp || ''
  if (!rawPhone) return

  const finalContent = agentSignature.value.trim()
    ? `${content}\n\n${agentSignature.value.trim()}`
    : content

  sending.value = true
  // ID local temporário vinculado ao JID
  const jid = activeContact.value.remote_jid
  const localId = messagesStore.addOutgoing(jid, finalContent, 'text')

  try {
    const res = await evo.sendText(rawPhone, finalContent, quotedId)
    const messageId = res.key?.id || res.id
    
    if (messageId) {
      await messagesStore.addAndSaveOutgoing({
        localId,
        messageId,
        jid,
        content: finalContent,
        type: 'text'
      })
    }
    markContactAsMessaged(activeContact.value)
  } catch (err: any) {
    console.error('[SEND TEXT]', err?.response?.data || err.message)
    messagesStore.updateStatus(localId, 'error')
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

  const jid = activeContact.value.remote_jid
  const previewContent = opts.caption || (opts.type === 'image' ? '[Imagem]' : opts.type === 'audio' ? '[Áudio]' : '[Ficheiro]')
  const localId = messagesStore.addOutgoing(jid, previewContent, opts.type, {
    mimeType: opts.mimeType,
    caption: opts.caption
  })

  try {
    const res = await evo.sendMedia(rawPhone, { ...opts, quotedId: (opts as any).quotedId })
    const messageId = res.key?.id || res.id
    
    if (messageId) {
      await messagesStore.addAndSaveOutgoing({
        localId,
        messageId,
        jid,
        content: previewContent,
        type: opts.type,
        mimeType: opts.mimeType,
        caption: opts.caption
      })
    }
    markContactAsMessaged(activeContact.value)
  } catch (err: any) {
    console.error('[SEND MEDIA]', err?.response?.data || err.message)
    messagesStore.updateStatus(localId, 'error')
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
  selectContact(user)
}

const onNewChat = (phone: string) => {
  const cleanPhone = phone.replace(/\D/g, '')
  if (!cleanPhone) return

  // Tenta encontrar um contato existente com esse telefone antes de criar um novo
  const existing = contactsStore.contacts.find(c => {
    const cPhone = String(c.phone_number || c.phone || (c as any).whatsapp || '').replace(/\D/g, '')
    return cPhone === cleanPhone || cPhone.endsWith(cleanPhone) || cleanPhone.endsWith(cPhone)
  })

  if (existing) {
    selectContact(existing)
    return
  }

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
