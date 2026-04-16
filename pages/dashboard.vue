<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-10">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
      <div>
        <h2 class="text-2xl font-bold text-zinc-900 dark:text-white">Visão Geral</h2>
        <p class="text-sm text-zinc-500 mt-1">Métricas em tempo real da sua base de contatos Lojou.</p>
      </div>
      <button @click="fetchAll" class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all font-medium self-start sm:self-auto">
        <Icon :name="loading ? 'ph:spinner-gap-bold' : 'ph:arrows-clockwise-bold'" :class="{'animate-spin text-[#FF009D]': loading}" />
        Sincronizar
      </button>
    </div>

    <!-- Top Metric Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <!-- Total Contacts -->
      <div class="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
        <div class="absolute -right-4 -top-4 w-16 h-16 bg-[#FF009D]/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
        <div class="flex items-center justify-between mb-4 relative">
          <div class="w-10 h-10 rounded-xl bg-[#FF009D]/10 flex items-center justify-center text-[#FF009D]">
            <Icon name="ph:users-bold" class="w-5 h-5" />
          </div>
          <span class="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md flex items-center gap-1">
            <Icon name="ph:trend-up-bold" /> Total
          </span>
        </div>
        <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total de Contatos (Lojou)</h3>
        <p class="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
          <span v-if="loading" class="inline-block w-16 h-8 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"></span>
          <span v-else>{{ formatNumber(totalRecords) }}</span>
        </p>
      </div>

