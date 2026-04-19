import type { SupabaseClient } from '@supabase/supabase-js'

/** JID canónico MZ (@s.whatsapp.net com 258 quando aplicável) */
export const normalizeRemoteJid = (jid: string): string => {
  if (!jid.includes('@s.whatsapp.net')) return jid
  const raw = jid.split('@')[0].replace(/\D/g, '')
  if (raw.length === 9 && raw.startsWith('8')) return `258${raw}@s.whatsapp.net`
  return jid
}

/** DM: prioriza @s.whatsapp.net (recebidas com @lid usam remoteJidAlt). */
export const resolveDirectChatRemoteJid = (key: any): string => {
  const primary = String(key?.remoteJid || '')
  const alt = String(key?.remoteJidAlt || '')
  if (primary.endsWith('@lid') && alt.includes('@s.whatsapp.net')) return normalizeRemoteJid(alt)
  if (primary.includes('@s.whatsapp.net')) return normalizeRemoteJid(primary)
  if (alt.includes('@s.whatsapp.net')) return normalizeRemoteJid(alt)
  return normalizeRemoteJid(primary || alt)
}

const normalizeTimestamp = (raw: unknown): string => {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return new Date().toISOString()
  return new Date(value > 1_000_000_000_000 ? value : value * 1000).toISOString()
}

const mapReceiptStatus = (raw: unknown): string => {
  if (typeof raw === 'number') {
    if (raw >= 4) return 'read'
    if (raw === 3) return 'delivered'
    if (raw === 2) return 'sent'
    if (raw === 1) return 'sending'
  }
  const s = String(raw || '').toUpperCase()
  if (s.includes('READ')) return 'read'
  if (s.includes('DELIVERY') || s === 'DELIVERY_ACK') return 'delivered'
  if (s.includes('SERVER') || s === 'SERVER_ACK') return 'sent'
  if (s.includes('PENDING')) return 'sending'
  return 'delivered'
}

export const extractContent = (message: any) => {
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
  } else if (node.reactionMessage) {
    content = `[Reacção: ${node.reactionMessage?.text || '…'}]`
  } else if (node.contactMessage) {
    content = '[Contacto]'
  } else if (node.locationMessage) {
    content = '[Localização]'
  } else if (node.liveLocationMessage) {
    content = '[Localização em tempo real]'
  } else {
    const fallback = node.text || node.caption || node.description
    content = (fallback && String(fallback)) || '[Mensagem]'
  }

  return { type, content, mediaUrl, mimeType, caption }
}

export const extractWebhookMessageItems = (body: any): { rawEvent: string; items: any[] } => {
  const rawEvent = String(body?.event || body?.type || '').toUpperCase().replace(/\./g, '_')
  const payload = body?.data !== undefined ? body.data : body

  const asArray = (x: any): any[] => (Array.isArray(x) ? x : [])

  if (['MESSAGES_UPSERT', 'MESSAGES_SET', 'SEND_MESSAGE'].includes(rawEvent)) {
    if (Array.isArray(payload)) return { rawEvent, items: payload }
    const inner = payload?.messages?.records || payload?.messages
    if (Array.isArray(inner)) return { rawEvent, items: inner }
    if (payload?.key && (payload.message !== undefined || payload.messageTimestamp !== undefined))
      return { rawEvent, items: [payload] }
    if (Array.isArray(body?.messages)) return { rawEvent, items: body.messages }
  }

  if (['MESSAGES_UPDATE', 'MESSAGES_RECEIPT_UPDATE'].includes(rawEvent)) {
    if (Array.isArray(payload)) return { rawEvent, items: payload }
    if (Array.isArray(payload?.messages)) return { rawEvent, items: payload.messages }
    if (payload?.key) return { rawEvent, items: [payload] }
  }

  if (payload?.key) return { rawEvent, items: [payload] }
  return { rawEvent, items: asArray(payload) }
}

const logWebhookDebug = (remoteJid: string, fromMe: boolean, messageId: string, timestamp: string, event: string) => {
  console.log('[WEBHOOK]', JSON.stringify({ remoteJid, fromMe, messageId, timestamp, event }))
}

async function upsertContactWithLastMessage(
  supabase: SupabaseClient,
  base: {
    remote_jid: string
    phone: string
    name?: string
    source: string
    updated_at: string
    last_message_at: string
    last_message_preview: string
    last_message_from_me: boolean
  }
) {
  const minimal = {
    remote_jid: base.remote_jid,
    phone: base.phone,
    ...(base.name ? { name: base.name } : {}),
    source: base.source,
    updated_at: base.updated_at
  }
  const extended = {
    ...minimal,
    last_message_at: base.last_message_at,
    last_message_preview: base.last_message_preview,
    last_message_from_me: base.last_message_from_me
  }

  let { data, error } = await supabase
    .from('contacts')
    .upsert(extended, { onConflict: 'remote_jid', ignoreDuplicates: false })
    .select('id, name, user_id')
    .maybeSingle()

  if (error && /last_message|column/i.test(String(error.message || error))) {
    const r2 = await supabase
      .from('contacts')
      .upsert(minimal, { onConflict: 'remote_jid', ignoreDuplicates: false })
      .select('id, name, user_id')
      .maybeSingle()
    data = r2.data
    error = r2.error
  }

  return { data, error }
}

