import { defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const eventName = (body.event || body.type || '').toUpperCase()
  
  // 1. Log Payload Completo (Audit)
  console.log(`[WEBHOOK] Evento: ${eventName}`)
  
  const allowedEvents = [
    'MESSAGES_UPSERT', 
    'MESSAGES_UPDATE', 
    'MESSAGES_SET', 
    'SEND_MESSAGE'
  ]

  if (!allowedEvents.includes(eventName)) {
    return { status: 'ignored', event: eventName }
  }

  const payload = body.data || body
  const message = payload.message || payload
  
  if (!message || !message.key) {
    return { status: 'error', message: 'Invalid payload' }
  }

  // 2. Identificadores Únicos Obrigatórios
  const remoteJid = message.key.remoteJid || ''
  const messageId = message.key.id || ''

  if (!remoteJid || remoteJid.includes('@g.us')) {
    return { status: 'ignored', reason: remoteJid.includes('@g.us') ? 'group_message' : 'no_jid' }
  }

  const phone = remoteJid.split('@')[0]
  if (!phone || phone.includes('status')) {
    return { status: 'ignored', reason: 'invalid_jid' }
  }

  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.public.supabaseKey as string
  )

  // 3. Garantir Existência do Contato (Mapping: remoteJid -> contact)
  let { data: contactRecord } = await supabase
    .from('contacts')
    .select('*, users(*)')
    .eq('remote_jid', remoteJid)
    .maybeSingle()

  if (!contactRecord) {
    console.log(`[WEBHOOK] Criando novo contato para JID: ${remoteJid}`)
    
    // Tentar buscar informações do usuário no sistema Lojou se possível
    // NOTA: O usuário mencionou no áudio que o token/session já deve estar configurado internamente.
    // Usaremos o token de admin se disponível no banco para identificação inicial.
    
    const { data: tokenSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'lojou_admin_token')
      .maybeSingle()
    
    const adminToken = tokenSetting?.value
    let userData = null

    if (adminToken && adminToken !== 'REPLACE_WITH_ACTUAL_TOKEN') {
      try {
        const lojouRes = await axios.get('https://api.lojou.app/api/admin/users', {
          params: { search: phone, is_paginate: 0 },
          headers: { Authorization: `Bearer ${adminToken}` }
        })
        const users = lojouRes.data?.users || lojouRes.data?.data || []
        userData = Array.isArray(users) ? users.find((u: any) => 
          String(u.phone_number || u.phone || '').includes(phone)
        ) : null
      } catch (e) {}
    }

    let userId = null
    if (userData) {
      const { data: localUser } = await supabase
        .from('users')
        .upsert({
          id: String(userData.id),
          name: userData.full_name || userData.name || userData.firstname,
          phone: phone,
          balance: userData.balance || 0,
          metadata: userData
        })
        .select().single()
      userId = localUser?.id
    }

    const { data: newContact } = await supabase
      .from('contacts')
      .insert({
        remote_jid: remoteJid,
        phone: phone,
        user_id: userId,
        name: payload.pushName || message.pushName || userData?.name || phone,
        metadata: { source: 'webhook_auto_create', pushName: payload.pushName }
      })
      .select().single()
    contactRecord = newContact
  }

  // 4. Processamento de Conteúdo
  let msgContent = message.message || {}
  if (msgContent.ephemeralMessage) msgContent = msgContent.ephemeralMessage.message || {}
  if (msgContent.viewOnceMessage) msgContent = msgContent.viewOnceMessage.message || {}
  
  let type = 'text'
  let content = ''
  let mediaUrl = ''
  let mimeType = ''
  let caption = ''

  if (msgContent.conversation) {
    content = msgContent.conversation
  } else if (msgContent.extendedTextMessage) {
    content = msgContent.extendedTextMessage.text || ''
  } else if (msgContent.imageMessage) {
    type = 'image'
    caption = msgContent.imageMessage.caption || ''
    content = caption || '[Imagem]'
    mediaUrl = msgContent.imageMessage.url
    mimeType = msgContent.imageMessage.mimetype
  } else if (msgContent.audioMessage || msgContent.pttMessage) {
    type = 'audio'
    content = '[Áudio]'
    const am = msgContent.audioMessage || msgContent.pttMessage
    mediaUrl = am?.url
    mimeType = am?.mimetype
  } else if (msgContent.videoMessage) {
    type = 'video'
    content = msgContent.videoMessage.caption || '[Vídeo]'
    mediaUrl = msgContent.videoMessage.url
    mimeType = msgContent.videoMessage.mimetype
  } else if (msgContent.documentMessage) {
    type = 'document'
    content = msgContent.documentMessage.fileName || '[Documento]'
    mediaUrl = msgContent.documentMessage.url
    mimeType = msgContent.documentMessage.mimetype
  }

  // 5. Upsert de Mensagem (Trava Anti-Bug: Unique por message_id e remote_jid)
  // Nota: Salvamos contact_id (UUID) para relação correta e o remote_jid para auditoria
  const { error: msgError } = await supabase
    .from('messages')
    .upsert({
      id: messageId, // Manter id como PK ou alternativo
      message_id: messageId,
      remote_jid: remoteJid,
      contact_id: contactRecord?.id, // Vínculo UUID
      content: content || '',
      type,
      is_outgoing: !!message.key.fromMe || eventName === 'SEND_MESSAGE',
      status: 'delivered',
      timestamp: message.messageTimestamp ? new Date(message.messageTimestamp * 1000).toISOString() : new Date().toISOString(),
      media_url: mediaUrl,
      mime_type: mimeType,
      caption,
      metadata: body // Salvar payload completo para auditoria
    }, { onConflict: 'message_id' })

  if (msgError) {
    console.error('[WEBHOOK ERROR] Falha ao salvar mensagem:', msgError)
  }

  return { 
    status: 'success', 
    jid: remoteJid, 
    contact_id: contactRecord?.id 
  }
})

