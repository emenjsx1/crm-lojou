import axios from 'axios'
import { useSupabaseClient } from '#imports'

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
  id: string          // remoteJid
  name: string        // nome do contacto
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

  // ── Parsear mensagem do formato Evolution ────────────────────────────────
  const parseRecord = (r: any): EvoMessage | null => {
    if (!r?.key) return null

    let msg = r.message || {}
    if (msg.ephemeralMessage) msg = msg.ephemeralMessage.message || {}
    if (msg.viewOnceMessage) msg = msg.viewOnceMessage.message || {}
    if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message || {}

    let type: EvoMessage['type'] = 'text'
    let content = ''
    let mediaUrl: string | undefined
    let mimeType: string | undefined
    let caption: string | undefined

    if (msg.conversation) {
      content = msg.conversation
    } else if (msg.extendedTextMessage) {
      content = msg.extendedTextMessage.text || ''
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
      if (fallback) content = fallback
      else return null
    }

    // JID — normaliza mas NÃO filtra: aceitar qualquer formato
    const rawJid = r.key.remoteJid || ''

    const ts = r.messageTimestamp
      ? (Number(r.messageTimestamp) > 1_000_000_000_000
          ? Number(r.messageTimestamp)
          : Number(r.messageTimestamp) * 1000)
      : Date.now()

    return {
      evoId: r.key.id,
      remoteJid: rawJid,
      fromMe: Boolean(r.key.fromMe),
      content,
      type,
      timestamp: ts,
      status: r.status || 'DELIVERY_ACK',
      mediaUrl,
      mimeType,
      caption,
      pushName: r.pushName || undefined
    }
  }

  // ── Buscar histórico de mensagens — Evolution direto ────────────────────
  const fetchHistory = async (remoteJid: string, limit = 60): Promise<EvoMessage[]> => {
    const c = await makeClient()
    if (!c) return []

    // Normaliza o JID para enviar à Evolution
    const phone = String(remoteJid).replace(/\D/g, '')
    const jid = phone.includes('@') ? phone : phone + '@s.whatsapp.net'

    const attempts = [
      // Formato v2 correto
      () => c.http.post(`/chat/findMessages/${c.instance}`, {
        where: { key: { remoteJid: jid } },
        limit
      }),
      // Formato alternativo
      () => c.http.post(`/chat/findMessages/${c.instance}`, {
        where: { remoteJid: jid },
        limit
      }),
      // GET endpoint
      () => c.http.get(`/chat/findMessages/${c.instance}`, {
        params: { remoteJid: jid, limit }
      })
    ]

    for (const attempt of attempts) {
      try {
        const res = await attempt()
        const data = res.data
        const raw: any[] = data?.messages?.records
          || data?.messages
          || data?.records
          || (Array.isArray(data) ? data : [])

        if (Array.isArray(raw) && raw.length > 0) {
          const parsed = raw.map(parseRecord).filter(Boolean) as EvoMessage[]
          console.log(`[EVO] fetchHistory ${jid}: ${parsed.length} mensagens`)
          return parsed
        }
      } catch (e: any) {
        console.warn(`[EVO] fetchHistory tentativa falhou:`, e?.message)
      }
    }
    return []
  }

  // ── Parsear raw chat/contact object para EvoChat ────────────────────────
  const parseChatRaw = (ch: any): EvoChat | null => {
    const id = ch.id || ch.remoteJid || ch.jid || ''
    if (!id || (!id.includes('@s.whatsapp.net') && !id.includes('@g.us'))) return null
    if (id.includes('@g.us')) return null // ignorar grupos

    // Extrair lastMessage de múltiplos formatos da API
    const lm = ch.lastMessage || ch.last_message || null
    const lastMsgNode = lm?.message || lm?.msg || lm || null
    const lastMessage = lastMsgNode?.conversation
      || lastMsgNode?.extendedTextMessage?.text
      || lastMsgNode?.imageMessage?.caption
      || lastMsgNode?.content
      || ch.lastMsgText
      || ''

    const rawTs = lm?.messageTimestamp || lm?.timestamp || ch.updatedAt || ch.updated_at
    const lastTimestamp = rawTs
      ? (typeof rawTs === 'number'
          ? (rawTs > 1_000_000_000_000 ? rawTs : rawTs * 1000)
          : new Date(rawTs).getTime())
      : Date.now()

    return {
      id,
      name: ch.name || ch.pushName || ch.verifiedName || id.split('@')[0],
      lastMessage,
      lastTimestamp,
      unreadCount: ch.unreadCount || ch.unread_count || 0
    }
  }

  // ── Buscar lista de chats — tenta múltiplos endpoints/formatos ───────────
  const fetchChats = async (): Promise<EvoChat[]> => {
    const c = await makeClient()
    if (!c) return []

    // Conforme documentação oficial e issues do GitHub:
    // GET /chat/findChats/{instance} com body {} é o formato correcto
    const attempts = [
      // Formato documentado no GitHub issue (GET com data body)
      () => c.http.request({ method: 'get', url: `/chat/findChats/${c.instance}`, data: {} }),
      // POST alternativo
      () => c.http.post(`/chat/findChats/${c.instance}`, {}),
      // GET sem body
      () => c.http.get(`/chat/findChats/${c.instance}`),
      // Endpoint de contactos — fallback robusto
      () => c.http.get(`/contact/findContacts/${c.instance}`),
      () => c.http.post(`/contact/findContacts/${c.instance}`, { where: {} }),
    ]

    for (const attempt of attempts) {
      try {
        const res = await attempt()
        const raw: any[] = Array.isArray(res.data)
          ? res.data
          : (res.data?.chats || res.data?.contacts || res.data?.data || [])

        if (raw.length > 0) {
          const parsed = raw.map(parseChatRaw).filter(Boolean) as EvoChat[]
          if (parsed.length > 0) {
            console.log(`[EVO] fetchChats: ${parsed.length} chats`)
            return parsed
          }
        }
      } catch (e: any) {
        // silencioso — tenta próximo formato
      }
    }

    console.warn('[EVO] fetchChats: nenhum endpoint funcionou')
    return []
  }

  // ── Enviar mensagem de texto ─────────────────────────────────────────────
  const sendText = async (rawPhone: string, text: string, quotedId?: string) => {
    const c = await makeClient()
    if (!c) throw new Error('Evolution não configurado')

    const number = formatPhone(rawPhone)

    // Tentar formato v2 primeiro, depois formato v1
    const payloads = [
      // Evolution API v2
      {
        number,
        textMessage: { text },
        ...(quotedId ? { quoted: { key: { id: quotedId } } } : {})
      },
      // Evolution API v1 / compatibilidade
      {
        number,
        text,
        ...(quotedId ? { quoted: { key: { id: quotedId } } } : {})
      }
    ]

    let lastError: any
    for (const payload of payloads) {
      try {
        const res = await c.http.post(`/message/sendText/${c.instance}`, payload)
        console.log(`[EVO] sendText OK para ${number}`)
        return res.data
      } catch (e: any) {
        lastError = e
        console.warn(`[EVO] sendText tentativa falhou:`, e?.message)
      }
    }
    throw lastError
  }

  // ── Enviar media ─────────────────────────────────────────────────────────
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
    if (opts.quotedId) payload.quoted = { key: { id: opts.quotedId } }
    const res = await c.http.post(`/message/sendMedia/${c.instance}`, payload)
    return res.data
  }

  // ── Apagar mensagem ──────────────────────────────────────────────────────
  const deleteMessage = async (messageId: string) => {
    const c = await makeClient()
    if (!c) throw new Error('Evolution não configurado')
    const res = await c.http.delete(`/message/delete/${c.instance}`, {
      data: { key: { id: messageId } }
    })
    return res.data
  }

  // ── Configurar webhook ───────────────────────────────────────────────────
  const configureWebhook = async (webhookUrl: string) => {
    const c = await makeClient()
    if (!c) throw new Error('Evolution não configurado')

    const events = ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_SET', 'SEND_MESSAGE']

    // Tentar ambos os endpoints conhecidos
    const endpoints = [
      `/webhook/set/${c.instance}`,
      `/instance/setWebhook/${c.instance}`
    ]

    let lastErr: any
    for (const ep of endpoints) {
      try {
        const res = await c.http.post(ep, { url: webhookUrl, enabled: true, events })
        console.log(`[EVO] Webhook configurado via ${ep}`)
        return res.data
      } catch (e) {
        lastErr = e
      }
    }
    throw lastErr
  }

  // ── Buscar mensagens recentes de TODOS os JIDs (para popular sidebar) ───────
  // Estratégia: primeiro tenta findMessages global, depois usa fetchChats como fallback
  const fetchAllRecent = async (limit = 200): Promise<EvoMessage[]> => {
    const c = await makeClient()
    if (!c) return []

    // Tentativa 1: findMessages sem filtro de JID (retorna global)
    const globalAttempts = [
      () => c.http.post(`/chat/findMessages/${c.instance}`, { where: {}, limit }),
      () => c.http.post(`/chat/findMessages/${c.instance}`, { limit }),
    ]

    for (const attempt of globalAttempts) {
      try {
        const res = await attempt()
        const data = res.data
        const raw: any[] = data?.messages?.records || data?.messages || data?.records || (Array.isArray(data) ? data : [])
        if (Array.isArray(raw) && raw.length > 0) {
          const parsed = raw.map(parseRecord).filter(Boolean) as EvoMessage[]
          const uniqueJids = new Set(parsed.map(m => m.remoteJid)).size
          console.log(`[EVO] fetchAllRecent global: ${parsed.length} msgs de ${uniqueJids} JIDs`)
          if (uniqueJids > 1) return parsed // bom — múltiplos JIDs
        }
      } catch (_) {}
    }

    // Tentativa 2: usar fetchChats para obter JIDs e simular mensagens de sidebar
    // (não temos o conteúdo completo mas temos o suficiente para a lista)
    const chats = await fetchChats()
    if (chats.length > 0) {
      console.log(`[EVO] fetchAllRecent via fetchChats: ${chats.length} chats`)
      // Converter EvoChat para EvoMessage fake (só para popular a sidebar)
      return chats.map(ch => ({
        evoId: `chat_${ch.id}`,
        remoteJid: ch.id,
        fromMe: false,
        content: ch.lastMessage || '',
        type: 'text' as const,
        timestamp: ch.lastTimestamp || Date.now(),
        status: 'DELIVERY_ACK',
        pushName: ch.name
      }))
    }

    return []
  }

  return {
    formatPhone,
    fetchHistory,
    fetchAllRecent,
    fetchChats,
    sendText,
    sendMedia,
    deleteMessage,
    configureWebhook,
    getCredentials,
    saveSettings
  }
}
