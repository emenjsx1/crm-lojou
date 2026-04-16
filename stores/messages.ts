import { defineStore } from 'pinia'
import { useSupabaseClient } from '#imports'
import type { EvoMessage } from '~/composables/useEvolution'
// Supabase client handles auto-import in Nuxt, but we can be explicit if needed for linting
// or use the global composable inside actions.

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
    // Agrupamos mensagens por NÚMERO DE TELEFONE (o único ID real e único do WhatsApp)
    messagesByPhone: {} as Record<string, Message[]>,
    loading: false
  }),
  getters: {
    getMessagesByPhone: (state) => (phone: string) => {
      if (!phone) return []
      const p = phone.replace(/\D/g, '')
      return (state.messagesByPhone[p] || [])
        .slice()
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    },
    getLatestMessageByPhone: (state) => (phone: string) => {
      if (!phone) return null
      const p = phone.replace(/\D/g, '')
      const msgs = state.messagesByPhone[p] || []
      if (msgs.length === 0) return null
      return msgs.reduce((prev, current) => 
        new Date(current.timestamp) > new Date(prev.timestamp) ? current : prev
      )
    }
  },
  actions: {
    // Helper interno para inserir/atualizar sem duplicados por telefone
    upsertIntoStore(msg: Message) {
      // Garantimos que o contact_id aqui é sempre o telefone (ID estável do WhatsApp)
      const phoneId = String(msg.contact_id).replace(/\D/g, '')
      if (!this.messagesByPhone[phoneId]) {
        this.messagesByPhone[phoneId] = []
      }
      
      const list = this.messagesByPhone[phoneId]
      const index = list.findIndex(m => m.id === msg.id)
      
      if (index !== -1) {
        list[index] = { ...list[index], ...msg }
      } else {
        list.push(msg)
      }
    },

    addOutgoing(
      phone: string,
      content: string,
      type: Message['type'] = 'text',
      media?: Pick<Message, 'mediaBase64' | 'mediaUrl' | 'mimeType' | 'caption'>
    ): number | string {
      const id = 'local_' + Date.now()
      this.upsertIntoStore({
        id,
        contact_id: phone.replace(/\D/g, ''),
        content,
        status: 'sending',
        timestamp: new Date().toISOString(),
        is_outgoing: true,
        type,
        ...media
      })
      return id
    },

    async addAndSaveOutgoing(params: {
      localId: number | string,
      evoId: string,
      phone: string,
      content: string,
      type: Message['type'],
      mediaUrl?: string,
      mimeType?: string,
      caption?: string
    }) {
      const client = useSupabaseClient()
      const p = params.phone.replace(/\D/g, '')
      
      // Atualiza no store local
      const list = this.messagesByPhone[p] || []
      const msg = list.find(m => m.id === params.localId)
      if (msg) {
        msg.id = params.evoId
        msg.evo_id = params.evoId
        msg.status = 'sent'
      }

      const payload = {
        id: params.evoId,
        contact_id: p, // Salva pelo telefone para isolamento
        content: params.content,
        type: params.type,
        is_outgoing: true,
        status: 'sent',
        timestamp: new Date().toISOString(),
        media_url: params.mediaUrl,
        mime_type: params.mimeType,
        caption: params.caption
      }

      try {
        await (client.from('messages') as any).upsert(payload, { onConflict: 'id, contact_id' })
      } catch (e) {
        console.error('[STORE] Falha ao persistir envio:', e)
      }
    },

    updateStatus(msgId: number | string, status: Message['status'], phone?: string) {
      if (phone) {
        const p = phone.replace(/\D/g, '')
        const list = this.messagesByPhone[p] || []
        const msg = list.find(m => m.id === msgId || m.evo_id === msgId)
        if (msg) msg.status = status
      } else {
        Object.values(this.messagesByPhone).forEach(list => {
          const msg = list.find(m => m.id === msgId || m.evo_id === msgId)
          if (msg) msg.status = status
        })
      }
    },

    async syncFromEvolution(phone: string, evoMessages: EvoMessage[]) {
      const client = useSupabaseClient()
      const p = phone.replace(/\D/g, '')
      const toUpsert: any[] = []

      for (const em of evoMessages) {
        if (!em.evoId) continue

        // Procura optimista
        const list = this.messagesByPhone[p] || []
        const optimistic = list.find(m =>
          !m.evo_id &&
          m.is_outgoing === em.fromMe &&
          m.content === em.content &&
          Math.abs(new Date(m.timestamp).getTime() - em.timestamp) < 60000
        )

        if (optimistic) {
          optimistic.evo_id = em.evoId
          optimistic.id = em.evoId 
          optimistic.status = EVO_STATUS_MAP[em.status] || 'delivered'
          continue
        }

        const msgObj: Message = {
          id: em.evoId,
          evo_id: em.evoId,
          contact_id: p,
          content: em.content,
          status: EVO_STATUS_MAP[em.status] || 'delivered',
          timestamp: new Date(em.timestamp).toISOString(),
          is_outgoing: em.fromMe,
          type: em.type,
          mediaBase64: em.mediaBase64,
          mediaUrl: em.mediaUrl,
          mimeType: em.mimeType,
          caption: em.caption
        }

        this.upsertIntoStore(msgObj)

        toUpsert.push({
          id: em.evoId,
          contact_id: p,
          content: em.content || '',
          type: em.type,
          is_outgoing: em.fromMe,
          status: EVO_STATUS_MAP[em.status] || 'delivered',
          timestamp: new Date(em.timestamp).toISOString(),
          media_url: em.mediaUrl,
          mime_type: em.mimeType,
          caption: em.caption,
          metadata: { source: 'sync', sync_at: new Date().toISOString() }
        })
      }

      if (toUpsert.length > 0) {
        try {
          await (client.from('messages') as any).upsert(toUpsert, { onConflict: 'id, contact_id' })
        } catch (e) {
          console.error('[DATABASE] Falha ao persistir sync:', e)
        }
      }
    },

    async fetchFromSupabase(phone: string) {
      const client = useSupabaseClient()
      const p = phone.replace(/\D/g, '')

      // Busca mensagens estritamente vinculadas a este número de telefone
      const { data, error } = await (client.from('messages') as any)
        .select('*')
        .eq('contact_id', p)
        .order('timestamp', { ascending: true })

      if (error) {
        console.error('[STORE] Erro ao buscar do Supabase:', error)
        return
      }

      (data || []).forEach(m => {
        this.upsertIntoStore({
          id: m.id,
          evo_id: m.id,
          contact_id: p,
          content: m.content || '',
          status: m.status as any,
          timestamp: m.timestamp,
          is_outgoing: m.is_outgoing,
          type: m.type as any,
          mediaUrl: m.media_url,
          mimeType: m.mime_type,
          caption: m.caption
        })
      })
    },

    clearPhone(phone: string) {
      delete this.messagesByPhone[phone.replace(/\D/g, '')]
    }
  }
})
