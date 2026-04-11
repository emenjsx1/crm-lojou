<template>
  <div class="h-full bg-zinc-50 dark:bg-zinc-950 rounded-xl overflow-y-auto p-6">
    <div class="max-w-2xl mx-auto flex flex-col gap-6">

      <!-- Header -->
      <div>
        <h2 class="text-2xl font-bold text-zinc-900 dark:text-white">Configurações</h2>
        <p class="text-sm text-zinc-500 mt-1">Configure a integração com a Evolution API para envio de WhatsApp.</p>
      </div>

      <!-- Evolution API Credentials -->
      <div class="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Icon name="ph:whatsapp-logo-fill" class="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 class="font-semibold text-zinc-900 dark:text-white">Evolution API — WhatsApp</h3>
            <p class="text-xs text-zinc-500">Credenciais do servidor Evolution para envio de mensagens</p>
          </div>
        </div>

        <div class="p-6 flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">URL Base da Evolution</label>
            <input
              v-model="evolutionUrl"
              :disabled="instanceStatus === 'connected'"
              placeholder="Ex: https://evo.seuservidor.com"
              class="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
            />
          </div>
          
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Global API Key</label>
            <input
              v-model="evolutionKey"
              :disabled="instanceStatus === 'connected'"
              type="password"
              placeholder="••••••••••••••••"
              class="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
            />
          </div>

          <!-- Instance Name (read-only, auto-generated) -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Nome da Instância <span class="font-normal text-zinc-400 normal-case">(gerado automaticamente)</span>
            </label>
            <div class="flex gap-2">
              <input
                v-model="instanceName"
                placeholder="Ex: lojou-crm"
                class="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <p class="text-[11px] text-zinc-400">Pode personalizar ou deixar o padrão "lojou-crm"</p>
          </div>
        </div>
      </div>

      <!-- WhatsApp Instance Panel -->
      <div class="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center"
                 :class="instanceStatus === 'connected' ? 'bg-emerald-500/10' : instanceStatus === 'qr' ? 'bg-amber-500/10' : 'bg-zinc-100 dark:bg-zinc-800'">
              <Icon
                :name="instanceStatus === 'connected' ? 'ph:check-circle-fill' : instanceStatus === 'qr' ? 'ph:qr-code-bold' : 'ph:plugs-bold'"
                class="w-5 h-5"
                :class="instanceStatus === 'connected' ? 'text-emerald-500' : instanceStatus === 'qr' ? 'text-amber-500' : 'text-zinc-400'"
              />
            </div>
            <div>
              <h3 class="font-semibold text-zinc-900 dark:text-white">Conexão WhatsApp</h3>
              <p class="text-xs" :class="instanceStatus === 'connected' ? 'text-emerald-500' : instanceStatus === 'qr' ? 'text-amber-500' : 'text-zinc-500'">
                {{ statusLabel }}
              </p>
            </div>
          </div>

          <!-- Status Badge -->
          <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                :class="instanceStatus === 'connected' 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : instanceStatus === 'qr'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'">
            {{ instanceStatus === 'connected' ? 'Conectado' : instanceStatus === 'qr' ? 'Aguardando Scan' : 'Desconectado' }}
          </span>
        </div>

        <div class="p-6">
          <!-- QR Code Display -->
          <div v-if="instanceStatus === 'qr' && qrCode" class="flex flex-col items-center gap-4 mb-6">
            <div class="p-3 bg-white rounded-2xl shadow-lg border border-zinc-100">
              <img :src="'data:image/png;base64,' + qrCode" alt="QR Code WhatsApp" class="w-56 h-56 block" />
            </div>
            <div class="text-center">
              <p class="font-semibold text-zinc-900 dark:text-white text-sm">Escaneie com o WhatsApp</p>
              <p class="text-xs text-zinc-500 mt-1">Abra o WhatsApp → Menu → Dispositivos Conectados → Conectar Dispositivo</p>
            </div>
            <div class="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 px-4 py-2 rounded-lg">
              <Icon name="ph:spinner-gap-bold" class="w-4 h-4 animate-spin shrink-0" />
              <span>Verificando conexão automaticamente...</span>
            </div>
          </div>

          <!-- Connected Info -->
          <div v-if="instanceStatus === 'connected'" class="flex items-center gap-4 mb-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
            <Icon name="ph:check-circle-fill" class="w-8 h-8 text-emerald-500 shrink-0" />
            <div>
              <p class="font-semibold text-emerald-700 dark:text-emerald-400">WhatsApp Conectado!</p>
              <p class="text-xs text-zinc-500 mt-0.5">Instância <b>{{ instanceName }}</b> está ativa e pronta para enviar mensagens.</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-3">
            <!-- Create / Connect Instance -->
            <button
              v-if="instanceStatus === 'none'"
              @click="createAndConnect"
              :disabled="!evolutionUrl || !evolutionKey || actionLoading"
              class="flex-1 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
            >
              <Icon v-if="actionLoading" name="ph:spinner-gap-bold" class="w-4 h-4 animate-spin" />
              <Icon v-else name="ph:qr-code-bold" class="w-4 h-4" />
              {{ actionLoading ? 'Criando instância...' : 'Criar Instância e Conectar WhatsApp' }}
            </button>

            <!-- Retry QR -->
            <button
              v-if="instanceStatus === 'qr'"
              @click="refreshQr"
              :disabled="actionLoading"
              class="px-5 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all"
            >
              <Icon name="ph:arrows-clockwise-bold" class="w-4 h-4" :class="actionLoading ? 'animate-spin' : ''" />
              Atualizar QR Code
            </button>

            <!-- Save credentials (non-connected state) -->
            <button
              v-if="instanceStatus !== 'connected'"
              @click="saveCredentials"
              class="px-5 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold text-sm rounded-xl flex items-center gap-2 transition-all hover:opacity-80"
            >
              <Icon name="ph:floppy-disk-back-fill" class="w-4 h-4" />
              Salvar Credenciais
            </button>

            <!-- Disconnect -->
            <button
              v-if="instanceStatus === 'connected'"
              @click="disconnectInstance"
              :disabled="actionLoading"
              class="px-5 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-semibold text-sm rounded-xl flex items-center gap-2 transition-all"
            >
              <Icon name="ph:plugs-bold" class="w-4 h-4" />
              Desconectar
            </button>

            <!-- Delete Instance -->
            <button
              v-if="instanceStatus !== 'none'"
              @click="deleteInstance"
              :disabled="actionLoading"
              class="px-5 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all"
            >
              <Icon name="ph:trash-bold" class="w-4 h-4" />
              Eliminar Instância
            </button>
          </div>

          <!-- Error -->
          <div v-if="errorMessage" class="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
            <Icon name="ph:warning-fill" class="w-4 h-4 shrink-0 mt-0.5" />
            <span>{{ errorMessage }}</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useEvolution } from '~/composables/useEvolution'

