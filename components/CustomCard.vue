<template>
  <UCard :ui="{ background: 'bg-white dark:bg-[#09090b]', ring: 'ring-1 ring-zinc-200 dark:ring-zinc-800', rounded: 'rounded-xl', shadow: 'shadow-sm' }">
    <template #header v-if="$slots.header">
      <slot name="header" />
    </template>
    <slot />
    <template #footer v-if="$slots.footer">
      <slot name="footer" />
    </template>
  </UCard>
</template>