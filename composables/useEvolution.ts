import axios from 'axios'
import { useSupabaseClient } from '#imports'

// ─────────────────────────────────────────────────────────────────────────────
// Evolution API — Composable oficial
//
// Endpoints confirmados via source code (routes/chat.router.ts):
//   POST /chat/findChats/{instance}     — lista todos os chats
//   POST /chat/findMessages/{instance}  — lista mensagens (filtrado ou global)
//   POST /chat/findContacts/{instance}  — lista contactos
//   POST /message/sendText/{instance}   — enviar texto
//   POST /message/sendMedia/{instance}  — enviar media
//   POST /webhook/set/{instance}        — configurar webhook
//
// IMPORTANTE: todos os endpoints de query são POST, não GET.
// ─────────────────────────────────────────────────────────────────────────────

export interface EvoMessage {
  evoId: string
  remoteJid: string
  fromMe: boolean
  content: string
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  timestamp: number
  status: string
  mediaUrl?: string
  mimeType?: string
  caption?: string
  pushName?: string
}

export interface EvoChat {
  id: string           // remoteJid canónico
  name: string         // pushName ou número
  lastMessage?: string
  lastTimestamp?: number
  unreadCount?: number
}

export const useEvolution = () => {
  const clientSupabase = useSupabaseClient()

  // ── Normalização de número (Moçambique) ──────────────────────────────────
  const formatPhone = (raw: string): string => {
    let d = String(raw).replace(/\D/g, '')
    if (d.startsWith('258') && d.length > 9) d = d.slice(3)
    if (d.length === 9 && d.startsWith('8')) return '258' + d
    return d
  }

  // ── Credenciais ──────────────────────────────────────────────────────────
  const fetchSettings = async () => {
    try {
      const { data, error } = await (clientSupabase
        .from('settings')
        .select('value')
        .eq('key', 'evolution_config')
        .maybeSingle() as any)
      if (error || !data) return null
      return (data as any).value as { url: string; key: string; instance: string }
    } catch { return null }
  }

  const saveSettings = async (url: string, key: string, instance: string) => {
    const value = { url, key, instance }
    const { error } = await ((clientSupabase as any)
      .from('settings')
      .upsert({ key: 'evolution_config', value, updated_at: new Date().toISOString() }, { onConflict: 'key' }))
    if (error) throw error
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
        baseURL: creds.url.replace(/\/$/, ''),
        headers: { apikey: creds.key, 'Content-Type': 'application/json' },
        timeout: 15000
      }),
      instance: creds.instance
    }
  }

  // ── Extrair array de records de resposta da API ───────────────────────────
  const extractRecords = (data: any): any[] => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.messages?.records)) return data.messages.records
    if (Array.isArray(data?.messages)) return data.messages
    if (Array.isArray(data?.records)) return data.records
    if (Array.isArray(data?.chats)) return data.chats
    if (Array.isArray(data?.contacts)) return data.contacts
    if (Array.isArray(data?.data)) return data.data
    return []
  }

  // ── Parsear mensagem do formato Evolution ────────────────────────────────
  // Resposta de findMessages: { key: { remoteJid, fromMe, id }, message: {...}, messageTimestamp, status, pushName }
  const parseRecord = (r: any): EvoMessage | null => {
    if (!r?.key) return null

    let msg = r.message || {}
    // Desembrulhar tipos especiais
    if (msg.ephemeralMessage)   msg = msg.ephemeralMessage.message   || {}
    if (msg.viewOnceMessage)    msg = msg.viewOnceMessage.message    || {}
    if (msg.viewOnceMessageV2)  msg = msg.viewOnceMessageV2.message  || {}

    let type: EvoMessage['type'] = 'text'
    let content = ''
    let mediaUrl: string | undefined
    let mimeType: string | undefined
    let caption: string | undefined

    if (msg.conversation) {
      content = msg.conversation
    } else if (msg.extendedTextMessage?.text) {
      content = msg.extendedTextMessage.text
    } else if (msg.imageMessage) {
      type = 'image'
      caption = msg.imageMessage.caption || undefined
      content = caption || '[Imagem]'
      mediaUrl = msg.imageMessage.url
      mimeType = msg.imageMessage.mimetype || 'image/jpeg'
    } else if (msg.audioMessage || msg.pttMessage) {
      type = 'audio'
      content = '[Áudio]'
      const am = msg.audioMessage || msg.pttMessage
      mediaUrl = am?.url
      mimeType = am?.mimetype || 'audio/ogg'
    } else if (msg.videoMessage) {
      type = 'video'
      caption = msg.videoMessage.caption || undefined
      content = caption || '[Vídeo]'
      mediaUrl = msg.videoMessage.url
      mimeType = msg.videoMessage.mimetype || 'video/mp4'
    } else if (msg.documentMessage) {
      type = 'document'
      content = msg.documentMessage.fileName || '[Documento]'
      mediaUrl = msg.documentMessage.url
      mimeType = msg.documentMessage.mimetype
    } else if (msg.stickerMessage) {
      type = 'image'
      content = '[Sticker]'
      mediaUrl = msg.stickerMessage.url
      mimeType = msg.stickerMessage.mimetype || 'image/webp'
    } else if (msg.buttonsMessage || msg.templateMessage || msg.listMessage) {
      content = msg.buttonsMessage?.contentText
        || msg.templateMessage?.hydratedTemplate?.hydratedContentText
        || msg.listMessage?.description
        || '[Mensagem Interativa]'
    } else {
      const fallback = msg.text || msg.caption || msg.description
      content = fallback || ''
      if (!content) return null
    }

    const rawJid = r.key.remoteJid || ''
    const ts = r.messageTimestamp
      ? (Number(r.messageTimestamp) > 1_000_000_000_000
          ? Number(r.messageTimestamp)
          : Number(r.messageTimestamp) * 1000)
      : Date.now()

    return {
      evoId:     r.key.id,
      remoteJid: rawJid,
      fromMe:    Boolean(r.key.fromMe),
      content,
      type,
      timestamp: ts,
      status:    r.status || 'DELIVERY_ACK',
      mediaUrl,
      mimeType,
      caption,
      pushName:  r.pushName || undefined
    }
  }

  // ── Parsear chat/contacto para EvoChat ───────────────────────────────────
  const parseChatItem = (ch: any): EvoChat | null => {
    const id = ch.id || ch.remoteJid || ch.jid || ''
    if (!id.includes('@s.whatsapp.net')) return null // ignorar grupos e outros

    // lastMessage pode vir em vários formatos dependendo da versão da API
    const lm = ch.lastMessage || ch.last_message || null
    const lastMsgNode = lm?.message || lm?.msg || lm || null
    const lastMessage = lastMsgNode?.conversation
      || lastMsgNode?.extendedTextMessage?.text
      || lastMsgNode?.imageMessage?.caption
      || lastMsgNode?.content
      || ch.lastMsgText || ''

    const rawTs = lm?.messageTimestamp || lm?.timestamp || ch.updatedAt || ch.updated_at
    const lastTimestamp = rawTs
      ? (typeof rawTs === 'number'
          ? (rawTs > 1_000_000_000_000 ? rawTs : rawTs * 1000)
          : new Date(rawTs).getTime())
      : Date.now()

    return {
      id,
      name:          ch.name || ch.pushName || ch.verifiedName || id.split('@')[0],
      lastMessage,
      lastTimestamp,
      unreadCount:   ch.unreadCount || ch.unread_count || 0
    }
  }

  // ── POST /chat/findChats/{instance} — lista todos os chats ───────────────
  // body: { where: {} } para todos | { where: { id: "..." } } para um específico
  const fetchChats = async (): Promise<EvoChat[]> => {
    const c = await makeClient()
    if (!c) return []

    // Dois formatos documentados: with/without where clause
    const bodies = [
      { where: {} },
      {}
    ]

    for (const body of bodies) {
      try {
        const res = await c.http.post(`/chat/findChats/${c.instance}`, body)
        const raw = extractRecords(res.data)
        if (raw.length > 0) {
          const parsed = raw.map(parseChatItem).filter(Boolean) as EvoChat[]
          if (parsed.length > 0) {
            console.log(`[EVO] fetchChats: ${parsed.length} chats individuais`)
            return parsed
          }
        }
      } catch (e: any) {
        console.warn('[EVO] findChats falhou:', e?.response?.status, e?.message)
      }
    }

    // Fallback: POST /chat/findContacts/{instance}
    try {
      const res = await c.http.post(`/chat/findContacts/${c.instance}`, { where: {} })
      const raw = extractRecords(res.data)
      if (raw.length > 0) {
        const parsed = raw.map(parseChatItem).filter(Boolean) as EvoChat[]
        if (parsed.length > 0) {
          console.log(`[EVO] fetchChats via findContacts: ${parsed.length}`)
          return parsed
        }
      }
    } catch (e: any) {
      console.warn('[EVO] findContacts falhou:', e?.response?.status, e?.message)
    }

    return []
  }

  // ── POST /chat/findMessages/{instance} — histórico de 1 contacto ─────────
  // body: { where: { key: { remoteJid: "..." } }, limit: N }
  const fetchHistory = async (remoteJid: string, limit = 80): Promise<EvoMessage[]> => {
    const c = await makeClient()
    if (!c) return []

    // Garantir formato JID correcto: 258XXXXXXXXX@s.whatsapp.net
    const digits = String(remoteJid).replace(/\D/g, '').replace(/@.*$/, '')
    const jid = digits + '@s.whatsapp.net'

    // Corpo correcto conforme documentação oficial
    const body = {
      where: { key: { remoteJid: jid } },
      limit
    }

    try {
      const res = await c.http.post(`/chat/findMessages/${c.instance}`, body)
      const raw = extractRecords(res.data)
      if (raw.length > 0) {
        const parsed = raw.map(parseRecord).filter(Boolean) as EvoMessage[]
        console.log(`[EVO] fetchHistory ${jid}: ${parsed.length} msgs (${parsed.filter(m => !m.fromMe).length} recebidas)`)
        return parsed
      }
    } catch (e: any) {
      console.warn('[EVO] findMessages falhou:', e?.response?.status, e?.message)
    }

    return []
  }

  // ── Sidebar: chats + última mensagem de cada um ───────────────────────────
  // Usa findChats para obter lista completa; para last message usa os dados do chat
  const fetchAllRecent = async (_limit = 200): Promise<EvoMessage[]> => {
    const chats = await fetchChats()
    if (chats.length === 0) return []

    // Converter EvoChat → EvoMessage (formato esperado pelo loadChats)
    return chats.map(ch => ({
      evoId:     `sidebar_${ch.id}`,
      remoteJid: ch.id,
      fromMe:    false,
      content:   ch.lastMessage || '',
      type:      'text' as const,
      timestamp: ch.lastTimestamp || Date.now(),
      status:    'DELIVERY_ACK',
      pushName:  ch.name
    }))
  }

  // ── POST /message/sendText/{instance} ────────────────────────────────────
  const sendText = async (rawPhone: string, text: string, quotedId?: string) => {
    const c = await makeClient()
    if (!c) throw new Error('Evolution não configurado')

    const number = formatPhone(rawPhone)

    // v2 usa textMessage: { text }, v1 usa text directamente
    const payloads = [
      { number, textMessage: { text }, ...(quotedId ? { quoted: { key: { id: quotedId } } } : {}) },
      { number, text,                  ...(quotedId ? { quoted: { key: { id: quotedId } } } : {}) }
    ]

    let lastError: any
    for (const payload of payloads) {
      try {
        const res = await c.http.post(`/message/sendText/${c.instance}`, payload)
        console.log(`[EVO] sendText OK → ${number}`)
        return res.data
      } catch (e: any) {
        lastError = e
      }
    }
    throw lastError
  }

  // ── POST /message/sendMedia/{instance} ───────────────────────────────────
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
      number:    formatPhone(rawPhone),
      mediatype: opts.type,
      mimetype:  opts.mimeType,
      media:     cleanBase64,
      fileName:  opts.filename,
      caption:   opts.caption || ''
    }
    if (opts.quotedId) payload.quoted = { key: { id: opts.quotedId } }
    const res = await c.http.post(`/message/sendMedia/${c.instance}`, payload)
    return res.data
  }

  // ── DELETE /message/delete/{instance} ────────────────────────────────────
  const deleteMessage = async (messageId: string) => {
    const c = await makeClient()
    if (!c) throw new Error('Evolution não configurado')
    const res = await c.http.delete(`/message/delete/${c.instance}`, {
      data: { key: { id: messageId } }
    })
    return res.data
  }

  // ── POST /webhook/set/{instance} — configurar webhook ────────────────────
  const configureWebhook = async (webhookUrl: string) => {
    const c = await makeClient()
    if (!c) throw new Error('Evolution não configurado')

    const events = ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_SET', 'SEND_MESSAGE']
    const endpoints = [`/webhook/set/${c.instance}`, `/instance/setWebhook/${c.instance}`]

    let lastErr: any
    for (const ep of endpoints) {
      try {
        const res = await c.http.post(ep, { url: webhookUrl, enabled: true, events })
        console.log(`[EVO] Webhook configurado via ${ep}`)
        return res.data
      } catch (e) { lastErr = e }
    }
    throw lastErr
  }

  return {
    formatPhone,
    fetchChats,
    fetchHistory,
    fetchAllRecent,
    sendText,
    sendMedia,
    deleteMessage,
    configureWebhook,
    getCredentials,
    saveSettings
  }
}