const evo = useEvolution()

const autoConfigureWebhook = () => {
  if (typeof window === 'undefined') return
  const webhookUrl = window.location.origin + '/api/webhook/evolution'
  evo.configureWebhook(webhookUrl)
}

const evolutionUrl = ref('')
const evolutionKey = ref('')
const instanceName = ref('lojou-crm')
const instanceStatus = ref<'none' | 'qr' | 'connected'>('none')
const qrCode = ref('')
const actionLoading = ref(false)
const errorMessage = ref('')
let pollTimer: any = null

const statusLabel = computed(() => {
  if (instanceStatus.value === 'connected') return 'Instância ativa e enviando mensagens'
  if (instanceStatus.value === 'qr') return 'Aguardando você escanear o QR Code'
  return 'Instância não criada — configure as credenciais acima'
})

const evoApi = computed(() => axios.create({
  baseURL: evolutionUrl.value.replace(/\/$/, ''),
  headers: {
    'apikey': evolutionKey.value,
    'Content-Type': 'application/json'
  }
}))

onMounted(async () => {
  if (typeof window === 'undefined') return
  
  // Primeiro tentamos carregar do Supabase (via useEvolution refatorado)
  const creds = await evo.getCredentials()
  if (creds) {
    evolutionUrl.value = creds.url
    evolutionKey.value = creds.key
    instanceName.value = creds.instance
    
    // Check existing status if credentials exist
    checkInstanceStatus()
  }
})

onUnmounted(() => {
  clearInterval(pollTimer)
})

const saveCredentials = async () => {
  actionLoading.value = true
  errorMessage.value = ''
  try {
    const url = evolutionUrl.value.trim()
    const key = evolutionKey.value.trim()
    const instance = instanceName.value.trim()
    
    // Agora salva no Supabase (Backend Centralizado)
    await evo.saveSettings(url, key, instance)
    alert('Configurações salvas no Supabase com sucesso!')
  } catch (err: any) {
    errorMessage.value = 'Erro ao salvar no backend: ' + (err.message || 'Erro desconhecido')
  } finally {
    actionLoading.value = false
  }
}

