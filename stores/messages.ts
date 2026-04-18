import { defineStore } from 'pinia'
import type { EvoMessage } from '~/composables/useEvolution'

// Store in-memory puro — sem Supabase para display
// A fonte da verdade é a Evolution API directamente

export interface Message {
  id: string
  remote_jid: string
  content: string
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error'
  timestamp: string
  is_outgoing: boolean
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  mediaUrl?: string
  mimeType?: string
  caption?: string
  pushName?: string
}

const EVO_STATUS_MAP: Record<string, Message['status']> = {
  READ: 'read',
  DELIVERY_ACK: 'delivered',
  SERVER_ACK: 'sent',
  PENDING: 'sending',
  ERROR: 'error'
}

export const useMessageStore = defineStore('messages', {
  state: () => ({
    messagesByJid: {} as Record<string, Message[]>,
    loading: false
  }),

  getters: {
    getMessagesByJid: (state) => (jid: string): Message[] => {
      if (!jid) return []
      return (state.messagesByJid[jid] || [])
        .slice()
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    }
  },

  actions: {
    upsertIntoStore(msg: Message) {
      if (!msg.remote_jid || !msg.id) return
      const jid = msg.remote_jid
      if (!this.messagesByJid[jid]) this.messagesByJid[jid] = []
      const list = this.messagesByJid[jid]
      const idx = list.findIndex(m => m.id === msg.id)
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...msg }
      } else {
        list.push(msg)
      }
    },

    // Adiciona mensagem optimista local (antes de enviar)
    addOutgoing(jid: string, content: string, type: Message['type'] = 'text'): string {
      const id = 'local_' + Date.now()
      this.upsertIntoStore({
        id,
        remote_jid: jid,
        content,
        status: 'sending',
        timestamp: new Date().toISOString(),
        is_outgoing: true,
        type
      })
      return id
    },

    // Confirma mensagem enviada com ID real da Evolution
    confirmOutgoing(localId: string, jid: string, realId: string) {
      const list = this.messagesByJid[jid] || []
      const msg = list.find(m => m.id === localId)
      if (msg) {
        msg.id = realId
        msg.status = 'sent'
      }
    },

    // Carrega mensagens da Evolution para o store (in-memory)
    loadFromEvolution(jid: string, evoMessages: EvoMessage[]) {
      for (const em of evoMessages) {
        if (!em.evoId) continue
        this.upsertIntoStore({
          id: em.evoId,
          remote_jid: jid, // usar o JID canónico da conversa
          content: em.content,
          status: EVO_STATUS_MAP[em.status] || 'delivered',
          timestamp: new Date(em.timestamp).toISOString(),
          is_outgoing: em.fromMe,
          type: em.type,
          mediaUrl: em.mediaUrl,
          mimeType: em.mimeType,
          caption: em.caption,
          pushName: em.pushName
        })
      }
    },

    clearJid(jid: string) {
      delete this.messagesByJid[jid]
    },

    updateStatus(id: string, status: Message['status']) {
      for (const jid of Object.keys(this.messagesByJid)) {
        const found = this.messagesByJid[jid]?.find(m => m.id === id)
        if (found) { found.status = status; return }
      }
    }
  }
})
