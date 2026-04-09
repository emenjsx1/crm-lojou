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
  const getCredentials = () => {
    if (typeof window === 'undefined') return null
    const url = localStorage.getItem('evolution_url')?.replace(/\/$/, '')
    const key = localStorage.getItem('evolution_api_key')
    const instance = localStorage.getItem('evolution_instance') || 'lojou-crm'
    if (!url || !key) return null
    return { url, key, instance }
  }

  // Número moçambicano: 9 dígitos começando por 8 → adiciona 258
  // Ex: 855253617 → 258855253617 | +258855253617 → 258855253617
  const formatPhone = (raw: string): string => {
    let d = raw.replace(/\D/g, '')
    if (d.startsWith('0')) d = d.slice(1)
    if (d.length === 9) d = '258' + d
    // Se veio com 258 à frente mas sem + já está correcto
    return d
  }

  const makeClient = () => {
    const creds = getCredentials()
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
    const msg = r.message || {}
    let type: EvoMessage['type'] = 'text'
    let content = ''
    let mediaBase64: string | undefined
    let mediaUrl: string | undefined
    let mimeType: string | undefined
    let caption: string | undefined

    if (msg.conversation) {
      type = 'text'; content = msg.conversation
    } else if (msg.extendedTextMessage) {
      type = 'text'; content = msg.extendedTextMessage.text || ''
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
      content = msg.documentMessage.fileName || '[Documento]'
      mediaUrl = msg.documentMessage.url
      mimeType = msg.documentMessage.mimetype
    } else {
      return null
    }

    return {
      evoId: r.key.id,
      remoteJid: r.key.remoteJid || '',
      fromMe: !!r.key.fromMe,
      content, type,
      timestamp: r.messageTimestamp ? r.messageTimestamp * 1000 : Date.now(),
      status: r.status || 'DELIVERY_ACK',
      mediaBase64, mediaUrl, mimeType, caption
    }
  }

  const fetchHistory = async (rawPhone: string, limit = 60): Promise<EvoMessage[]> => {
    const c = makeClient()
    if (!c) return []
    const jid = formatPhone(rawPhone) + '@s.whatsapp.net'
    try {
      const res = await c.http.post(`/chat/findMessages/${c.instance}`, {
        where: { key: { remoteJid: jid } },
        page: 1,
        offset: limit
      })
      const records = res.data?.messages?.records || res.data?.messages || res.data || []
      return (Array.isArray(records) ? records : [])
        .map(parseRecord)
        .filter(Boolean) as EvoMessage[]
    } catch (e) {
      console.error('[EVO] fetchHistory error:', e)
      return []
    }
  }

  const sendText = async (rawPhone: string, text: string) => {
    const c = makeClient()
    if (!c) throw new Error('Evolution não configurado')
    const res = await c.http.post(`/message/sendText/${c.instance}`, {
      number: formatPhone(rawPhone),
      text
    })
    return res.data
  }

  const sendMedia = async (rawPhone: string, opts: {
    type: 'image' | 'audio' | 'video' | 'document'
    base64: string   // pode incluir o prefixo data:
    filename: string
    mimeType: string
    caption?: string
  }) => {
    const c = makeClient()
    if (!c) throw new Error('Evolution não configurado')
    // Remove o prefixo data:... se existir
    const cleanBase64 = opts.base64.includes(',') ? opts.base64.split(',')[1] : opts.base64
    const res = await c.http.post(`/message/sendMedia/${c.instance}`, {
      number: formatPhone(rawPhone),
      mediatype: opts.type,
      mimetype: opts.mimeType,
      media: cleanBase64,
      fileName: opts.filename,
      caption: opts.caption || ''
    })
    return res.data
  }

  // Configura webhook automático na Evolution para receber mensagens em tempo real
  const configureWebhook = async (webhookUrl: string) => {
    const c = makeClient()
    if (!c) return
    try {
      await c.http.put(`/webhook/set/${c.instance}`, {
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: true,
          events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED']
        }
      })
      console.log('[EVO] Webhook configurado:', webhookUrl)
    } catch (e: any) {
      console.warn('[EVO] Webhook config falhou (precisa de URL pública):', e?.response?.data || e?.message)
    }
  }

  return { formatPhone, fetchHistory, sendText, sendMedia, configureWebhook, getCredentials }
}
