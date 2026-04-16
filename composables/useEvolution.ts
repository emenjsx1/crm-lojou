import axios from 'axios'

export interface EvoMessage {
  evoId: string
  remoteJid: string
  fromMe: boolean
  content: string
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  timestamp: number
  status: string
  mediaBase64?: string
  mediaUrl?: string
  mimeType?: string
  caption?: string
}

export const useEvolution = () => {
  const clientSupabase = useSupabaseClient()

  // Número moçambicano: 9 dígitos começando por 8 → adiciona 258
  const formatPhone = (raw: string): string => {
    let d = raw.replace(/\D/g, '')
    // Se começar com 258, remover para normalizar internamente
    if (d.startsWith('258') && d.length > 9) {
      d = d.slice(3)
    }
    // Para envio/fetch na Evolution, garantimos o 258 se for Moçambique (9 dígitos começando por 8)
    if (d.length === 9 && d.startsWith('8')) {
      return '258' + d
    }
    return d
  }

  const fetchSettings = async () => {
    const { data, error } = await clientSupabase
      .from('settings')
      .select('value')
      .eq('key', 'evolution_config')
      .maybeSingle()
    
    if (error || !data) return null
    return data.value as { url: string; key: string; instance: string }
  }

  const saveSettings = async (url: string, key: string, instance: string) => {
    const value = { url, key, instance }
    const { error } = await clientSupabase
      .from('settings')
      .upsert({ 
        key: 'evolution_config', 
        value, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'key' })
    
    if (error) throw error
    
    // Sync to localStorage as fallback
    if (typeof window !== 'undefined') {
      localStorage.setItem('evolution_url', url)
      localStorage.setItem('evolution_api_key', key)
      localStorage.setItem('evolution_instance', instance)
    }
  }

  const getCredentials = async () => {
    const remote = await fetchSettings()
    if (remote) return remote

    if (typeof window === 'undefined') return null
    const url = localStorage.getItem('evolution_url')?.replace(/\/$/, '')
    const key = localStorage.getItem('evolution_api_key')
    const instance = localStorage.getItem('evolution_instance') || 'lojou-crm'
    if (!url || !key) return null
    return { url, key, instance }
  }

  const makeClient = async () => {
    const creds = await getCredentials()
    if (!creds) return null
    return {
      http: axios.create({
        baseURL: creds.url,
        headers: { apikey: creds.key, 'Content-Type': 'application/json' }
      }),
      instance: creds.instance
    }
  }

  const parseRecord = (r: any): EvoMessage | null => {
    if (!r?.key) return null
    let msg = r.message || {}
    
    // Handle nested message structures (ephemeral, view once, etc.)
    if (msg.ephemeralMessage) msg = msg.ephemeralMessage.message || {}
    if (msg.viewOnceMessage) msg = msg.viewOnceMessage.message || {}
    if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message || {}

    let type: EvoMessage['type'] = 'text'
    let content = ''
    let mediaBase64: string | undefined
    let mediaUrl: string | undefined
    let mimeType: string | undefined
    let caption: string | undefined

    if (msg.conversation) {
      type = 'text'
      content = msg.conversation
    } else if (msg.extendedTextMessage) {
      type = 'text'
      content = msg.extendedTextMessage.text || ''
    } else if (msg.imageMessage) {
      type = 'image'
      caption = msg.imageMessage.caption || ''
      content = caption || '[Imagem]'
      mediaBase64 = msg.imageMessage.base64 || r.base64
      mediaUrl = msg.imageMessage.url
      mimeType = msg.imageMessage.mimetype || 'image/jpeg'
    } else if (msg.audioMessage || msg.pttMessage) {
      type = 'audio'
      content = '[Áudio]'
      const am = msg.audioMessage || msg.pttMessage
      mediaBase64 = am?.base64 || r.base64
      mediaUrl = am?.url
      mimeType = am?.mimetype || 'audio/ogg; codecs=opus'
    } else if (msg.videoMessage) {
      type = 'video'
      caption = msg.videoMessage.caption || ''
      content = caption || '[Vídeo]'
      mediaUrl = msg.videoMessage.url
      mimeType = msg.videoMessage.mimetype || 'video/mp4'
    } else if (msg.documentMessage) {
      type = 'document'
      content = msg.documentMessage.fileName || msg.documentMessage.title || '[Documento]'
      mediaUrl = msg.documentMessage.url
      mimeType = msg.documentMessage.mimetype
    } else if (msg.stickerMessage) {
       // Support stickers as images for now
       type = 'image'
       content = '[Sticker]'
       mediaUrl = msg.stickerMessage.url
       mimeType = msg.stickerMessage.mimetype || 'image/webp'
    } else if (msg.buttonsMessage || msg.templateMessage || msg.listMessage) {
       // Text fallback for interactive messages
       type = 'text'
       content = (msg.buttonsMessage?.contentText || msg.templateMessage?.hydratedTemplate?.hydratedContentText || msg.listMessage?.description || '[Mensagem Interativa]')
    } else {
      // Last resort: check if there is any text-like property
      const possibleText = msg.text || msg.caption || msg.description
      if (possibleText) {
        type = 'text'
        content = possibleText
      } else {
        return null
      }
    }

    return {
      evoId: r.key.id,
      remoteJid: r.key.remoteJid || '',
      fromMe: Boolean(r.key.fromMe),
      content, 
      type,
      timestamp: r.messageTimestamp 
        ? (Number(r.messageTimestamp) > 1000000000000 ? Number(r.messageTimestamp) : Number(r.messageTimestamp) * 1000) 
        : Date.now(),
      status: r.status || 'DELIVERY_ACK',
      mediaBase64, mediaUrl, mimeType, caption
    }
  }

  const fetchHistory = async (rawPhone: string, limit = 60): Promise<EvoMessage[]> => {
    const c = await makeClient()
    if (!c) return []
    const phone = formatPhone(rawPhone)
    const jid = phone + '@s.whatsapp.net'
    console.log(`[EVO DEBUG] Buscando histórico para JID: ${jid}`)
    // Tentar múltiplos formatos de query (compatibilidade V1/V2 correta)
    const attempts = [
      () => c.http.post(`/chat/findMessages/${c.instance}`, {
        where: { remoteJid: jid }, limit: limit
      }),
      () => c.http.post(`/chat/findMessages/${c.instance}`, {
        where: { key: { remoteJid: jid } }, limit: limit
      }),
      () => c.http.get(`/chat/fetchMessages/${c.instance}`, {
        params: { remoteJid: jid, limit }
      })
    ]

    for (const attempt of attempts) {
      try {
        const res = await attempt()
        const data = res.data
        const raw = data?.messages?.records || data?.messages || data?.data || data?.records || (Array.isArray(data) ? data : [])
        
        if (Array.isArray(raw) && raw.length > 0) {
          const parsed = raw
            .map(parseRecord)
            .filter(Boolean) as EvoMessage[]

          // ── FILTRO CRÍTICO: só aceitar mensagens do JID exacto ──────────
          // Sem este filtro, mensagens de outros contactos entram no chat errado
          const filtered = parsed.filter(m => m.remoteJid === jid)
          
          if (filtered.length < parsed.length) {
            console.warn(`[EVO] ⚠️  Removidas ${parsed.length - filtered.length} mensagens de outros JIDs (de ${parsed.length} total) para ${jid}`)
          }

          console.log(`[EVO] Sync para ${jid}: ${filtered.length} mensagens válidas.`)
          return filtered
        }
      } catch (e: any) {
        console.warn(`[EVO] Tentativa falhou para ${phone}:`, e.message)
        continue
      }
    }
    return []
  }

  const sendText = async (rawPhone: string, text: string, quotedId?: string) => {
    const c = await makeClient()
    if (!c) throw new Error('Evolution não configurado')
    const payload: any = {
      number: formatPhone(rawPhone),
      text
    }
    if (quotedId) {
      payload.quoted = { key: { id: quotedId } }
    }
    const res = await c.http.post(`/message/sendText/${c.instance}`, payload)
    return res.data
  }

  const sendMedia = async (rawPhone: string, opts: {
    type: 'image' | 'audio' | 'video' | 'document'
    base64: string
    filename: string
    mimeType: string
    caption?: string
    quotedId?: string
  }) => {
    const c = await makeClient()
    if (!c) throw new Error('Evolution não configurado')
    const cleanBase64 = opts.base64.includes(',') ? opts.base64.split(',')[1] : opts.base64
    const payload: any = {
      number: formatPhone(rawPhone),
      mediatype: opts.type,
      mimetype: opts.mimeType,
      media: cleanBase64,
      fileName: opts.filename,
      caption: opts.caption || ''
    }
    if (opts.quotedId) {
      payload.quoted = { key: { id: opts.quotedId } }
    }
    const res = await c.http.post(`/message/sendMedia/${c.instance}`, payload)
    return res.data
  }

  const deleteMessage = async (messageId: string) => {
    const c = await makeClient()
    if (!c) throw new Error('Evolution não configurado')
    // Evolution v2 usa DELETE /message/delete
    const res = await c.http.delete(`/message/delete/${c.instance}`, {
      data: { key: { id: messageId } }
    })
    return res.data
  }

  const configureWebhook = async (webhookUrl: string) => {
    const c = await makeClient()
    if (!c) throw new Error('Evolution não configurado')
    const res = await c.http.post(`/instance/setWebhook/${c.instance}`, {
      url: webhookUrl,
      enabled: true,
      events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE']
    })
    return res.data
  }

  const fetchChats = async (): Promise<any[]> => {
    const c = await makeClient()
    if (!c) return []
    try {
      // Evolution v2 endpoint
      const res = await c.http.get(`/chat/getChats/${c.instance}`)
      return res.data || []
    } catch (e) {
      console.warn('[EVO] Falha ao buscar chats:', e)
      return []
    }
  }

  return { 
    formatPhone, 
    fetchHistory, 
    fetchChats,
    sendText, 
    sendMedia, 
    deleteMessage,
    configureWebhook, 
    getCredentials, 
    saveSettings 
  }
}
