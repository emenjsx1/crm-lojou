import { defineStore } from 'pinia'
import type { EvoMessage } from '~/composables/useEvolution'

export interface Message {
  id: string | number
  contact_id: number | string
  evo_id?: string
  content: string
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error'
  timestamp: string
  is_outgoing: boolean
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  mediaBase64?: string
  mediaUrl?: string
  mimeType?: string
  caption?: string
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
    messages: [] as Message[],
    loading: false
  }),
  getters: {
    getMessagesByContact: (state) => (contactId: number | string) => {
      return [...state.messages.filter(m => m.contact_id == contactId)]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    }
  },
  actions: {
    // Adiciona mensagem saída optimista ao store e devolve o ID
    addOutgoing(
      contactId: number | string,
      content: string,
      type: Message['type'] = 'text',
      media?: Pick<Message, 'mediaBase64' | 'mediaUrl' | 'mimeType' | 'caption'>
    ): number {
      const id = Date.now()
      this.messages.push({
        id,
        contact_id: contactId,
        content,
        status: 'sending',
        timestamp: new Date().toISOString(),
        is_outgoing: true,
        type,
        ...media
      })
      return id
    },

    updateStatus(msgId: number | string, status: Message['status']) {
      const msg = this.messages.find(m => m.id === msgId)
      if (msg) msg.status = status
    },

    // Sincroniza mensagens vindas da Evolution (sem duplicados)
    syncFromEvolution(contactId: number | string, evoMessages: EvoMessage[]) {
      const existingEvoIds = new Set(
        this.messages.map(m => m.evo_id).filter(Boolean)
      )

      for (const em of evoMessages) {
        // Já existe — skip
        if (em.evoId && existingEvoIds.has(em.evoId)) continue

        // Verifica se é uma mensagem optimista local que já foi confirmada
        const optimistic = this.messages.find(m =>
          m.contact_id == contactId &&
          !m.evo_id &&
          m.is_outgoing === em.fromMe &&
          m.content === em.content &&
          Math.abs(new Date(m.timestamp).getTime() - em.timestamp) < 30000
        )

        if (optimistic) {
          optimistic.evo_id = em.evoId
          optimistic.status = EVO_STATUS_MAP[em.status] || 'delivered'
          existingEvoIds.add(em.evoId)
          continue
        }

        this.messages.push({
          id: em.evoId,
          evo_id: em.evoId,
          contact_id: contactId,
          content: em.content,
          status: EVO_STATUS_MAP[em.status] || 'delivered',
          timestamp: new Date(em.timestamp).toISOString(),
          is_outgoing: em.fromMe,
          type: em.type,
          mediaBase64: em.mediaBase64,
          mediaUrl: em.mediaUrl,
          mimeType: em.mimeType,
          caption: em.caption
        })
        existingEvoIds.add(em.evoId)
      }
    },

    clearContact(contactId: number | string) {
      this.messages = this.messages.filter(m => m.contact_id != contactId)
    }
  }
})
