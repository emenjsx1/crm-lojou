<template>
  <UModal v-model="isOpen">
    <CustomCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
            {{ title }}
          </h3>
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isOpen = false" />
        </div>
      </template>
      <slot />
    </CustomCard>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>('modelValue', { default: false })
defineProps<{
  title: string
}>()
</script>