<template>
  <div class="w-80 border-r dark:border-zinc-800 flex flex-col">
    <div class="p-4 border-b dark:border-zinc-800">
      <UInput icon="i-heroicons-magnifying-glass-20-solid" placeholder="Buscar conversas..." />
    </div>
    <div class="flex-1 overflow-y-auto">
      <div v-for="contact in contacts" :key="contact.id" 
            class="p-4 border-b dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            :class="{ 'bg-zinc-50 dark:bg-zinc-800 border-l-4 border-l-[#FF009D]': activeContactId === contact.id }"
            @click="$emit('select', contact)">
        <div class="flex justify-between items-start">
          <h4 class="font-medium text-zinc-900 dark:text-zinc-100">{{ contact.name }}</h4>
          <span class="text-xs text-zinc-500">12:30</span>
        </div>
        <p class="text-sm text-zinc-500 truncate mt-1">Clique para ver mensagens...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Contact } from '~/stores/contacts'

defineProps<{
  contacts: Contact[]
  activeContactId?: number
}>()

defineEmits<{
  (e: 'select', contact: Contact): void
}>()
</script>