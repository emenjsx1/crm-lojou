<template>
  <div class="flex min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 font-sans overflow-hidden">
    <!-- Overlay para fechar no mobile ao clicar fora -->
    <div 
      v-if="isSidebarOpen" 
      class="fixed inset-0 bg-black/50 z-20 lg:hidden"
      @click="isSidebarOpen = false"
    ></div>

    <!-- Sidebar com transição e responsividade -->
    <Sidebar 
      :is-open="isSidebarOpen" 
      class="transform transition-transform duration-300 lg:translate-x-0 z-30"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      @close="isSidebarOpen = false"
    />

    <!-- Conteúdo Principal -->
    <div class="flex flex-col flex-1 w-full transition-all duration-300" :class="isSidebarOpen ? 'lg:pl-64' : 'lg:pl-64 pl-0'">
      <Topbar @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
      <main class="flex-1 p-4 lg:p-6 overflow-y-auto h-[calc(100vh-4rem)]">
        <slot />
      </main>
    </div>

    <UNotifications />
    <UModals />
    <USlideovers />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useContactStore } from '~/stores/contacts'

const isSidebarOpen = ref(false)
const authStore = useAuthStore()
const contactStore = useContactStore()

onMounted(() => {
  // O middleware agora cuida da inicialização e regras de segurança de forma global.
  // Apenas pré-carregamos dados se estivermos autenticados e inicializados.
  if (authStore.token && contactStore.contacts.length === 0) {
    contactStore.fetchContacts({ is_paginate: true, per_page: 100, page: 1 })
  }
})
</script>