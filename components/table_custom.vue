<template>
  <UTable :columns="columns" :rows="rows" :ui="{ td: { color: 'text-zinc-500 dark:text-zinc-400' }, th: { color: 'text-zinc-900 dark:text-white' } }">
    <template v-for="(_, slot) in $slots" v-slot:[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
  </UTable>
</template>

<script setup lang="ts">
defineProps<{
  columns: any[],
  rows: any[]
}>()
</script>