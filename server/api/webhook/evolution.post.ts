import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // A Evolution API envia vários tipos de eventos. O principal é MESSAGES_UPSERT
  if (body.event !== 'MESSAGES_UPSERT' && body.event !== 'messages.upsert') {
    return { status: 'ignored', event: body.event }
  }

  const payload = body.data || body
  const message = payload.message || payload

  if (!message || !message.key) {
    return { status: 'error', message: 'Invalid payload' }
  }

  // Configuração do Supabase (Usando runtime config do Nuxt)
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl,
    config.public.supabaseKey
  )

  // Extração de dados (similar ao parseRecord do frontend)
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

  const phone = (message.key.remoteJid || '').split('@')[0]
  
  // Upsert no banco
  const { error } = await supabase
    .from('messages')
    .upsert({
      id: message.key.id,
      contact_id: phone, // Aqui usamos o telefone como ID provisório se não soubermos o CRM ID
      content,
      type,
      is_outgoing: !!message.key.fromMe,
      status: 'delivered',
      timestamp: message.messageTimestamp ? new Date(message.messageTimestamp * 1000).toISOString() : new Date().toISOString(),
      media_url: mediaUrl,
      mime_type: mimeType,
      caption,
      metadata: message
    }, { onConflict: 'id' })

  if (error) {
    console.error('[WEBHOOK ERROR]', error)
    return { status: 'error', error }
  }

  return { status: 'success', id: message.key.id }
})
