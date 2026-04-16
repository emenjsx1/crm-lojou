import { defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

// ─────────────────────────────────────────────
// REGRA ABSOLUTA:
//   Identificador principal = remoteJid COMPLETO
//   Match na Lojou = EXACTO (===), nunca includes/startsWith
// ─────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const eventName = (body.event || body.type || '').toUpperCase()

  const allowedEvents = ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_SET', 'SEND_MESSAGE']
  if (!allowedEvents.includes(eventName)) {
    return { status: 'ignored', event: eventName }
  }

  // ── 1. Extrair identificadores únicos ──────────────────────────────────
  const payload  = body.data || body
  const message  = payload.message || payload

  if (!message?.key) {
    return { status: 'error', reason: 'missing_key' }
  }

  const remoteJid = message.key.remoteJid || ''
  const messageId = message.key.id        || ''

  // Ignorar grupos e status
  if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid.startsWith('status@')) {
    return { status: 'ignored', reason: 'group_or_status' }
  }

  // phone = número EXACTO tal como o WhatsApp envia (ex: 258855253617)
  // NUNCA remover prefixo para armazenar, mas normalizar para comparação com Lojou
  const phone = remoteJid.split('@')[0]
  if (!phone || !/^\d+$/.test(phone)) {
    return { status: 'ignored', reason: 'invalid_phone' }
  }

  // Helper: strip paese-code 258 para comparar com Lojou (que guarda sem prefixo)
  // Match exacto após normalização — nunca includes/startsWith/LIKE
  const normalizePhone = (p: string): string => {
    const s = String(p).trim().replace(/\D/g, '')
    return s.startsWith('258') && s.length > 9 ? s.slice(3) : s
  }
  const phoneLocal = normalizePhone(phone) // ex: "855253617"

  const pushName  = payload.pushName || message.pushName || phone
  const isOutgoing = !!message.key.fromMe || eventName === 'SEND_MESSAGE'

  const config  = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.public.supabaseKey as string
  )

  // ── 2. Buscar ou criar contacto por remoteJid (UNIQUE) ─────────────────
  // NUNCA reutilizar contacto baseado em número parcial.
  // O remoteJid é o único identificador aceite.
  let { data: contact } = await supabase
    .from('contacts')
    .select('id, remote_jid, phone, user_id, name')
    .eq('remote_jid', remoteJid)   // ← MATCH EXACTO por JID completo
    .maybeSingle()

  // ── 3. Verificar na Lojou se não temos user_id ainda ───────────────────
  // Verifica para: (a) contacto novo, (b) contacto existente sem user_id
  const needsLojouCheck = !contact || !contact.user_id

  let lojouUser: any = null

  if (needsLojouCheck) {
    const { data: tokenSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'lojou_admin_token')
      .maybeSingle()

    const adminToken = tokenSetting?.value
    const tokenValid = adminToken && adminToken !== 'REPLACE_WITH_ACTUAL_TOKEN'

    if (tokenValid) {
      try {
        const lojouRes = await axios.get('https://api.lojou.app/api/admin/users', {
          params: { search: phone, is_paginate: 0 },
          headers: { Authorization: `Bearer ${adminToken}` },
          timeout: 5000
        })

        const users: any[] = lojouRes.data?.users || lojouRes.data?.data || []

        // ── MATCH EXACTO após normalização ─────────────────────────────
        // Lojou guarda "855253617", WhatsApp envia "258855253617"
        // Normalizamos ambos removendo o prefixo 258 → comparação exacta
        lojouUser = users.find((u: any) => {
          const lojouPhone = normalizePhone(String(u.phone_number || u.phone || ''))
          return lojouPhone === phoneLocal && lojouPhone.length > 0
        }) ?? null

        if (lojouUser) {
          console.log(`[WEBHOOK] ✅ Usuário Lojou encontrado: ${lojouUser.name} (${phone})`)
        } else {
          console.log(`[WEBHOOK] ⚠️  Número ${phone} NÃO existe na Lojou → Lead`)
        }
      } catch (err: any) {
        console.error('[WEBHOOK] Erro ao consultar Lojou:', err.message)
      }
    }
  }

  // ── 4. Persistir utilizador Lojou localmente (cache) ───────────────────
  let userId: string | null = contact?.user_id ?? null

  if (lojouUser && !userId) {
    const { data: localUser } = await supabase
      .from('users')
      .upsert({
        id:       String(lojouUser.id),
        name:     lojouUser.full_name || lojouUser.name || lojouUser.firstname || phone,
        phone:    phone,
        balance:  lojouUser.balance ?? 0,
        status:   lojouUser.status  ?? 'active',
        metadata: lojouUser       // payload completo para referência futura
      }, { onConflict: 'id' })
      .select('id')
      .single()

    userId = localUser?.id ?? null
  }

  // ── 5. Criar ou actualizar contacto ────────────────────────────────────
  if (!contact) {
    // Contacto novo → INSERT
    const { data: newContact } = await supabase
      .from('contacts')
      .insert({
        remote_jid: remoteJid,        // ÚNICO + IMUTÁVEL
        phone:      phone,
        user_id:    userId,
        name:       lojouUser?.full_name || lojouUser?.name || pushName || phone,
        metadata: {
          source:   userId ? 'lojou' : 'lead',
          pushName,
          created_by: 'webhook'
        }
      })
      .select('id, user_id')
      .single()

    contact = newContact
  } else if (lojouUser && !contact.user_id) {
    // Contacto existia mas era lead → agora identificámos → UPDATE
    const { data: updated } = await supabase
      .from('contacts')
      .update({
        user_id: userId,
        name:    lojouUser.full_name || lojouUser.name || contact.name,
        metadata: {
          source:        'lojou',
          pushName,
          upgraded_at:   new Date().toISOString()
        }
      })
      .eq('remote_jid', remoteJid)
      .select('id, user_id')
      .single()

    contact = updated
  }

  // ── 6. Processar conteúdo da mensagem ──────────────────────────────────
  let msgContent = message.message || {}
  if (msgContent.ephemeralMessage)   msgContent = msgContent.ephemeralMessage.message  || {}
  if (msgContent.viewOnceMessage)    msgContent = msgContent.viewOnceMessage.message    || {}
  if (msgContent.viewOnceMessageV2)  msgContent = msgContent.viewOnceMessageV2.message  || {}

  let type: string     = 'text'
  let content: string  = ''
  let mediaUrl: string = ''
  let mimeType: string = ''
  let caption: string  = ''

  if (msgContent.conversation) {
    content = msgContent.conversation
  } else if (msgContent.extendedTextMessage) {
    content = msgContent.extendedTextMessage.text || ''
  } else if (msgContent.imageMessage) {
    type     = 'image'
    caption  = msgContent.imageMessage.caption || ''
    content  = caption || '[Imagem]'
    mediaUrl = msgContent.imageMessage.url || ''
    mimeType = msgContent.imageMessage.mimetype || 'image/jpeg'
  } else if (msgContent.audioMessage || msgContent.pttMessage) {
    const am = msgContent.audioMessage || msgContent.pttMessage
    type     = 'audio'
    content  = '[Áudio]'
    mediaUrl = am?.url || ''
    mimeType = am?.mimetype || 'audio/ogg'
  } else if (msgContent.videoMessage) {
    type     = 'video'
    caption  = msgContent.videoMessage.caption || ''
    content  = caption || '[Vídeo]'
    mediaUrl = msgContent.videoMessage.url || ''
    mimeType = msgContent.videoMessage.mimetype || 'video/mp4'
  } else if (msgContent.documentMessage) {
    type     = 'document'
    content  = msgContent.documentMessage.fileName || '[Documento]'
    mediaUrl = msgContent.documentMessage.url || ''
    mimeType = msgContent.documentMessage.mimetype || 'application/octet-stream'
  } else if (msgContent.stickerMessage) {
    type     = 'image'
    content  = '[Sticker]'
    mediaUrl = msgContent.stickerMessage.url || ''
    mimeType = msgContent.stickerMessage.mimetype || 'image/webp'
  }

  // ── 7. Guardar mensagem (UNIQUE por message_id) ────────────────────────
  if (messageId) {
    const { error: msgError } = await supabase
      .from('messages')
      .upsert({
        id:          messageId,
        message_id:  messageId,
        remote_jid:  remoteJid,                 // ← Sempre o JID completo
        contact_id:  contact?.id ?? null,       // ← UUID do contacto (relação limpa)
        content:     content || '',
        type,
        is_outgoing: isOutgoing,
        status:      'delivered',
        timestamp:   message.messageTimestamp
          ? new Date(Number(message.messageTimestamp) * 1000).toISOString()
          : new Date().toISOString(),
        media_url:   mediaUrl  || null,
        mime_type:   mimeType  || null,
        caption:     caption   || null,
        metadata:    body                        // payload completo para auditoria
      }, { onConflict: 'message_id' })           // ← idempotente por message_id

    if (msgError) {
      console.error('[WEBHOOK] Erro ao salvar mensagem:', JSON.stringify(msgError))
    }
  }

  // ── 8. Resposta ─────────────────────────────────────────────────────────
  return {
    status:     'ok',
    jid:        remoteJid,
    phone,
    contact_id: contact?.id   ?? null,
    user_id:    contact?.user_id ?? null,
    classified: contact?.user_id ? 'known_user' : 'new_lead'
  }
})
