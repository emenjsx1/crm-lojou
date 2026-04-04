<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Left Column: Filters & List -->
    <div class="lg:col-span-1 space-y-6">
      <CustomCard>
        <template #header>
          <div class="p-4 border-b dark:border-zinc-800">
            <h3 class="font-semibold text-lg">Filtros</h3>
          </div>
        </template>
        <div class="p-6 space-y-4">
          <URadioGroup v-model="filters.status" legend="Status de Venda" :options="[{value: 'all', label: 'Todos'}, {value: 'purchased', label: 'Já venderam'}, {value: 'not_purchased', label: 'Não venderam'}]" />
          <URadioGroup v-model="filters.verification" legend="Verificação" :options="[{value: 'all', label: 'Todos'}, {value: 'verified', label: 'Verificados'}, {value: 'unverified', label: 'Não verificados'}]" />
        </div>
      </CustomCard>
      
      <CustomCard>
        <template #header>
          <div class="p-4 border-b dark:border-zinc-800 flex justify-between items-center">
            <h3 class="font-semibold text-lg">Vendedores ({{ filteredContacts.length }})</h3>
            <UCheckbox v-model="selectAll" label="Todos" />
          </div>
        </template>
        <div class="p-4 max-h-[400px] overflow-y-auto space-y-2">
          <div v-for="contact in filteredContacts" :key="contact.id" class="flex items-center gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded">
            <UCheckbox v-model="selectedContacts" :value="contact.id" />
            <div>
              <p class="font-medium text-sm">{{ contact.name }}</p>
              <p class="text-xs text-zinc-500">{{ contact.phone }}</p>
            </div>
          </div>
        </div>
      </CustomCard>
    </div>
    
    <!-- Right Column: Campaign Composer -->
    <div class="lg:col-span-2">
      <CustomCard>
        <template #header>
          <div class="p-4 border-b dark:border-zinc-800">
            <h3 class="font-semibold text-lg">Nova Campanha</h3>
          </div>
        </template>
        <div class="p-6 space-y-6">
          <UFormGroup label="Nome da Campanha">
            <UInput v-model="campaignName" placeholder="Ex: Promoção de Natal" />
          </UFormGroup>
          
          <UFormGroup label="Mensagem">
            <template #hint>
              <span class="text-xs text-zinc-500">Variáveis: {nome}</span>
            </template>
            <UTextarea v-model="messageTemplate" :rows="8" placeholder="Olá {nome}, temos uma novidade..." />
          </UFormGroup>
          
          <div class="flex justify-end gap-4">
            <UButton color="gray" variant="solid">Salvar Rascunho</UButton>
            <UButton style="background-color: var(--color-primary); color: white;" @click="sendCampaign">Enviar Campanha</UButton>
          </div>
        </div>
      </CustomCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '#imports'

const contactsStore = useContactStore()
const toast = useToast()

onMounted(() => {
  contactsStore.fetchContacts()
})

const filters = reactive({
  status: 'all',
  verification: 'all'
})

const filteredContacts = computed(() => {
  return contactsStore.contacts.filter(c => {
    let matchStatus = true
    if (filters.status === 'purchased') matchStatus = c.has_purchased
    if (filters.status === 'not_purchased') matchStatus = !c.has_purchased
    
    let matchVer = true
    if (filters.verification === 'verified') matchVer = c.status === 'verified'
    if (filters.verification === 'unverified') matchVer = c.status === 'unverified'
    
    return matchStatus && matchVer
  })
})

const selectedContacts = ref<number[]>([])
const selectAll = computed({
  get: () => filteredContacts.value.length > 0 && selectedContacts.value.length === filteredContacts.value.length,
  set: (val) => {
    if (val) selectedContacts.value = filteredContacts.value.map(c => c.id)
    else selectedContacts.value = []
  }
})

const campaignName = ref('')
const messageTemplate = ref('')

const sendCampaign = () => {
  if (!campaignName.value || !messageTemplate.value || selectedContacts.value.length === 0) {
    toast.add({ title: 'Erro', description: 'Preencha todos os campos e selecione contatos.', color: 'red' })
    return
  }
  
  toast.add({ title: 'Sucesso', description: 'Campanha iniciada com sucesso!', color: 'green' })
  campaignName.value = ''
  messageTemplate.value = ''
  selectedContacts.value = []
}
</script>