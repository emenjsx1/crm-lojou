<template>
  <header class="h-16 border-b dark:border-zinc-800 bg-white dark:bg-[#09090b] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10 w-full">
    <div class="flex items-center gap-3">
      <UButton
        color="gray"
        variant="ghost"
        icon="i-heroicons-bars-3-20-solid"
        class="lg:hidden"
        @click="$emit('toggle-sidebar')"
      />
      <h2 class="text-base lg:text-lg font-medium truncate">{{ title }}</h2>
    </div>
    <div class="flex items-center gap-2 lg:gap-4">
      <ClientOnly>
        <UButton color="gray" variant="ghost" :icon="colorMode.value === 'dark' ? 'i-heroicons-sun-20-solid' : 'i-heroicons-moon-20-solid'" @click="toggleColorMode" />
      </ClientOnly>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const emit = defineEmits(['toggle-sidebar'])

const title = computed(() => {
  const path = route.path.replace('/', '')
  return path ? path.charAt(0).toUpperCase() + path.slice(1) : 'Dashboard'
})

const colorMode = useColorMode()
const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>