<template>
  <aside 
    class="w-64 border-r dark:border-zinc-800 h-screen fixed left-0 top-0 bg-white dark:bg-[#09090b] flex flex-col z-30 transform transition-transform duration-300 lg:translate-x-0"
    :class="isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'"
  >
    <div class="h-16 flex items-center justify-between border-b dark:border-zinc-800 px-4">
      <img src="https://beta.lojou.app/_nuxt/lojou_logo.GwpKP2Th.png" alt="Lojou Logo" class="h-8 w-auto" />
      <UButton
        color="gray"
        variant="ghost"
        icon="i-heroicons-x-mark-20-solid"
        class="lg:hidden"
        @click="$emit('close')"
      />
    </div>

    <nav class="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
      <NuxtLink v-for="link in links" :key="link.path" :to="link.path" class="px-4 py-3 text-sm font-medium text-zinc-600 dark:text-zinc-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-3" active-class="bg-[#FF009D]/10 text-[#FF009D] hover:bg-[#FF009D]/20 dark:bg-[#FF009D]/10 dark:text-[#FF009D] dark:hover:bg-[#FF009D]/20" @click="$emit('close')">
        <Icon :name="link.icon" class="w-5 h-5" />
        {{ link.name }}
      </NuxtLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close'])

const links = [
  { name: 'Painel', path: '/dashboard', icon: 'ph:squares-four-bold' },
  { name: 'Contatos', path: '/contacts', icon: 'ph:users-bold' },
  { name: 'Mensagens', path: '/messages', icon: 'ph:chats-bold' },
  { name: 'Transmissões', path: '/broadcast', icon: 'ph:megaphone-bold' },
  { name: 'Campanhas', path: '/campaigns', icon: 'ph:rocket-launch-bold' },
  { name: 'Premiação', path: '/premiacao', icon: 'ph:trophy-bold' },
  { name: 'Configurações', path: '/settings', icon: 'ph:gear-bold' }
]
</script>
