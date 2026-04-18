import { defineEventHandler, readBody } from 'h3'
import {
  createServerSupabase,
  lookupLojouUserByPhone,
  normalizePhone,
  normalizeRemoteJid,
  upsertContactAssociation,
  upsertLocalUserCache
} from '~/server/utils/lojou'

const normalizeTimestamp = (raw: unknown) => {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) {
    return new Date().toISOString()
  }
  return new Date(value > 1000000000000 ? value : value * 1000).toISOString()
}

const extractMessagePayload = (body: any) => {
  const payload = body?.data || body
  const message = payload?.message && payload?.key ? payload : (payload?.message || payload)
  return { payload, message }
}

const extractMessageContent = (message: any) => {
  let contentNode = message?.message || {}
  if (contentNode.ephemeralMessage) contentNode = contentNode.ephemeralMessage.message || {}
  if (contentNode.viewOnceMessage) contentNode = contentNode.viewOnceMessage.message || {}
  if (contentNode.viewOnceMessageV2) contentNode = contentNode.viewOnceMessageV2.message || {}

  let type: 'text' | 'image' | 'audio' | 'video' | 'document' = 'text'
  let content = ''
  let mediaUrl: string | null = null
  let mimeType: string | null = null
  let caption: string | null = null

  if (contentNode.conversation) {
    content = contentNode.conversation
  } else if (contentNode.extendedTextMessage) {
    content = contentNode.extendedTextMessage.text || ''
  } else if (contentNode.imageMessage) {
    type = 'image'
    caption = contentNode.imageMessage.caption || null
    content = caption || '[Imagem]'
    mediaUrl = contentNode.imageMessage.url || null
    mimeType = contentNode.imageMessage.mimetype || 'image/jpeg'
  } else if (contentNode.audioMessage || contentNode.pttMessage) {
    const audioNode = contentNode.audioMessage || contentNode.pttMessage
    type = 'audio'
    content = '[Áudio]'
    mediaUrl = audioNode?.url || null
    mimeType = audioNode?.mimetype || 'audio/ogg'
  } else if (contentNode.videoMessage) {
    type = 'video'
    caption = contentNode.videoMessage.caption || null
    content = caption || '[Vídeo]'
    mediaUrl = contentNode.videoMessage.url || null
    mimeType = contentNode.videoMessage.mimetype || 'video/mp4'
  } else if (contentNode.documentMessage) {
    type = 'document'
    content = contentNode.documentMessage.fileName || contentNode.documentMessage.title || '[Documento]'
    mediaUrl = contentNode.documentMessage.url || null
    mimeType = contentNode.documentMessage.mimetype || 'application/octet-stream'
  } else if (contentNode.stickerMessage) {
    type = 'image'
    content = '[Sticker]'
    mediaUrl = contentNode.stickerMessage.url || null
    mimeType = contentNode.stickerMessage.mimetype || 'image/webp'
  }

  return { type, content, mediaUrl, mimeType, caption }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const rawEvent = String(body?.event || body?.type || '').toUpperCase()
  const eventName = rawEvent.replace(/\./g, '_')
  const allowedEvents = ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_SET', 'SEND_MESSAGE']

  if (!allowedEvents.includes(eventName)) {
    return { status: 'ignored', event: eventName }
  }

  const { payload, message } = extractMessagePayload(body)
  if (!message?.key) {
    console.error('[WEBHOOK] Missing key in payload:', JSON.stringify(body).substring(0, 300))
    return { status: 'error', reason: 'missing_key' }
  }

  const remoteJid = normalizeRemoteJid(message.key.remoteJid || '')
  const messageId = String(message.key.id || '')
  const pushName = payload?.pushName || message?.pushName || null
  const isOutgoing = Boolean(message.key.fromMe) || eventName === 'SEND_MESSAGE'

  if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid.startsWith('status@')) {
    return { status: 'ignored', reason: 'group_or_status' }
  }

  const phone = remoteJid.split('@')[0]
  const phoneLocal = normalizePhone(phone)
  if (!phoneLocal) {
    return { status: 'ignored', reason: 'invalid_phone' }
  }

  const supabase = createServerSupabase()

  const { data: existingContact } = await supabase
    .from('contacts')
    .select('*')
    .eq('remote_jid', remoteJid)
    .maybeSingle()

  const shouldLookupLojou = !isOutgoing || !existingContact?.user_id
  const lookup = shouldLookupLojou
    ? await lookupLojouUserByPhone(supabase, phone)
    : { found: false, user: null, authSource: null, error: null as string | null }

  const localUser = lookup.found && lookup.user
    ? await upsertLocalUserCache(supabase, lookup.user)
    : null

  const contact = await upsertContactAssociation(supabase, {
    remoteJid,
    phone,
    pushName,
    existingContact,
    localUser,
    source: localUser ? 'lojou' : 'lead',
    lookupError: lookup.error || null
  })

  const messageData = extractMessageContent(message)
  const messageMetadata = {
    source: 'webhook_evolution',
    event: eventName,
    remoteJid,
    normalized_phone: phoneLocal,
    messageId,
    pushName,
    lookup: {
      auth_source: lookup.authSource,
      found_user: Boolean(localUser),
      error: lookup.error || null
    },
    payload: body
  }

  if (messageId) {
    const { error } = await supabase
      .from('messages')
      .upsert({
        id: messageId,
        message_id: messageId,
        contact_id: contact?.id || null,
        remote_jid: remoteJid,
        content: messageData.content || '',
        type: messageData.type,
        is_outgoing: isOutgoing,
        status: 'delivered',
        timestamp: normalizeTimestamp(message.messageTimestamp),
        media_url: messageData.mediaUrl,
        mime_type: messageData.mimeType,
        caption: messageData.caption,
        metadata: messageMetadata
      }, { onConflict: 'message_id' })

    if (error) {
      console.error('[WEBHOOK] Failed to persist message:', JSON.stringify(error))
    }
  }

  return {
    status: 'ok',
    event: eventName,
    jid: remoteJid,
    phone,
    message_id: messageId,
    contact_id: contact?.id || null,
    user_id: contact?.user_id || null,
    classified: contact?.user_id ? 'known_user' : 'new_lead'
  }
})
