import axios from 'axios'
import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { getCookie } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  collectLojouPhoneSearchTerms,
  digitsOnly,
  normalizePhone,
  phonesMatchLoJou
} from '~/utils/phoneMz'

export { normalizePhone, normalizeLojouPhoneKey, collectLojouPhoneSearchTerms, phonesMatchLoJou, digitsOnly } from '~/utils/phoneMz'

export interface LojouLookupUser {
  id: string
  name: string
  phone: string
  balance?: number
  status?: string
  metadata: any
}

export interface LojouLookupResult {
  found: boolean
  user: LojouLookupUser | null
  authSource: string | null
  error?: string | null
}

export const normalizeRemoteJid = (raw: string | null | undefined) => {
  const value = String(raw || '').trim()
  if (!value.includes('@s.whatsapp.net')) {
    return value
  }

  const [digits, suffix] = value.split('@')
  if (digits.length === 9 && digits.startsWith('8')) {
    return `258${digits}@${suffix}`
  }

  return value
}

export const buildRemoteJid = (rawPhone: string | null | undefined) => {
  const local = normalizePhone(rawPhone)
  if (local && local.length === 9 && local.startsWith('8')) {
    return `258${local}@s.whatsapp.net`
  }
  const d = digitsOnly(rawPhone)
  if (!d) return ''
  return `${d}@s.whatsapp.net`
}

export const createServerSupabase = () => {
  const config = useRuntimeConfig()
  return createClient(
    config.public.supabaseUrl as string,
    config.public.supabaseKey as string
  )
}

const getStoredAuthToken = async (supabase: ReturnType<typeof createServerSupabase>) => {
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['lojou_session_token', 'lojou_session_1', 'lojou_admin_token'])

  const settings = Array.isArray(data) ? data : []

  const sessionToken = settings.find((item: any) => item.key === 'lojou_session_token')?.value
    || settings.find((item: any) => item.key === 'lojou_session_1')?.value

  if (sessionToken && sessionToken !== 'REPLACE_WITH_ACTUAL_TOKEN') {
    return { token: String(sessionToken), source: 'session_1' }
  }

  const adminToken = settings.find((item: any) => item.key === 'lojou_admin_token')?.value
  if (adminToken && adminToken !== 'REPLACE_WITH_ACTUAL_TOKEN') {
    return { token: String(adminToken), source: 'admin_token' }
  }

  return { token: null, source: null }
}

export const syncSessionTokenFromEvent = async (event: H3Event, supabase = createServerSupabase()) => {
  const sessionToken = getCookie(event, 'session_1')
  if (!sessionToken) {
    return { synced: false, source: 'cookie_missing' }
  }

  await supabase.from('settings').upsert({
    key: 'lojou_session_token',
    value: sessionToken,
    updated_at: new Date().toISOString()
  }, { onConflict: 'key' })

  return { synced: true, source: 'session_1' }
}

export const lookupLojouUserByPhone = async (
  supabase: ReturnType<typeof createServerSupabase>,
  rawPhone: string
): Promise<LojouLookupResult> => {
  const normalized = normalizePhone(rawPhone)
  const fullPhoneDigits = digitsOnly(rawPhone)

  if (!normalized && !fullPhoneDigits) {
    return { found: false, user: null, authSource: null, error: 'invalid_phone' }
  }

  const auth = await getStoredAuthToken(supabase)
  if (!auth.token) {
    return { found: false, user: null, authSource: null, error: 'no_auth_token' }
  }

  try {
    const searchTerms = collectLojouPhoneSearchTerms(rawPhone)
    if (searchTerms.length === 0) {
      return { found: false, user: null, authSource: auth.source, error: 'invalid_phone' }
    }

    let match: any = null

    for (const term of searchTerms) {
      const response = await axios.get('https://api.lojou.app/api/admin/users', {
        params: { search: term, is_paginate: 0 },
        headers: { Authorization: `Bearer ${auth.token}` },
        timeout: 8000
      })

      const users: any[] = response.data?.users || response.data?.data || []
      match = users.find((user: any) =>
        phonesMatchLoJou(rawPhone, user.phone_number || user.phone || user.mobile_number)
      ) || null
      if (match) break
    }

    if (!match) {
      return { found: false, user: null, authSource: auth.source }
    }

    const displayPhone = fullPhoneDigits || buildRemoteJid(normalized).split('@')[0]

    return {
      found: true,
      authSource: auth.source,
      user: {
        id: String(match.id),
        name: match.full_name || match.name || match.firstname || normalized,
        phone: displayPhone,
        balance: match.balance ?? 0,
        status: match.status ?? 'active',
        metadata: match
      }
    }
  } catch (error: any) {
    return {
      found: false,
      user: null,
      authSource: auth.source,
      error: error?.response?.data?.message || error?.message || 'lojou_lookup_failed'
    }
  }
}

export const upsertLocalUserCache = async (
  supabase: ReturnType<typeof createServerSupabase>,
  user: LojouLookupUser
) => {
  const { data } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      name: user.name,
      phone: user.phone,
      balance: user.balance ?? 0,
      status: user.status ?? 'active',
      metadata: user.metadata
    }, { onConflict: 'id' })
    .select('*')
    .single()

  return data || null
}

export const upsertContactAssociation = async (
  supabase: ReturnType<typeof createServerSupabase>,
  params: {
    remoteJid: string
    phone: string
    pushName?: string | null
    existingContact?: any | null
    localUser?: any | null
    source: 'lead' | 'lojou'
    lookupError?: string | null
  }
) => {
  const nextName = params.localUser?.name || params.existingContact?.name || params.pushName || params.phone
  const metadata = {
    ...(params.existingContact?.metadata || {}),
    source: params.source,
    pushName: params.pushName || params.existingContact?.metadata?.pushName || null,
    last_lookup_error: params.lookupError || null,
    last_lookup_at: new Date().toISOString()
  }

  if (!params.existingContact) {
    const { data } = await supabase
      .from('contacts')
      .insert({
        remote_jid: params.remoteJid,
        phone: params.phone,
        user_id: params.localUser?.id || null,
        name: nextName,
        metadata
      })
      .select('*')
      .single()

    return data || null
  }

  const { data } = await supabase
    .from('contacts')
    .update({
      phone: params.phone,
      user_id: params.localUser?.id || params.existingContact.user_id || null,
      name: nextName,
      metadata
    })
    .eq('remote_jid', params.remoteJid)
    .select('*')
    .single()

  return data || params.existingContact
}
