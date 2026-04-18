import { defineEventHandler } from 'h3'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

// GET /api/health
// Endpoint de monitorização — pode ser usado por UptimeRobot, scripts externos, etc.
// Retorna estado atual da instância Evolution sem expor credenciais.

export default defineEventHandler(async () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return { status: 'ok', evolution: 'unknown', reason: 'supabase_not_configured', ts: new Date().toISOString() }
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'evolution_config')
      .maybeSingle()

    if (!data?.value) {
      return { status: 'ok', evolution: 'unknown', reason: 'evolution_not_configured', ts: new Date().toISOString() }
    }

    const cfg = data.value as { url: string; key: string; instance: string }
    const http = axios.create({
      baseURL: cfg.url.replace(/\/$/, ''),
      headers: { apikey: cfg.key },
      timeout: 6000
    })

    const res = await http.get('/instance/fetchInstances')
    const instances: any[] = Array.isArray(res.data) ? res.data : []
    const found = instances.find((i: any) =>
      i.instance?.instanceName === cfg.instance ||
      i.name === cfg.instance ||
      i.instanceName === cfg.instance
    )

    if (!found) {
      return { status: 'ok', evolution: 'not_found', instance: cfg.instance, ts: new Date().toISOString() }
    }

    const rawState = (
      found.instance?.state ||
      found.instance?.status ||
      found.instance?.connectionStatus ||
      found.state ||
      found.status ||
      found.connectionStatus ||
      'unknown'
    ).toLowerCase()

    const evolutionStatus = (rawState === 'open' || rawState === 'connected') ? 'connected'
      : (rawState === 'qr' || rawState === 'qrcode') ? 'qr'
      : rawState

    return {
      status: 'ok',
      evolution: evolutionStatus,
      instance: cfg.instance,
      ts: new Date().toISOString()
    }
  } catch (e: any) {
    return {
      status: 'ok',
      evolution: 'error',
      reason: e?.message || 'unknown_error',
      ts: new Date().toISOString()
    }
  }
})
