import { defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

// ─────────────────────────────────────────────────────────────
// POST /api/lojou/check-user
// Body: { phone: "258855253617" }
//
// Verifica EXACTAMENTE se o número existe na Lojou.
// O token de admin nunca sai do servidor.
// ─────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const phone = String(body?.phone || '').trim().replace(/\D/g, '')

  if (!phone || phone.length < 6) {
    return { found: false, error: 'invalid_phone' }
  }

  // Normalização Mozambique: strip prefixo 258 para comparação exacta com Lojou
  // O Lojou guarda "855253617", o WhatsApp envia "258855253617"
  const normalizePhone = (p: string): string => {
    let s = String(p).trim().replace(/\D/g, '')
    if (s.startsWith('258')) s = s.slice(3)
    return s
  }
  const phoneLocal = normalizePhone(phone)

  const config  = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.public.supabaseKey as string
  )

  // Buscar token de admin (guardado no banco, nunca no frontend)
  const { data: tokenSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'lojou_admin_token')
    .maybeSingle()

  const adminToken = tokenSetting?.value
  if (!adminToken || adminToken === 'REPLACE_WITH_ACTUAL_TOKEN') {
    return { found: false, error: 'no_token_configured' }
  }

  try {
    // Pesquisar pelo número local para garantir match se o Lojou não indexar o DDI
    const lojouRes = await axios.get('https://api.lojou.app/api/admin/users', {
      params:  { search: phoneLocal, is_paginate: 0 },
      headers: { Authorization: `Bearer ${adminToken}` },
      timeout: 5000
    })

    const users: any[] = lojouRes.data?.users || lojouRes.data?.data || []

    // MATCH EXACTO após normalização
    // Lojou guarda "855253617", WhatsApp envia "258855253617"
    const match = users.find((u: any) => {
      const lojouPhone = normalizePhone(String(u.phone_number || u.phone || ''))
      return lojouPhone === phoneLocal && lojouPhone.length > 0
    }) ?? null

    if (!match) {
      return { found: false, phone }
    }

    // Utilizador encontrado → sincronizar localmente e actualizar contacto
    const { data: localUser } = await supabase
      .from('users')
      .upsert({
        id:       String(match.id),
        name:     match.full_name || match.name || match.firstname || phone,
        phone,
        balance:  match.balance ?? 0,
        status:   match.status  ?? 'active',
        metadata: match
      }, { onConflict: 'id' })
      .select('id, name, balance, status')
      .single()

    // Actualizar o contacto correspondente ao JID
    const jid = `${phone}@s.whatsapp.net`
    await supabase
      .from('contacts')
      .update({
        user_id: String(match.id),
        name:    match.full_name || match.name || phone,
        metadata: {
          source:      'lojou',
          synced_at:   new Date().toISOString()
        }
      })
      .eq('remote_jid', jid)

    return {
      found: true,
      phone,
      user: {
        id:      localUser?.id,
        name:    localUser?.name,
        balance: localUser?.balance,
        status:  localUser?.status
      }
    }

  } catch (err: any) {
    console.error('[LOJOU CHECK] Erro:', err.message)
    return { found: false, error: 'lojou_api_error', detail: err.message }
  }
})
