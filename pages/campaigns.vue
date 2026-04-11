<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-10">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h2 class="text-2xl font-bold text-zinc-900 dark:text-white">Campanhas & Automações</h2>
        <p class="text-sm text-zinc-500 mt-1">Gerencie fluxos automáticos de WhatsApp para produtores e afiliados da Lojou.</p>
      </div>
      <button @click="openNewFlow" class="px-5 py-2.5 bg-[#FF009D] text-white font-medium text-sm rounded-lg hover:bg-[#D90085] transition-all flex items-center gap-2 shadow-lg shadow-[#FF009D]/20">
        <Icon name="ph:plus-bold" /> Criar Fluxo
      </button>
    </div>

    <!-- Modal: Create Flow -->
    <div v-if="showFlowModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div class="bg-white dark:bg-[#09090b] w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
           <h3 class="font-bold text-lg text-zinc-900 dark:text-white">Criar Nova Automação</h3>
           <button @click="showFlowModal = false" class="text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors">
             <Icon name="ph:x-bold" class="w-5 h-5"/>
           </button>
        </div>
        <div class="p-6 flex flex-col gap-5">
           <!-- Flow Name -->
           <div class="flex flex-col gap-2">
             <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Nome do Fluxo</label>
             <input v-model="newFlow.name" type="text" placeholder="Ex: Boas Vindas ao Produtor" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-[#FF009D]" />
           </div>

           <!-- Trigger -->
           <div class="flex flex-col gap-2">
             <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Gatilho (Quando disparar?)</label>
             <select v-model="newFlow.trigger" class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-[#FF009D]">
               <option value="new_user">Após cadastro de Usuário (Produtor/Afiliado)</option>
               <option value="first_sale">Quando fizer a primeira Venda</option>
               <option value="withdrawal">Quando solicitar um Saque</option>
               <option value="cron">CRON JOB (Agendamento Fixo)</option>
             </select>
           </div>
           
           <!-- Delay -->
           <div class="flex flex-col gap-2">
             <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Atraso antes de enviar (Delay)</label>
             <div class="flex items-center gap-2">
                <input v-model="newFlow.delayValue" type="number" min="0" placeholder="15" class="w-20 px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-[#FF009D]" />
                <select v-model="newFlow.delayUnit" class="w-32 px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-[#FF009D]">
                 <option value="min">Minutos</option>
                 <option value="h">Horas</option>
                 <option value="d">Dias</option>
               </select>
             </div>
             <p class="text-[11px] text-zinc-400">Ex: 15 minutos após o cadastro → recebe mensagem de boas-vindas</p>
           </div>

           <!-- Message Template -->
           <div class="flex flex-col gap-2">
             <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Mensagem Template (WhatsApp)</label>
             <textarea v-model="newFlow.message" rows="4" placeholder="Olá {{nome}}! Seja bem-vindo(a) à Lojou..." class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-[#FF009D] resize-none"></textarea>
             <p class="text-[11px] text-zinc-400">Use <span class="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">&#123;&#123;nome&#125;&#125;</span> para o nome do usuário</p>
           </div>
        </div>
        <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 rounded-b-2xl">
          <button @click="showFlowModal = false" class="px-5 py-2 font-medium text-sm text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
          <button @click="saveFlow" :disabled="!newFlow.name || !newFlow.message" class="px-6 py-2 bg-[#FF009D] disabled:opacity-40 text-white font-medium text-sm rounded-lg flex items-center gap-2 hover:bg-[#D90085] transition-colors shadow-lg shadow-[#FF009D]/20">
            <Icon name="ph:check-bold" class="w-4 h-4" /> Salvar e Ativar Fluxo
          </button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Left: Active Triggers / Automations -->
      <div class="lg:col-span-1 space-y-6">
        <div class="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
           <h3 class="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
             <Icon name="ph:lightning-bold" class="text-amber-500" /> Gatilhos Ativos ({{ flows.filter(f => f.active).length }}/{{ flows.length }})
           </h3>
           <div class="flex flex-col gap-3">
             <div v-for="flow in flows" :key="flow.id"
                  class="p-4 border rounded-xl flex flex-col gap-3 relative overflow-hidden transition-all"
                  :class="flow.active ? 'border-[#FF009D]/30 bg-[#FF009D]/5' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50'">
               <div class="flex justify-between items-start gap-2">
                 <div class="min-w-0">
                   <h4 class="text-sm font-semibold truncate" :class="flow.active ? 'text-[#FF009D]' : 'text-zinc-900 dark:text-white'">{{ flow.name }}</h4>
                   <p class="text-[11px] text-zinc-500 mt-0.5">{{ triggerLabel(flow.trigger) }} — Delay: {{ flow.delayValue }}{{ flow.delayUnit }}</p>
                 </div>
                 <!-- Toggle -->
                 <button @click="flow.active = !flow.active" class="shrink-0 w-10 h-5 rounded-full transition-colors relative" :class="flow.active ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'">
                   <div class="w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm" :class="flow.active ? 'right-0.5' : 'left-0.5'"></div>
                 </button>
               </div>
               <div class="flex items-center justify-between">
                 <div class="flex items-center gap-3 text-xs font-medium text-zinc-500">
                   <span class="flex items-center gap-1"><Icon name="ph:paper-plane-right-fill" class="text-[#FF009D]"/> {{ flow.sent }}</span>
                 </div>
                 <button @click="deleteFlow(flow.id)" class="text-zinc-400 hover:text-red-500 transition-colors">
                   <Icon name="ph:trash-bold" class="w-4 h-4" />
                 </button>
               </div>
             </div>

             <div v-if="flows.length === 0" class="py-8 text-center text-zinc-500">
               <Icon name="ph:lightning-slash" class="w-8 h-8 mx-auto opacity-20 mb-2" />
               <p class="text-sm">Nenhum fluxo criado. Clique em "Criar Fluxo".</p>
             </div>
           </div>
        </div>
      </div>

      <!-- Right: Campaign History -->
      <div class="lg:col-span-2">
        <div class="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div class="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h3 class="font-semibold text-zinc-900 dark:text-white">Histórico de Disparos</h3>
          </div>
          
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm whitespace-nowrap">
              <thead class="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th class="px-6 py-4 font-semibold text-xs tracking-wide">Título da Transmissão</th>
                  <th class="px-6 py-4 font-semibold text-xs tracking-wide text-center">Destinatários</th>
                  <th class="px-6 py-4 font-semibold text-xs tracking-wide text-center">Status</th>
                  <th class="px-6 py-4 font-semibold text-xs tracking-wide text-center">Data/Hora</th>
                  <th class="px-6 py-4 font-semibold text-xs tracking-wide text-center">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                <tr v-for="b in broadcasts" :key="b.id" class="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                  <td class="px-6 py-4">
                    <div class="font-medium text-zinc-900 dark:text-zinc-100">{{ b.name }}</div>
                    <div class="text-[11px] text-zinc-500 truncate max-w-[200px]">{{ b.message }}</div>
                  </td>
                  <td class="px-6 py-4 text-center text-zinc-600 dark:text-zinc-400 font-medium">{{ b.total_contacts }}</td>
                  <td class="px-6 py-4 text-center">
                    <span :class="[
                      'inline-flex px-2.5 py-1 text-[11px] font-bold uppercase rounded-md tracking-wider',
                      b.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    ]">{{ b.status === 'completed' ? 'Finalizado' : 'Enviando...' }}</span>
                  </td>
                  <td class="px-6 py-4 text-center text-xs text-zinc-500">
                    {{ formatDate(b.created_at) }}
                  </td>
                  <td class="px-6 py-4 text-center">
                    <button @click="deleteBroadcast(b.id)" class="text-xs text-red-500 hover:text-red-700 font-medium">Deletar</button>
                  </td>
                </tr>
                <tr v-if="broadcasts.length === 0">
                  <td colspan="5" class="px-6 py-10 text-center text-zinc-400 text-sm">
                    {{ loading ? 'Carregando histórico...' : 'Nenhuma transmissão realizada ainda.' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

useHead({ title: 'Campanhas - Lojou Messaging' })

const supabase = useSupabaseClient()
const broadcasts = ref<any[]>([])
const loading = ref(false)

const fetchBroadcasts = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    broadcasts.value = data || []
  } catch (e: any) {
    console.error('Erro ao buscar transmissões:', e.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchBroadcasts()
})

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const deleteBroadcast = async (id: string) => {
  if (!confirm('Eliminar esta transmissão do histórico?')) return
  try {
    const { error } = await supabase.from('broadcasts').delete().eq('id', id)
    if (error) throw error
    broadcasts.value = broadcasts.value.filter(b => b.id !== id)
  } catch (e: any) {
    alert('Erro ao eliminar: ' + e.message)
  }
}

// Flow state (for the modal UI only)
const showFlowModal = ref(false)
const newFlow = ref({ name: '', trigger: 'new_user', delayValue: 15, delayUnit: 'min', message: '' })
const openNewFlow = () => { showFlowModal.value = true }

</script>


