import { defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────
// WEBHOOK EVOLUTION — versão directa (sem integração Lojou)
// Identificador principal: remoteJid normalizado (com 258 para Moçambique)
// Nome do contacto: pushName do WhatsApp
// ─────────────────────────────────────────────────────────────

const normalizeRemoteJid = (jid: string): string => {
  if (!jid.includes('@s.whatsapp.net')) return jid
  const raw = jid.split('@')[0].replace(/\D/g, '')
  // Moçambique: 9 dígitos começando em 8 → adiciona 258
  if (raw.length === 9 && raw.startsWith('8')) {
    return '258' + raw + '@s.whatsapp.net'
  }
  return jid
}

const normalizeTimestamp = (raw: unknown): string => {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return new Date().toISOString()
  return new Date(value > 1_000_000_000_000 ? value : value * 1000).toISOString()
}

const extractContent = (message: any) => {
  let node = message?.message || {}
  if (node.ephemeralMessage) node = node.ephemeralMessage.message || {}
  if (node.viewOnceMessage) node = node.viewOnceMessage.message || {}
  if (node.viewOnceMessageV2) node = node.viewOnceMessageV2.message || {}

  let type: 'text' | 'image' | 'audio' | 'video' | 'document' = 'text'
  let content = ''
  let mediaUrl: string | null = null
  let mimeType: string | null = null
  let caption: string | null = null

  if (node.conversation) {
    content = node.conversation
  } else if (node.extendedTextMessage) {
    content = node.extendedTextMessage.text || ''
  } else if (node.imageMessage) {
    type = 'image'
    caption = node.imageMessage.caption || null
    content = caption || '[Imagem]'
    mediaUrl = node.imageMessage.url || null
    mimeType = node.imageMessage.mimetype || 'image/jpeg'
  } else if (node.audioMessage || node.pttMessage) {
    const a = node.audioMessage || node.pttMessage
    type = 'audio'
    content = '[Áudio]'
    mediaUrl = a?.url || null
    mimeType = a?.mimetype || 'audio/ogg'
  } else if (node.videoMessage) {
    type = 'video'
    caption = node.videoMessage.caption || null
    content = caption || '[Vídeo]'
    mediaUrl = node.videoMessage.url || null
    mimeType = node.videoMessage.mimetype || 'video/mp4'
  } else if (node.documentMessage) {
    type = 'document'
    content = node.documentMessage.fileName || node.documentMessage.title || '[Documento]'
    mediaUrl = node.documentMessage.url || null
    mimeType = node.documentMessage.mimetype || 'application/octet-stream'
  } else if (node.stickerMessage) {
    type = 'image'
    content = '[Sticker]'
    mediaUrl = node.stickerMessage.url || null
    mimeType = node.stickerMessage.mimetype || 'image/webp'
  } else if (node.buttonsMessage || node.templateMessage || node.listMessage) {
    content = node.buttonsMessage?.contentText
      || node.templateMessage?.hydratedTemplate?.hydratedContentText
      || node.listMessage?.description
      || '[Mensagem Interativa]'
  } else {
    const fallback = node.text || node.caption || node.description
    content = fallback || ''
  }

  return { type, content, mediaUrl, mimeType, caption }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const rawEvent = String(body?.event || body?.type || '').toUpperCase().replace(/\./g, '_')
  const allowedEvents = ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_SET', 'SEND_MESSAGE']

  if (!allowedEvents.includes(rawEvent)) {
    return { status: 'ignored', event: rawEvent }
  }

  // ── Extrair payload ──────────────────────────────────────────────────────
  const payload = body?.data || body
  const message = payload?.message && payload?.key ? payload : (payload?.message || payload)

  if (!message?.key) {
    console.error('[WEBHOOK] Missing key:', JSON.stringify(body).substring(0, 200))
    return { status: 'error', reason: 'missing_key' }
  }

  const remoteJid = normalizeRemoteJid(String(message.key.remoteJid || ''))
  const messageId = String(message.key.id || '')
  const pushName: string | null = payload?.pushName || message?.pushName || null
  const isOutgoing = Boolean(message.key.fromMe) || rawEvent === 'SEND_MESSAGE'

  // Ignorar grupos e broadcast status
  if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid.startsWith('status@')) {
    return { status: 'ignored', reason: 'group_or_status' }
  }

  // Validar número
  const phone = remoteJid.split('@')[0]
  if (!phone || !/^\d+$/.test(phone)) {
    return { status: 'ignored', reason: 'invalid_phone' }
  }

  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.public.supabaseKey as string
  )

  // ── Upsert contacto por remoteJid (identificador único) ─────────────────
  // Nunca criar duplicados — conflito resolve-se pelo remoteJid
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .upsert({
      remote_jid: remoteJid,
      phone: phone,
      // Só actualiza o nome se o pushName vier preenchido (não apagar nome existente)
      ...(pushName ? { name: pushName } : {}),
      source: 'evolution',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'remote_jid',
      ignoreDuplicates: false
    })
    .select('id, name, user_id')
    .maybeSingle()

  if (contactError) {
    console.error('[WEBHOOK] Erro ao upsert contacto:', JSON.stringify(contactError))
  }

  // ── Guardar mensagem (idempotente pelo message_id) ───────────────────────
  if (!messageId) {
    return { status: 'ok', event: rawEvent, reason: 'no_message_id' }
  }

  const { content, type, mediaUrl, mimeType, caption } = extractContent(message)

  const { error: msgError } = await supabase
    .from('messages')
    .upsert({
      id: messageId,
      message_id: messageId,
      contact_id: contact?.id || null,
      remote_jid: remoteJid,
      content: content || '',
      type,
      is_outgoing: isOutgoing,
      status: 'delivered',
      timestamp: normalizeTimestamp(message.messageTimestamp),
      media_url: mediaUrl,
      mime_type: mimeType,
      caption,
      push_name: pushName,  // campo directo para o Realtime usar sem ir ao metadata
      metadata: {
        source: 'webhook_evolution',
        event: rawEvent,
        pushName,
        messageId
      }
    }, { onConflict: 'message_id' })

  if (msgError) {
    console.error('[WEBHOOK] Erro ao guardar mensagem:', JSON.stringify(msgError))
  }

  console.log(`[WEBHOOK] ✅ ${rawEvent} | ${remoteJid} | out:${isOutgoing} | "${content.substring(0, 40)}"`)

  return {
    status: 'ok',
    event: rawEvent,
    jid: remoteJid,
    message_id: messageId,
    contact_id: contact?.id || null,
    contact_name: contact?.name || pushName || phone
  }
})
