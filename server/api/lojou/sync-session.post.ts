import { defineEventHandler } from 'h3'
import { createServerSupabase, syncSessionTokenFromEvent } from '~/server/utils/lojou'

export default defineEventHandler(async (event) => {
  const supabase = createServerSupabase()
  return await syncSessionTokenFromEvent(event, supabase)
})
