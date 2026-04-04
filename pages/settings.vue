<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <CustomCard>
      <template #header>
        <div class="p-4 border-b dark:border-zinc-800">
          <h3 class="font-semibold text-lg text-gray-900 dark:text-white">LoJOU API</h3>
        </div>
      </template>
      <div class="p-6 space-y-4">
        <UFormGroup label="Endpoint">
          <UInput v-model="settings.lojouEndpoint" placeholder="https://api.lojou.com/v1" />
        </UFormGroup>
        <UFormGroup label="Token">
          <UInput v-model="settings.lojouToken" type="password" placeholder="••••••••••••" />
        </UFormGroup>
      </div>
    </CustomCard>

    <CustomCard>
      <template #header>
        <div class="p-4 border-b dark:border-zinc-800">
          <h3 class="font-semibold text-lg text-gray-900 dark:text-white">Tsemba API</h3>
        </div>
      </template>
      <div class="p-6 space-y-4">
        <UFormGroup label="API Key">
          <UInput v-model="settings.tsembaKey" type="password" placeholder="••••••••••••" />
        </UFormGroup>
        <UFormGroup label="Número do WhatsApp">
          <UInput v-model="settings.tsembaPhone" placeholder="+55 11 9999-9999" />
        </UFormGroup>
      </div>
      <template #footer>
        <div class="flex justify-end p-4 bg-gray-50 dark:bg-[#09090b] rounded-b-xl border-t dark:border-zinc-800">
          <UButton style="background-color: var(--color-primary); color: white;" @click="saveSettings">Salvar Configurações</UButton>
        </div>
      </template>
    </CustomCard>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '#imports'

const toast = useToast()

const settings = reactive({
  lojouEndpoint: '',
  lojouToken: '',
  tsembaKey: '',
  tsembaPhone: ''
})

const saveSettings = () => {
  toast.add({ title: 'Sucesso', description: 'Configurações salvas.', color: 'green' })
}
</script>
