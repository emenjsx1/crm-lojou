import { defineStore } from 'pinia'
import { useSupabaseClient } from '#imports'
import type { EvoMessage } from '~/composables/useEvolution'

export interface Message {
  id: string // message_id da Evolution
  contact_id?: string // UUID do contato no banco
  remote_jid: string // JID completo (ex: 5511...@s.whatsapp.net)
  content: string
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error'
  timestamp: string
  is_outgoing: boolean
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  mediaUrl?: string
  mimeType?: string
  caption?: string
  metadata?: any
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
    // Agrupamos mensagens por remoteJid (Identificador Único Universal do WhatsApp)
    messagesByJid: {} as Record<string, Message[]>,
    loading: false
  }),
  getters: {
    getMessagesByJid: (state) => (jid: string) => {
      if (!jid) return []
      return (state.messagesByJid[jid] || [])
        .slice()
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    },
    // Legado para compatibilidade com partes que ainda usam phone
    getMessagesByPhone: (state) => (phone: string) => {
      if (!phone) return []
      const jid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`
      return (state.messagesByJid[jid] || [])
        .slice()
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    }
  },
  actions: {
    // Helper interno para inserir/atualizar de forma isolada por JID e ID de mensagem
    upsertIntoStore(msg: Message) {
      const jid = msg.remote_jid
      if (!jid) return

      if (!this.messagesByJid[jid]) {
        this.messagesByJid[jid] = []
      }
      
      const list = this.messagesByJid[jid]
      const index = list.findIndex(m => m.id === msg.id)
      
      if (index !== -1) {
        // Atualização reativa preservando campos não enviados no update
        list[index] = { ...list[index], ...msg }
      } else {
        list.push(msg)
      }
    },

    addOutgoing(
      jid: string,
      content: string,
      type: Message['type'] = 'text',
      media?: Pick<Message, 'mediaUrl' | 'mimeType' | 'caption'>
    ): string {
      const id = 'local_' + Date.now()
      this.upsertIntoStore({
        id,
        remote_jid: jid,
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
      localId: string,
      messageId: string,
      jid: string,
      content: string,
      type: Message['type'],
      mediaUrl?: string,
      mimeType?: string,
      caption?: string
    }) {
      const client = useSupabaseClient()
      
      // Atualiza no store local (troca ID temporário por ID real da Evolution)
      const list = this.messagesByJid[params.jid] || []
      const msg = list.find(m => m.id === params.localId)
      if (msg) {
        msg.id = params.messageId
        msg.status = 'sent'
      }

      const payload = {
        id: params.messageId, // ID unificado
        message_id: params.messageId,
        remote_jid: params.jid,
        content: params.content,
        type: params.type,
        is_outgoing: true,
        status: 'sent',
        timestamp: new Date().toISOString(),
        media_url: params.mediaUrl,
        mime_type: params.mimeType,
        caption: params.caption,
        metadata: { source: 'app_outgoing' }
      }

      try {
        await client.from('messages').upsert(payload, { onConflict: 'message_id' })
      } catch (e) {
        console.error('[STORE] Erro ao persistir mensagem enviada:', e)
      }
    },

    async syncFromEvolution(jid: string, evoMessages: EvoMessage[]) {
      const client = useSupabaseClient()
      const toUpsert: any[] = []

      for (const em of evoMessages) {
        if (!em.evoId) continue

        // Procura optimista por mensagens locais em envio
        const list = this.messagesByJid[jid] || []
        const optimistic = list.find(m =>
          m.id.startsWith('local_') &&
          m.is_outgoing === em.fromMe &&
          m.content === em.content &&
          Math.abs(new Date(m.timestamp).getTime() - em.timestamp) < 60000
        )

        if (optimistic) {
          optimistic.id = em.evoId 
          optimistic.status = EVO_STATUS_MAP[em.status] || 'delivered'
        }

        const msgObj: Message = {
          id: em.evoId,
          remote_jid: jid,
          content: em.content,
          status: EVO_STATUS_MAP[em.status] || 'delivered',
          timestamp: new Date(em.timestamp).toISOString(),
          is_outgoing: em.fromMe,
          type: em.type,
          mediaUrl: em.mediaUrl,
          mimeType: em.mimeType,
          caption: em.caption
        }

        this.upsertIntoStore(msgObj)

        toUpsert.push({
          id: em.evoId,
          message_id: em.evoId,
          remote_jid: jid,
          content: em.content || '',
          type: em.type,
          is_outgoing: em.fromMe,
          status: EVO_STATUS_MAP[em.status] || 'delivered',
          timestamp: new Date(em.timestamp).toISOString(),
          media_url: em.mediaUrl,
          mime_type: em.mimeType,
          caption: em.caption,
          metadata: { source: 'sync_evolution' }
        })
      }

      if (toUpsert.length > 0) {
        try {
          // Usamos upsert por message_id para garantir que não duplicamos se o JID mudar
          await client.from('messages').upsert(toUpsert, { onConflict: 'message_id' })
        } catch (e) {
          console.error('[DATABASE] Falha no sync evolution:', e)
        }
      }
    },

    async fetchFromSupabase(jid: string) {
      if (!jid) return
      const client = useSupabaseClient()

      const { data, error } = await client.from('messages')
        .select('*')
        .eq('remote_jid', jid)
        .order('timestamp', { ascending: true })

      if (error) {
        console.error('[STORE] Erro ao buscar mensagens por JID:', error)
        return
      }

      (data || []).forEach(m => {
        this.upsertIntoStore({
          id: m.message_id || m.id,
          contact_id: m.contact_id,
          remote_jid: jid,
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

    clearJid(jid: string) {
      delete this.messagesByJid[jid]
    }
  }
})

