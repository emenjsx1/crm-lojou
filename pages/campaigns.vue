<template>
  <div class="space-y-6">
    <CustomCard>
      <div class="p-6 border-b dark:border-zinc-800">
        <h2 class="text-xl font-semibold">Campanhas Anteriores</h2>
      </div>
      <div class="p-0">
        <table_custom :columns="columns" :rows="campaigns">
          <template #status-data="{ row }">
            <UBadge :color="row.status === 'Concluída' ? 'green' : 'orange'" variant="subtle">{{ row.status }}</UBadge>
          </template>
        </table_custom>
      </div>
    </CustomCard>
  </div>
</template>

<script setup lang="ts">
const columns = [
  { key: 'name', label: 'Nome da Campanha' },
  { key: 'date', label: 'Data' },
  { key: 'sent', label: 'Enviadas' },
  { key: 'delivered', label: 'Entregues' },
  { key: 'replies', label: 'Respostas' },
  { key: 'status', label: 'Status' }
]

const campaigns = ref([
  { id: 1, name: 'Aviso Vendedores Novos', date: '02/04/2026', sent: 150, delivered: 148, replies: 45, status: 'Concluída' },
  { id: 2, name: 'Cobrança Mensal', date: '01/04/2026', sent: 300, delivered: 295, replies: 120, status: 'Concluída' }
])
</script>
