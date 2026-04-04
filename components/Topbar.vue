<template>
  <header class="h-16 border-b dark:border-zinc-800 bg-white dark:bg-[#09090b] flex items-center justify-between px-6 sticky top-0 z-10 w-full">
    <div>
      <h2 class="text-lg font-medium">{{ title }}</h2>
    </div>
    <div class="flex items-center gap-4">
      <ClientOnly>
        <UButton color="gray" variant="ghost" :icon="colorMode.value === 'dark' ? 'i-heroicons-sun-20-solid' : 'i-heroicons-moon-20-solid'" @click="toggleColorMode" />
      </ClientOnly>
      <UAvatar src="https://avatars.githubusercontent.com/u/1?v=4" alt="User" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()

const title = computed(() => {
  const path = route.path.replace('/', '')
  return path ? path.charAt(0).toUpperCase() + path.slice(1) : 'Dashboard'
})

const colorMode = useColorMode()
const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>