export async function handleEvolutionWebhookBody(body: any, supabase: SupabaseClient) {
  const { rawEvent, items } = extractWebhookMessageItems(body)

  const allowedUpsert = ['MESSAGES_UPSERT', 'MESSAGES_SET', 'SEND_MESSAGE']
  const allowedUpdate = ['MESSAGES_UPDATE', 'MESSAGES_RECEIPT_UPDATE']
  const allowed = [...allowedUpsert, ...allowedUpdate]

  if (!allowed.includes(rawEvent)) {
    return { status: 'ignored', event: rawEvent }
  }

  if (items.length === 0) {
    return { status: 'ignored', event: rawEvent, reason: 'no_items' }
  }

  const results: any[] = []

  for (const entry of items) {
    const message = entry?.message && entry?.key ? entry : (entry?.message || entry)
    if (!message?.key) {
      console.error('[WEBHOOK] item sem key:', JSON.stringify(entry).substring(0, 160))
      continue
    }

    const remoteJid = resolveDirectChatRemoteJid(message.key)
    const messageId = String(message.key.id || '')
    const pushName: string | null = entry?.pushName || message?.pushName || body?.pushName || null
    const isOutgoing = Boolean(message.key.fromMe) || rawEvent === 'SEND_MESSAGE'

    if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid.startsWith('status@')) {
      results.push({ skipped: 'group_or_status', remoteJid })
      continue
    }

    if (!remoteJid.endsWith('@s.whatsapp.net')) {
      console.warn('[WEBHOOK] JID sem @s.whatsapp.net (ex.: @lid sem alt) — ignorado:', remoteJid)
      results.push({ skipped: 'unsupported_jid', remoteJid })
      continue
    }

    const phone = remoteJid.split('@')[0]
    if (!phone || !/^\d+$/.test(phone)) {
      results.push({ skipped: 'invalid_phone', remoteJid })
      continue
    }

    const tsIso = normalizeTimestamp(message.messageTimestamp ?? entry?.messageTimestamp)

    logWebhookDebug(remoteJid, isOutgoing, messageId || '(sem id)', tsIso, rawEvent)

    // ── Updates / recibos: só estado ─────────────────────────────────────
    if (allowedUpdate.includes(rawEvent)) {
      if (!messageId) {
        results.push({ ok: false, reason: 'no_message_id' })
        continue
      }
      const patch = entry?.update || message?.update || {}
      const statusRaw = patch.status || patch.readReceipt || message?.status || 'DELIVERY_ACK'
      const status = mapReceiptStatus(String(statusRaw))

      const { error } = await supabase
        .from('messages')
        .update({ status })
        .eq('message_id', messageId)

      if (error) console.error('[WEBHOOK] update status:', JSON.stringify(error))
      results.push({ status: 'updated', message_id: messageId, delivery: status })
      continue
    }

    if (!messageId) {
      results.push({ status: 'ok', reason: 'no_message_id' })
      continue
    }

    const { content, type, mediaUrl, mimeType, caption } = extractContent(message)
    const safeContent = content || '[Mensagem]'

    const contactRes = await upsertContactWithLastMessage(supabase, {
      remote_jid: remoteJid,
      phone,
      ...(pushName ? { name: pushName } : {}),
      source: 'evolution',
      updated_at: new Date().toISOString(),
      last_message_at: tsIso,
      last_message_preview: safeContent.slice(0, 200),
      last_message_from_me: isOutgoing
    })

    if (contactRes.error) {
      console.error('[WEBHOOK] Erro ao upsert contacto:', JSON.stringify(contactRes.error))
    }

    const contact = contactRes.data as { id?: string; name?: string; user_id?: string | null } | null

    const { error: msgError } = await supabase
      .from('messages')
      .upsert({
        id: messageId,
        message_id: messageId,
        contact_id: contact?.id || null,
        remote_jid: remoteJid,
        content: safeContent,
        type,
        is_outgoing: isOutgoing,
        status: 'delivered',
        timestamp: tsIso,
        media_url: mediaUrl,
        mime_type: mimeType,
        caption,
        push_name: pushName,
        metadata: {
          source: 'webhook_evolution',
          event: rawEvent,
          pushName,
          messageId,
          from_me: isOutgoing
        }
      }, { onConflict: 'message_id' })

    if (msgError) console.error('[WEBHOOK] Erro ao guardar mensagem:', JSON.stringify(msgError))

    console.log(`[WEBHOOK] ✅ ${rawEvent} | ${remoteJid} | out:${isOutgoing} | "${safeContent.substring(0, 40)}"`)
    results.push({
      status: 'ok',
      event: rawEvent,
      jid: remoteJid,
      message_id: messageId,
      contact_id: contact?.id || null,
      contact_name: contact?.name || pushName || phone
    })
  }

  return { status: 'ok', event: rawEvent, processed: results.length, results }
}