<!-- Removed unused metrics to focus on Messages and Contacts -->

      <!-- Messages -->
      <div class="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group sm:col-span-2 md:col-span-3">
        <div class="absolute -right-4 -top-4 w-16 h-16 bg-purple-500/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
        <div class="flex items-center justify-between mb-4 relative">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Icon name="ph:paper-plane-right-bold" class="w-5 h-5" />
            </div>
            <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Mensagens Enviadas</h3>
          </div>
          <select v-model="messageFilterDays" @change="fetchEvolutionStatus" class="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs px-2 py-1 focus:outline-none text-zinc-600 dark:text-zinc-400">
            <option value="today">Hoje</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="all">Sempre</option>
          </select>
        </div>
        
        <p class="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
          <span v-if="evoLoading" class="inline-block w-16 h-8 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"></span>
          <span v-else-if="messagesFiltered !== null">{{ formatNumber(messagesFiltered) }}</span>
          <span v-else class="text-lg text-zinc-400">—</span>
        </p>
      </div>
    </div>

    <!-- Main Dashboard Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- List: Recent Contacts -->
      <div class="lg:col-span-2 bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <div class="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-zinc-500">
              <Icon name="ph:clock-counter-clockwise-bold" class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-semibold text-zinc-900 dark:text-white text-base">Contatos Recentes</h3>
              <p class="text-xs text-zinc-500">Últimos usuários registrados na Lojou</p>
            </div>
          </div>
          <NuxtLink to="/contacts" class="text-[#FF009D] text-sm font-medium hover:underline">Ver todos</NuxtLink>
        </div>

        <div class="flex-1 overflow-x-auto">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th class="px-6 py-3 font-medium text-xs tracking-wide">Nome</th>
                <th class="px-6 py-3 font-medium text-xs tracking-wide">Status</th>
                <th class="px-6 py-3 font-medium text-xs tracking-wide">Data Registro</th>
                <th class="px-6 py-3 font-medium text-xs tracking-wide text-right">Ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              <tr v-for="contact in recentContacts" :key="contact.id" class="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                <td class="px-6 py-3">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase">
                      {{ getInitials(contact.full_name || contact.firstname || contact.name || 'SN') }}
                    </div>
                    <div class="flex flex-col">
                      <span class="font-medium text-zinc-900 dark:text-zinc-100">{{ contact.full_name || contact.firstname || contact.name || 'Sem nome' }}</span>
                      <span class="text-xs text-zinc-500">{{ contact.email || contact.phone_number || '-' }}</span>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-3">
                  <span :class="[
                    'inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md',
                    (contact.status === 'ativo' || contact.status === 'active' || contact.status === 'verified' || contact.verified || !contact.status)
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  ]">{{ contact.status || 'Active' }}</span>
                </td>
                <td class="px-6 py-3 text-zinc-600 dark:text-zinc-400">{{ formatDate(contact.created_at) }}</td>
                <td class="px-6 py-3 text-right">
                  <button @click="startChat(contact)" class="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-[#FF009D]/10 hover:text-[#FF009D] transition-colors inline-flex items-center justify-center">
                    <Icon name="ph:chat-teardrop-text-bold" />
                  </button>
                </td>
              </tr>
              <tr v-if="recentContacts.length === 0">
                <td colspan="4" class="px-6 py-8 text-center text-zinc-500 text-sm">
                  <Icon name="ph:users" class="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Nenhum contato recente carregado.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <div class="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
          <h3 class="font-semibold text-zinc-900 dark:text-white text-base">Ações Rápidas</h3>
          <p class="text-xs text-zinc-500 mt-1">Interaja rapidamente com sua base</p>
        </div>

        <div class="p-6 flex flex-col gap-4">
          <NuxtLink to="/broadcast" class="group flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-[#FF009D]/50 transition-all cursor-pointer">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-[#FF009D]/10 flex items-center justify-center text-[#FF009D] group-hover:scale-110 transition-transform">
                <Icon name="ph:megaphone-bold" class="w-5 h-5" />
              </div>
              <div class="flex flex-col">
                <span class="font-semibold text-zinc-900 dark:text-white text-sm">Criar Transmissão</span>
                <span class="text-xs text-zinc-500">Envie mensagens em massa</span>
              </div>
            </div>
            <Icon name="ph:caret-right-bold" class="text-zinc-400 group-hover:text-[#FF009D]" />
          </NuxtLink>

          <NuxtLink to="/campaigns" class="group flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-500/50 transition-all cursor-pointer">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                <Icon name="ph:rocket-launch-bold" class="w-5 h-5" />
              </div>
              <div class="flex flex-col">
                <span class="font-semibold text-zinc-900 dark:text-white text-sm">Automações</span>
                <span class="text-xs text-zinc-500">Agendar fluxos de follow-up</span>
              </div>
            </div>
            <Icon name="ph:caret-right-bold" class="text-zinc-400 group-hover:text-purple-500" />
          </NuxtLink>

          <!-- Evolution Status Badge (dynamic) -->
          <div class="mt-4 pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800">
            <div v-if="evoLoading" class="rounded-lg p-4 flex items-start gap-3 bg-zinc-100 dark:bg-zinc-900 animate-pulse">
              <div class="w-5 h-5 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0 mt-0.5"></div>
              <div class="flex flex-col gap-1.5 flex-1">
                <div class="h-3 bg-zinc-300 dark:bg-zinc-700 rounded w-28"></div>
                <div class="h-2 bg-zinc-200 dark:bg-zinc-800 rounded w-40"></div>
              </div>
            </div>
            <div v-else-if="evolutionConnected" class="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 flex items-start gap-3">
              <Icon name="ph:check-circle-fill" class="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div class="flex flex-col">
                <span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400">WhatsApp Conectado</span>
                <span class="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">Instância <b>{{ evoInstance }}</b> está activa e pronta para enviar.</span>
              </div>
            </div>
            <div v-else class="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
              <Icon name="ph:warning-fill" class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div class="flex flex-col">
                <span class="text-sm font-semibold text-amber-600 dark:text-amber-400">WhatsApp Desconectado</span>
                <span class="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                  <NuxtLink to="/settings" class="underline">Ir às Configurações</NuxtLink> para conectar a instância Evolution.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHead, useRuntimeConfig } from '#imports'
import { useContactStore } from '~/stores/contacts'
import { useApi } from '~/composables/useApi'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import axios from 'axios'

useHead({ title: 'Painel - Lojou Messaging' })

const store = useContactStore()
const { contacts, loading, totalRecords } = storeToRefs(store)
const router = useRouter()

// Métricas reais da API (totais reais, não apenas do slice carregado)
const verifiedCount = ref(0)
const purchasedCount = ref(0)
const metricsLoading = ref(false)

// Evolution
const evolutionConnected = ref(false)
const messageFilterDays = ref('today')
const messagesFiltered = ref<number | null>(null)
const evoLoading = ref(false)
const evoInstance = ref('lojou-crm')

const formatNumber = (val: any) => {
  if (val === null || val === undefined) return '0'
  return parseFloat(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

const recentContacts = computed(() => {
  return [...contacts.value].sort((a: any, b: any) => {
    return new Date(b.created_at || b.updated_at).getTime() - new Date(a.created_at || a.updated_at).getTime()
  }).slice(0, 6)
})

const getInitials = (name: string) => {
  if (!name) return 'LC'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].substring(0, 2).toUpperCase()
}

const formatDate = (dateStr: any) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('pt-BR')
}

// Busca totais simplificada
const fetchMetrics = async () => {
  metricsLoading.value = true
  try {
    // Total is ready from contactsStore
  } catch (e) {
    console.error('Erro ao buscar métricas:', e)
  } finally {
    metricsLoading.value = false
  }
}

// Verifica estado real da Evolution e conta mensagens enviadas hoje
const fetchEvolutionStatus = async () => {
  if (typeof window === 'undefined') return
  const evoUrl = localStorage.getItem('evolution_url')?.replace(/\/$/, '')
  const evoKey = localStorage.getItem('evolution_api_key')
  evoInstance.value = localStorage.getItem('evolution_instance') || 'lojou-crm'

  if (!evoUrl || !evoKey) {
    evolutionConnected.value = false
    return
  }

  evoLoading.value = true
  try {
    const res = await axios.get(`${evoUrl}/instance/fetchInstances`, {
      headers: { apikey: evoKey }
    })
    const instances = Array.isArray(res.data) ? res.data : []
    const found = instances.find((i: any) =>
      i.instance?.instanceName === evoInstance.value ||
      i.name === evoInstance.value ||
      i.instanceName === evoInstance.value
    )

    if (found) {
      // A Evolution pode usar vários campos para o estado
      const state = (
        found.instance?.state ||
        found.instance?.status ||
        found.instance?.connectionStatus ||
        found.state ||
        found.status ||
        found.connectionStatus ||
        ''
      ).toLowerCase()
      evolutionConnected.value = state === 'open' || state === 'connected'
    } else {
      evolutionConnected.value = false
    }

    // Se conectado, tenta buscar mensagens enviadas com base no filtro
    if (evolutionConnected.value) {
      try {
        const msgRes = await axios.post(
          `${evoUrl}/chat/findMessages/${evoInstance.value}`,
          { where: { key: { fromMe: true } }, limit: 200 },
          { headers: { apikey: evoKey, 'Content-Type': 'application/json' } }
        )
        const records: any[] = msgRes.data?.messages?.records || msgRes.data?.messages || msgRes.data || []
        if (Array.isArray(records)) {
          let cutoff = 0
          if (messageFilterDays.value === 'today') {
            const today = new Date()
            today.setHours(0,0,0,0)
            cutoff = today.getTime()
          } else if (messageFilterDays.value !== 'all') {
            const daysAgo = parseInt(messageFilterDays.value)
            cutoff = new Date().getTime() - (daysAgo * 24 * 60 * 60 * 1000)
          }

          messagesFiltered.value = records.filter((m: any) => {
            if (cutoff === 0) return true
            const ts = m.messageTimestamp ? m.messageTimestamp * 1000 : new Date(m.created_at).getTime()
            return ts >= cutoff
          }).length
        }
      } catch (err: any) {
        messagesFiltered.value = null
        console.error('Evolution fetch error (dashboard)', err)
      }
    }
  } catch (e) {
    evolutionConnected.value = false
  } finally {
    evoLoading.value = false
  }
}

const fetchAll = async () => {
  await store.fetchContacts({ is_paginate: true, per_page: 5, page: 1 })
  await Promise.all([fetchMetrics(), fetchEvolutionStatus()])
}

const startChat = (contact: any) => {
  router.push('/messages')
}

onMounted(() => {
  fetchAll()
})
</script>