const checkInstanceStatus = async () => {
  if (!evolutionUrl.value || !evolutionKey.value) return
  try {
    const res = await evoApi.value.get(`/instance/fetchInstances`)
    const instances = Array.isArray(res.data) ? res.data : []

    const found = instances.find((i: any) =>
      i.instance?.instanceName === instanceName.value ||
      i.name === instanceName.value ||
      i.instanceName === instanceName.value
    )

    if (found) {
      // Cobrir todos os campos de estado que a Evolution API pode retornar
      const rawState = (
        found.instance?.state ||
        found.instance?.status ||
        found.instance?.connectionStatus ||
        found.state ||
        found.status ||
        found.connectionStatus ||
        ''
      ).toLowerCase()

      if (rawState === 'open' || rawState === 'connected') {
        instanceStatus.value = 'connected'
        clearInterval(pollTimer)
        // Auto-configura webhook para receber mensagens em tempo real
        autoConfigureWebhook()
      } else if (rawState === 'qr' || rawState === 'connecting' || rawState === 'qrcode') {
        instanceStatus.value = 'qr'
        await refreshQr()
      } else {
        // Estado desconhecido — tenta buscar QR para o utilizador reconectar
        instanceStatus.value = 'qr'
        await refreshQr()
      }
    } else {
      instanceStatus.value = 'none'
    }
  } catch (e) {
    instanceStatus.value = 'none'
  }
}

const createAndConnect = async () => {
  if (!evolutionUrl.value || !evolutionKey.value) {
    errorMessage.value = 'Preencha a URL e a API Key antes de continuar.'
    return
  }
  
  saveCredentials()
  actionLoading.value = true
  errorMessage.value = ''
  
  try {
    // Create instance
    await evoApi.value.post(`/instance/create`, {
      instanceName: instanceName.value,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    })
    
    // Fetch QR code
    await refreshQr()
    instanceStatus.value = 'qr'

    // Start polling connection status every 5s
    clearInterval(pollTimer)
    pollTimer = setInterval(async () => {
      await checkInstanceStatus()
    }, 5000)

  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Erro ao criar instância'
    // If instance already exists, try to get QR
    if (msg.toLowerCase().includes('already') || err?.response?.status === 409) {
      await refreshQr()
      instanceStatus.value = 'qr'
      clearInterval(pollTimer)
      pollTimer = setInterval(checkInstanceStatus, 5000)
    } else {
      errorMessage.value = `Erro: ${msg}`
    }
  } finally {
    actionLoading.value = false
  }
}

const refreshQr = async () => {
  actionLoading.value = true
  errorMessage.value = ''
  try {
    const res = await evoApi.value.get(`/instance/connect/${instanceName.value}`)
    const data = res.data
    // QR comes as base64 string or in data.code / data.qrcode
    qrCode.value = data?.base64 || data?.qrcode?.base64 || data?.code || ''
    if (qrCode.value.startsWith('data:image')) {
      qrCode.value = qrCode.value.split(',')[1] // strip the data: prefix
    }
    instanceStatus.value = 'qr'
  } catch (err: any) {
    const msg = err?.response?.data?.message || err.message
    errorMessage.value = `Erro ao buscar QR Code: ${msg}`
  } finally {
    actionLoading.value = false
  }
}

const disconnectInstance = async () => {
  actionLoading.value = true
  errorMessage.value = ''
  try {
    await evoApi.value.delete(`/instance/logout/${instanceName.value}`)
    instanceStatus.value = 'none'
    qrCode.value = ''
    clearInterval(pollTimer)
  } catch (err: any) {
    errorMessage.value = `Erro ao desconectar: ${err?.response?.data?.message || err.message}`
  } finally {
    actionLoading.value = false
  }
}

const deleteInstance = async () => {
  if (!confirm(`Tem certeza que quer ELIMINAR a instância "${instanceName.value}"? Esta ação não pode ser desfeita.`)) return
  
  actionLoading.value = true
  errorMessage.value = ''
  try {
    await evoApi.value.delete(`/instance/delete/${instanceName.value}`)
    instanceStatus.value = 'none'
    qrCode.value = ''
    clearInterval(pollTimer)
  } catch (err: any) {
    errorMessage.value = `Erro ao eliminar: ${err?.response?.data?.message || err.message}`
  } finally {
    actionLoading.value = false
  }
}
</script>

