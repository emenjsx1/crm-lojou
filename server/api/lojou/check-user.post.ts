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
  const phone = String(body?.phone || '').trim()

  if (!phone || !/^\d+$/.test(phone)) {
    return { found: false, error: 'invalid_phone' }
  }

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
    const lojouRes = await axios.get('https://api.lojou.app/api/admin/users', {
      params:  { search: phone, is_paginate: 0 },
      headers: { Authorization: `Bearer ${adminToken}` },
      timeout: 6000
    })

    const users: any[] = lojouRes.data?.users || lojouRes.data?.data || []

    // MATCH EXACTO — nunca includes/startsWith/LIKE
    const match = users.find((u: any) => {
      const lojouPhone = String(u.phone_number || u.phone || '').trim()
      return lojouPhone === phone
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
