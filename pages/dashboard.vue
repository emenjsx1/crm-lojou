<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <CustomCard>
        <div class="p-6">
          <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Mensagens Enviadas</h3>
          <p class="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">1,234</p>
        </div>
      </CustomCard>
      
      <CustomCard>
        <div class="p-6">
          <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Respostas</h3>
          <p class="text-3xl font-bold text-[#FF009D] mt-2">856</p>
        </div>
      </CustomCard>
      
      <CustomCard>
        <div class="p-6">
          <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Taxa de Resposta</h3>
          <p class="text-3xl font-bold text-[#4CAF50] mt-2">69.4%</p>
        </div>
      </CustomCard>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Dashboard - Lojou Messaging' })
</script>