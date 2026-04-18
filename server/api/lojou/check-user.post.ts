import { defineEventHandler, readBody } from 'h3'
import {
  buildRemoteJid,
  createServerSupabase,
  lookupLojouUserByPhone,
  normalizeRemoteJid,
  upsertContactAssociation,
  upsertLocalUserCache
} from '~/server/utils/lojou'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const rawPhone = String(body?.phone || '').trim()
  const remoteJid = normalizeRemoteJid(String(body?.remoteJid || '')) || buildRemoteJid(rawPhone)

  if (!rawPhone && !remoteJid) {
    return { found: false, classified: 'new_lead', error: 'invalid_phone' }
  }

  const phone = rawPhone || remoteJid.split('@')[0]
  const supabase = createServerSupabase()

  const { data: existingContact } = await supabase
    .from('contacts')
    .select('*')
    .eq('remote_jid', remoteJid)
    .maybeSingle()

  const lookup = await lookupLojouUserByPhone(supabase, phone)
  const localUser = lookup.found && lookup.user
    ? await upsertLocalUserCache(supabase, lookup.user)
    : null

  const contact = await upsertContactAssociation(supabase, {
    remoteJid,
    phone,
    pushName: existingContact?.name || phone,
    existingContact,
    localUser,
    source: localUser ? 'lojou' : 'lead',
    lookupError: lookup.error || null
  })

  return {
    found: Boolean(localUser),
    classified: localUser ? 'known_user' : 'new_lead',
    authSource: lookup.authSource,
    error: lookup.error || null,
    contact,
    user: localUser
      ? {
          id: localUser.id,
          name: localUser.name,
          balance: localUser.balance,
          status: localUser.status,
          metadata: localUser.metadata
        }
      : null
  }
})
