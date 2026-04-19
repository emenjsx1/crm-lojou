import { defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createClient } from '@supabase/supabase-js'
import { handleEvolutionWebhookBody } from '../../utils/evolution-webhook'

/** Alias: Evolution pode apontar para /api/webhook/messages — mesmo processamento que /api/webhook/evolution */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.public.supabaseKey as string
  )
  return handleEvolutionWebhookBody(body, supabase)
})
