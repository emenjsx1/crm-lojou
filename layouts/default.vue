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

// Token interno da API Lojou — atualizar aqui quando o token expirar
const DEFAULT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2FwcC5ibG9kYXF1ZS5jb20vYXBpL3ZlbmRvci9hdXRoL2xvZ2luIiwiaWF0IjoxNzczNDg1NDYwLCJleHAiOjE3ODY4MjEwNjAsIm5iZiI6MTc3MzQ4NTQ2MCwianRpIjoiTTdWY3lDTmZyUm1oZXBxTCIsInN1YiI6IjM5IiwicHJ2IjoiMjNiZDVjODk0OWY2MDBhZGIzOWU3MDFjNDAwODcyZGI3YTU5NzZmNyJ9.4bcQEBQ_NSBf6gDeq641uO_RMMIpUTkDgAbRjorXE6w'

const authStore = useAuthStore()
const contactStore = useContactStore()

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift()
  return null
}

onMounted(() => {
  if (typeof window === 'undefined') return

  // Priority: cookie (produção) → localStorage → token padrão hardcoded
  const token = getCookie('session_1')
    || localStorage.getItem('lojou_session_1')
    || DEFAULT_TOKEN

  authStore.setToken(token)
  localStorage.setItem('lojou_session_1', token)

  // Pre-carregar contatos para todas as páginas (Messages, Dashboard, etc.)
  if (contactStore.contacts.length === 0) {
    contactStore.fetchContacts({ is_paginate: 1, per_page: 100, page: 1 })
  }
})
</script>