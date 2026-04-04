<template>
  <div class="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950">
    <template v-if="contact">
      <!-- Chat Header -->
      <div class="h-16 px-6 border-b dark:border-zinc-800 bg-white dark:bg-[#09090b] flex items-center justify-between shadow-sm z-10">
        <div class="flex items-center gap-3">
          <UAvatar :alt="contact.name" />
          <div>
            <h3 class="font-medium">{{ contact.name }}</h3>
            <p class="text-xs text-zinc-500">{{ contact.phone }}</p>
          </div>
        </div>
      </div>
      
      <!-- Chat Messages -->
      <div class="flex-1 overflow-y-auto p-6 space-y-4">
        <div v-for="msg in messages" :key="msg.id" 
              class="flex" :class="msg.is_outgoing ? 'justify-end' : 'justify-start'">
          <div class="max-w-[70%] rounded-2xl px-4 py-2" 
                :class="msg.is_outgoing ? 'bg-[#FF009D] text-white rounded-br-none' : 'bg-white dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-bl-none'">
            <p>{{ msg.content }}</p>
            <div class="text-[10px] mt-1 flex justify-end items-center gap-1 opacity-80">
              <span>{{ new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</span>
              <UIcon v-if="msg.is_outgoing" 
                      :name="msg.status === 'read' ? 'i-heroicons-check-circle-20-solid' : (msg.status === 'delivered' ? 'i-heroicons-check-circle' : 'i-heroicons-check')" 
                      class="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
      
      <!-- Chat Input -->
      <div class="p-4 bg-white dark:bg-[#09090b] border-t dark:border-zinc-800 flex gap-2">
        <UInput v-model="newMessage" class="flex-1" placeholder="Digite uma mensagem..." @keyup.enter="send" />
        <UButton color="primary" @click="send" icon="i-heroicons-paper-airplane" style="background-color: var(--color-primary);" />
      </div>
    </template>
    <div v-else class="flex-1 flex items-center justify-center text-zinc-500">
      Selecione uma conversa para começar
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Contact } from '~/stores/contacts'
import type { Message } from '~/stores/messages'

const props = defineProps<{
  contact: Contact | null
  messages: Message[]
}>()

const emit = defineEmits<{
  (e: 'send', content: string): void
}>()
const newMessage = ref('')

const send = () => {
  if (!newMessage.value.trim()) return
  emit('send', newMessage.value)
  newMessage.value = ''
}
</script>