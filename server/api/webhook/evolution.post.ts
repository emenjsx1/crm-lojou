import { defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const eventName = (body.event || body.type || '').toUpperCase()
  
  console.log(`[WEBHOOK AUDIT] Evento recebido: ${eventName}`)
  console.log(`[WEBHOOK AUDIT] Payload completo:`, JSON.stringify(body, null, 2))

  // Lista de eventos que nos interessam para atualizar conversas
  const allowedEvents = [
    'MESSAGES_UPSERT', 
    'MESSAGES_UPDATE', 
    'MESSAGES_SET', 
    'SEND_MESSAGE'
  ]

  if (!allowedEvents.includes(eventName)) {
    console.log(`[WEBHOOK AUDIT] Evento ${eventName} ignorado (fora da lista permitida)`)
    return { status: 'ignored', event: eventName }
  }

  const payload = body.data || body
  const message = payload.message || payload
  
  if (!message || !message.key) {
    console.log(`[WEBHOOK AUDIT] Payload inválido ou sem chave:`, JSON.stringify(body))
    return { status: 'error', message: 'Invalid payload' }
  }

  const remoteJid = message.key.remoteJid || ''
  if (remoteJid.includes('@g.us')) {
    console.log(`[WEBHOOK AUDIT] Mensagem de grupo ignorada: ${remoteJid}`)
    return { status: 'ignored', reason: 'group_message' }
  }

  const phone = remoteJid.split('@')[0]
  if (!phone || phone.includes('status')) {
    console.log(`[WEBHOOK AUDIT] JID inválido ou status ignorado: ${remoteJid}`)
    return { status: 'ignored', reason: 'invalid_jid' }
  }

  console.log(`[WEBHOOK AUDIT] Processando mensagem - ID: ${message.key.id}, De: ${phone}, FromMe: ${message.key.fromMe}`)

  // Configuração do Supabase (Usando runtime config do Nuxt)
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.public.supabaseKey as string
  )

  // Extração de dados
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

  // Tentar encontrar o ID Lojou oficial associado a este JID (WhatsApp)
  // Olhamos apenas para mensagens anteriores que já foram marcadas com um ID numérico da Lojou
  let finalContactId = phone
  const { data: mappingMsg } = await supabase
    .from('messages')
    .select('contact_id')
    .eq('metadata->key->remoteJid', remoteJid)
    .not('contact_id', 'ilike', '%:%') // Filtro para garantir que pegamos um ID que não seja JID
    .not('contact_id', 'eq', phone)    // Filtro para garantir que não seja o próprio telefone
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (mappingMsg && mappingMsg.contact_id && !isNaN(Number(mappingMsg.contact_id.charAt(0)))) {
    finalContactId = mappingMsg.contact_id
    console.log(`[WEBHOOK] Mapeado com precisão: ${phone} -> ${finalContactId}`)
  }

  // Upsert no banco
  const { error } = await supabase
    .from('messages')
    .upsert({
      id: message.key.id,
      contact_id: finalContactId, 
      content: content || '',
      type,
      is_outgoing: !!message.key.fromMe || eventName === 'SEND_MESSAGE',
      status: 'delivered',
      timestamp: message.messageTimestamp ? new Date(message.messageTimestamp * 1000).toISOString() : new Date().toISOString(),
      media_url: mediaUrl,
      mime_type: mimeType,
      caption,
      metadata: message
    }, { onConflict: 'id, contact_id' })

  if (error) {
    console.error('[WEBHOOK ERROR] Erro no upsert Supabase:', error)
    return { status: 'error', error }
  }

  return { status: 'success', id: message.key.id }
})
