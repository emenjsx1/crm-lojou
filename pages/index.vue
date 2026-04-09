<template>
  <div class="min-h-screen flex items-center justify-center bg-zinc-950">
    <div class="animate-pulse flex items-center gap-3 text-[#FF009D]">
      <Icon name="ph:spinner-gap-bold" class="w-8 h-8 animate-spin" />
      <span class="font-semibold text-lg">A aceder à Lojou CRM...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// A página de login foi abolida. Sendo um CRM local com tokens no código, 
// reencaminhamos diretamente para o Painel principal.
onMounted(() => {
  router.push('/dashboard')
})
</script>