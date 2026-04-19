import { defineNitroPlugin } from 'nitropack/runtime'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

// ─────────────────────────────────────────────────────────────
// EVOLUTION HEALTH PLUGIN
// Executa no startup do servidor Nuxt/Nitro:
//   1. Lê credenciais Evolution do Supabase
//   2. Configura webhook com URL pública correta
//   3. Inicia health check a cada 60s
// ─────────────────────────────────────────────────────────────

const LOG = (msg: string) => console.log(`[EVOLUTION HEALTH] ${msg}`)
const WARN = (msg: string) => console.warn(`[EVOLUTION HEALTH] ⚠️  ${msg}`)
const ERR = (msg: string) => console.error(`[EVOLUTION HEALTH] ❌ ${msg}`)

async function getEvolutionConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    WARN('Variáveis SUPABASE_URL / SUPABASE_KEY não definidas — plugin desativado')
    return null
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'evolution_config')
    .maybeSingle()

  if (error || !data?.value) {
    WARN('Configuração Evolution não encontrada no Supabase')
    return null
  }

  return data.value as { url: string; key: string; instance: string }
}

async function configureWebhook(config: { url: string; key: string; instance: string }, webhookUrl: string) {
  const http = axios.create({
    baseURL: config.url.replace(/\/$/, ''),
    headers: { apikey: config.key, 'Content-Type': 'application/json' },
    timeout: 10000
  })

  const res = await http.post(`/instance/setWebhook/${config.instance}`, {
    url: webhookUrl,
    enabled: true,
    events: [
      'MESSAGES_UPSERT',
      'MESSAGES_UPDATE',
      'MESSAGES_SET',
      'MESSAGES_RECEIPT_UPDATE',
      'SEND_MESSAGE'
    ]
  })

  return res.data
}

async function checkInstanceStatus(config: { url: string; key: string; instance: string }): Promise<string> {
  const http = axios.create({
    baseURL: config.url.replace(/\/$/, ''),
    headers: { apikey: config.key, 'Content-Type': 'application/json' },
    timeout: 8000
  })

  const res = await http.get('/instance/fetchInstances')
  const instances: any[] = Array.isArray(res.data) ? res.data : []
  const found = instances.find((i: any) =>
    i.instance?.instanceName === config.instance ||
    i.name === config.instance ||
    i.instanceName === config.instance
  )

  if (!found) return 'not_found'

  const rawState = (
    found.instance?.state ||
    found.instance?.status ||
    found.instance?.connectionStatus ||
    found.state ||
    found.status ||
    found.connectionStatus ||
    ''
  ).toLowerCase()

  if (rawState === 'open' || rawState === 'connected') return 'connected'
  if (rawState === 'qr' || rawState === 'qrcode') return 'qr'
  if (rawState === 'close' || rawState === 'disconnected' || rawState === 'none') return 'disconnected'
  return rawState || 'unknown'
}

export default defineNitroPlugin(async () => {
  // Aguarda 4s para o servidor e variáveis de ambiente estabilizarem
  await new Promise(r => setTimeout(r, 4000))

  const siteUrl = process.env.NUXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (!siteUrl) {
    WARN('NUXT_PUBLIC_SITE_URL não definida — usando fallback http://localhost:3000')
  }
  const baseUrl = siteUrl || 'http://localhost:3000'
  const webhookUrl = `${baseUrl}/api/webhook/evolution`

  LOG(`Iniciando — webhook target: ${webhookUrl}`)

  // ── Configuração inicial do webhook ──────────────────────────────────────
  let evolutionConfig: { url: string; key: string; instance: string } | null = null

  try {
    evolutionConfig = await getEvolutionConfig()
    if (!evolutionConfig) {
      WARN('Config Evolution não disponível no startup — health check inativo')
      return
    }

    const status = await checkInstanceStatus(evolutionConfig)
    LOG(`Status da instância: ${status}`)

    if (status === 'connected') {
      await configureWebhook(evolutionConfig, webhookUrl)
      LOG(`Webhook configurado com sucesso → ${webhookUrl}`)
    } else if (status === 'qr') {
      WARN('Instância aguardando QR code — webhook será configurado após conexão')
    } else if (status === 'disconnected' || status === 'not_found') {
      WARN(`Instância ${status} — webhook não configurado. Verifique a instância Evolution.`)
    } else {
      WARN(`Estado desconhecido (${status}) — webhook não configurado`)
    }
  } catch (e: any) {
    ERR(`Falha no startup: ${e?.message || e}`)
  }

  // ── Health check a cada 60s ───────────────────────────────────────────────
  setInterval(async () => {
    try {
      // Re-fetch config a cada ciclo (pode ter mudado nas settings)
      const cfg = await getEvolutionConfig()
      if (!cfg) {
        WARN('Config Evolution não encontrada — aguardando configuração')
        return
      }
      evolutionConfig = cfg

      const status = await checkInstanceStatus(cfg)

      if (status === 'connected') {
        // Re-confirma webhook periodicamente (idempotente — não cria duplicados)
        await configureWebhook(cfg, webhookUrl)
        LOG(`Health OK — instância conectada, webhook confirmado`)
      } else if (status === 'qr') {
        WARN('Health: instância aguardando QR code — mensagens NÃO estão sendo recebidas')
      } else if (status === 'disconnected') {
        WARN('Health: instância DESCONECTADA — acesse Settings para reconectar')
      } else if (status === 'not_found') {
        WARN('Health: instância não encontrada no servidor Evolution')
      } else {
        WARN(`Health: estado (${status}) — monitorando`)
      }
    } catch (e: any) {
      ERR(`Health check falhou: ${e?.message || e}`)
    }
  }, 60_000)
})
