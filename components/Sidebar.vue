<template>
  <aside class="w-64 border-r dark:border-zinc-800 h-screen fixed left-0 top-0 bg-white dark:bg-[#09090b] flex flex-col z-20">
    <div class="h-16 flex items-center justify-center border-b dark:border-zinc-800">
      <h1 class="text-xl font-bold text-[#FF009D]">LOJOU MSG</h1>
    </div>
    <nav class="flex-1 p-4 flex flex-col gap-2">
      <NuxtLink v-for="link in links" :key="link.path" :to="link.path" class="px-4 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" active-class="bg-[#FF009D] text-white hover:bg-[#FF009D] hover:text-white dark:hover:bg-[#FF009D]">
        {{ link.name }}
      </NuxtLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
const links = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Messages', path: '/messages' },
  { name: 'Broadcast', path: '/broadcast' },
  { name: 'Campaigns', path: '/campaigns' },
  { name: 'Settings', path: '/settings' }
]
</script>