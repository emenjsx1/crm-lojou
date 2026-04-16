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
    ): number | string {
      const id = 'local_' + Date.now()
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

    // Salva mensagem enviada no Supabase imediatamente após sucesso da API
    async addAndSaveOutgoing(params: {
      localId: number | string,
      evoId: string,
      contactId: number | string,
      content: string,
      type: Message['type'],
      mediaUrl?: string,
      mimeType?: string,
      caption?: string
    }) {
      const client = useSupabaseClient()
      
      // Atualiza no store local (troca ID temporário pelo real)
      const msg = this.messages.find(m => m.id === params.localId)
      if (msg) {
        msg.id = params.evoId
        msg.evo_id = params.evoId
        msg.status = 'sent'
      }

      // Persiste no Supabase
      const payload = {
        id: params.evoId,
        contact_id: String(params.contactId),
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
        console.log(`[STORE AUDIT] Persistindo mensagem ${params.evoId} no Supabase...`)
        const { data, error } = await (client.from('messages') as any).upsert(payload, { onConflict: 'id' }).select()
        if (error) {
           console.error('[STORE AUDIT] Falha ao persistir no Supabase:', error)
        } else {
           console.log(`[STORE AUDIT] Mensagem ${params.evoId} salva com sucesso.`)
        }
      } catch (e) {
        console.error('[STORE AUDIT] Exceção ao persistir envio:', e)
      }
    },

    updateStatus(msgId: number | string, status: Message['status']) {
      const msg = this.messages.find(m => m.id === msgId || m.evo_id === msgId)
      if (msg) msg.status = status
    },

    // Sincroniza mensagens vindas da Evolution (sem duplicados)
    async syncFromEvolution(contactId: number | string, evoMessages: EvoMessage[]) {
      const client = useSupabaseClient()
      const contactIdStr = String(contactId)

      // Identificadores únicos que já temos no store para ESTE contato
      const existingEvoIds = new Set(
        this.messages
          .filter(m => String(m.contact_id) === contactIdStr)
          .map(m => m.evo_id)
          .filter(Boolean)
      )

      const toUpsert: any[] = []

      for (const em of evoMessages) {
        if (!em.evoId) continue

        // 1. Já existe no store para este contato? Skip.
        if (existingEvoIds.has(em.evoId)) continue

        // 2. Existe no store para OUTRO contato? 
        // Isso acontece se o webhook salvou no phone mas estamos no ID numérico,
        // ou se o polling do Chat A pegou mensagens do Chat B.
        const existingInOther = this.messages.find(m => m.evo_id === em.evoId)
        
        if (existingInOther) {
          // Se o contact_id for diferente, vamos avaliar se devemos "roubar" a mensagem
          // Se o existingInOther.contact_id for um telefone e o novo contactId for numérico, 
          // ou se forem equivalentes por telefone (mesma pessoa, IDs diferentes no CRM)
          const isPhoneId = (id: string) => /^\d+$/.test(id) && id.length > 7
          
          if (String(existingInOther.contact_id) !== contactIdStr) {
             // Só movemos se tivermos certeza que é do mesmo "remetente"
             // Por enquanto, confiamos no sync que o caller (messages.vue) já fez o match de telefone.
             console.log(`[SYNC] Movendo mensagem ${em.evoId} de ${existingInOther.contact_id} para ${contactIdStr}`)
             existingInOther.contact_id = contactId
          }
          continue
        }

        // 3. Verifica se é uma mensagem optimista local (enviada pelo CRM)
        const optimistic = this.messages.find(m =>
          String(m.contact_id) === contactIdStr &&
          !m.evo_id &&
          m.is_outgoing === em.fromMe &&
          m.content === em.content &&
          Math.abs(new Date(m.timestamp).getTime() - em.timestamp) < 45000 // Aumentado para 45s
        )

        if (optimistic) {
          optimistic.evo_id = em.evoId
          optimistic.id = em.evoId // Substitui local_ID pelo real
          optimistic.status = EVO_STATUS_MAP[em.status] || 'delivered'
          existingEvoIds.add(em.evoId)
          continue
        }

        // 4. Nova mensagem
        const msgObj: Message = {
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
        }

        this.messages.push(msgObj)
        existingEvoIds.add(em.evoId)

        toUpsert.push({
          id: em.evoId,
          contact_id: contactIdStr,
          content: em.content || '',
          type: em.type,
          is_outgoing: em.fromMe,
          status: EVO_STATUS_MAP[em.status] || 'delivered',
          timestamp: new Date(em.timestamp).toISOString(),
          media_url: em.mediaUrl,
          mime_type: em.mimeType,
          caption: em.caption,
          metadata: { source: 'sync' }
        })
      }

      // Bulk upsert para persistência no Supabase
      if (toUpsert.length > 0) {
        try {
          // Usamos upsert para o Supabase também garantir que o contact_id será o ID Lojou oficial
          await (client.from('messages') as any).upsert(toUpsert, { onConflict: 'id' })
        } catch (e) {
          console.error('[DATABASE ERROR] Falha ao persistir sync:', e)
        }
      }
    },

    async fetchFromSupabase(contactId: number | string, contactPhone?: string) {
      const client = useSupabaseClient()

      // Busca por contact_id (correto)
      const { data, error } = await (client
        .from('messages') as any)
        .select('*')
        .eq('contact_id', String(contactId))
        .order('timestamp', { ascending: true })

      // ✅ RECUPERAÇÃO: também busca mensagens que foram salvas com o
      // telefone como contact_id (bug antigo) e as corrige no banco
      let orphanData: any[] = []
      if (contactPhone) {
        const normalizedPhone = String(contactPhone).replace(/\D/g, '')
        const phoneVariants = [
          normalizedPhone,
          '258' + normalizedPhone,
          normalizedPhone.replace(/^258/, ''),
          '55' + normalizedPhone,
          normalizedPhone.replace(/^55/, '')
        ].filter(p => p.length >= 7)

        for (const phoneVariant of phoneVariants) {
          const { data: pData } = await (client
            .from('messages') as any)
            .select('*')
            .eq('contact_id', phoneVariant)
            .order('timestamp', { ascending: true })

          if (pData && pData.length > 0) {
            console.log(`[RECOVERY] Encontradas ${pData.length} mensagens órfãs com contact_id="${phoneVariant}", corrigindo para ${contactId}`)
            orphanData = [...orphanData, ...pData]

            // Corrige contact_id no Supabase para o ID correto
            await (client.from('messages') as any)
              .update({ contact_id: String(contactId) })
              .eq('contact_id', phoneVariant)
          }
        }
      }

      const allData = [...(error ? [] : (data || [])), ...orphanData]
      const existingIds = new Set(this.messages.map(m => m.id))

      allData.forEach(m => {
        if (!existingIds.has(m.id)) {
          existingIds.add(m.id)
          this.messages.push({
            id: m.id,
            evo_id: m.id,
            contact_id: contactId, // usa sempre o ID correto
            content: m.content || '',
            status: m.status as any,
            timestamp: m.timestamp,
            is_outgoing: m.is_outgoing,
            type: m.type as any,
            mediaUrl: m.media_url,
            mimeType: m.mime_type,
            caption: m.caption
          })
        } else {
          // Se já existe no store mas com contact_id errado, corrige
          const existing = this.messages.find(msg => msg.id === m.id)
          if (existing && String(existing.contact_id) !== String(contactId)) {
            existing.contact_id = contactId
          }
        }
      })
    },

    clearContact(contactId: number | string) {
      this.messages = this.messages.filter(m => m.contact_id != contactId)
    }
  }
})
