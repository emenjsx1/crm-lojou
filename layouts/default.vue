<template>
  <div class="flex min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 font-sans">
    <Sidebar />
    <div class="flex flex-col flex-1 pl-64 w-full">
      <Topbar />
      <main class="flex-1 p-6 overflow-y-auto h-[calc(100vh-4rem)]">
        <slot />
      </main>
    </div>
    <UNotifications />
    <UModals />
    <USlideovers />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useContactStore } from '~/stores/contacts'

const authStore = useAuthStore()
const contactStore = useContactStore()

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift()
  return null
}

const isLojouDomain = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.location.hostname.includes('lojou.app')
}

onMounted(() => {
  if (typeof window === 'undefined') return

  if (isLojouDomain()) {
    // Em produção (lojou.app), usamos apenas o cookie de sessão seguro
    const token = getCookie('session_1')
    if (token) {
      authStore.setToken(token)
    }
  } else {
    // Em dev local, recuperamos da memória/Pinia (não salvamos em localStorage por segurança)
    // Caso queira um token fixo para dev, pode ser definido aqui temporariamente se necessário
  }

  // Pre-carregar contatos para as páginas que precisam
  if (contactStore.contacts.length === 0) {
    contactStore.fetchContacts({ is_paginate: 1, per_page: 100, page: 1 })
  }
})
</script>