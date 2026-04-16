<template>
  <div class="space-y-8 max-w-7xl mx-auto pb-20">
    <!-- Header with Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="md:col-span-2">
        <h2 class="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Campanhas & Histórico</h2>
        <p class="text-sm text-zinc-500 mt-2">Acompanhe o desempenho das suas transmissões e automações de WhatsApp.</p>
      </div>
      
      <!-- Quick Stats Card -->
      <div class="bg-[#FF009D]/5 border border-[#FF009D]/20 rounded-2xl p-4 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-[#FF009D] flex items-center justify-center shadow-lg shadow-[#FF009D]/20">
          <Icon name="ph:paper-plane-tilt-fill" class="w-6 h-6 text-white" />
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-[#FF009D]">Total de Envios</p>
          <p class="text-2xl font-black text-zinc-900 dark:text-white">{{ totalSent }}</p>
        </div>
      </div>

      <div class="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Icon name="ph:check-circle-fill" class="w-6 h-6 text-white" />
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Taxa de Sucesso</p>
          <p class="text-2xl font-black text-zinc-900 dark:text-white">98.2%</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <!-- Sidebar Actions -->
      <div class="lg:col-span-1 space-y-6">
        <div class="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 class="font-bold text-zinc-900 dark:text-white mb-4 text-sm uppercase tracking-widest">Ações Rápidas</h3>
          <div class="flex flex-col gap-3">
            <NuxtLink to="/broadcast" class="w-full px-5 py-3 bg-[#FF009D] text-white font-bold text-sm rounded-xl hover:bg-[#D90085] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#FF009D]/20">
              <Icon name="ph:broadcast-bold" class="w-5 h-5" /> Nova Transmissão
            </NuxtLink>
            <button @click="openNewFlow" class="w-full px-5 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-sm rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2">
              <Icon name="ph:robot-bold" class="w-5 h-5" /> Criar Automação
            </button>
          </div>
        </div>

        <!-- Info Card -->
        <div class="p-6 bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-100 dark:to-zinc-300 rounded-3xl text-white dark:text-zinc-950 shadow-xl overflow-hidden relative">
          <Icon name="ph:shield-check-fill" class="absolute -right-4 -bottom-4 w-24 h-24 opacity-10" />
          <h4 class="font-bold text-lg leading-tight">Privacidade & Segurança</h4>
          <p class="text-xs mt-2 opacity-70">Suas transmissões seguem os protocolos de segurança da Evolution API para evitar bloqueios.</p>
        </div>
      </div>

      <!-- Main History Table -->
      <div class="lg:col-span-3">
        <div class="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
          <div class="px-4 sm:px-8 py-4 sm:py-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
            <h3 class="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Icon name="ph:clock-history-bold" class="text-[#FF009D]" /> Histórico de Disparos
            </h3>
            <button @click="fetchBroadcasts" class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
              <Icon name="ph:arrows-clockwise-bold" :class="loading ? 'animate-spin' : ''" />
            </button>
          </div>
          
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm whitespace-nowrap">
              <thead class="bg-zinc-50/80 dark:bg-zinc-900/50 text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th class="px-4 sm:px-8 py-4 sm:py-5 font-bold text-[10px] uppercase tracking-widest text-zinc-400">Transmissão</th>
                  <th class="px-4 sm:px-8 py-4 sm:py-5 font-bold text-[10px] uppercase tracking-widest text-zinc-400 text-center hidden sm:table-cell">Contatos</th>
                  <th class="px-4 sm:px-8 py-4 sm:py-5 font-bold text-[10px] uppercase tracking-widest text-zinc-400 text-center">Status</th>
                  <th class="px-4 sm:px-8 py-4 sm:py-5 font-bold text-[10px] uppercase tracking-widest text-zinc-400 text-center hidden md:table-cell">Data do Envio</th>
                  <th class="px-4 sm:px-8 py-4 sm:py-5 font-bold text-[10px] uppercase tracking-widest text-zinc-400 text-center">Ação</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-inter">
                <tr v-for="b in broadcasts" :key="b.id" class="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-all">
                  <td class="px-4 sm:px-8 py-4 sm:py-6">
                    <div class="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-[#FF009D] transition-colors truncate max-w-[160px] sm:max-w-none">{{ b.name }}</div>
                    <div class="text-[11px] text-zinc-500 truncate max-w-[160px] sm:max-w-[250px] mt-1">{{ b.message }}</div>
                  </td>
                  <td class="px-4 sm:px-8 py-4 sm:py-6 text-center hidden sm:table-cell">
                    <div class="flex flex-col items-center">
                      <span class="font-black text-zinc-900 dark:text-white">{{ b.total_contacts }}</span>
                      <span class="text-[9px] uppercase tracking-tighter text-zinc-400">Destinatários</span>
                    </div>
                  </td>
                  <td class="px-4 sm:px-8 py-4 sm:py-6 text-center">
                    <div class="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm"
                          :class="b.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse'">
                      <div class="w-1.5 h-1.5 rounded-full" :class="b.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'"></div>
                      {{ b.status === 'completed' ? 'Finalizado' : 'Enviando' }}
                    </div>
                  </td>
                  <td class="px-4 sm:px-8 py-4 sm:py-6 text-center hidden md:table-cell">
                    <div class="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{{ formatDate(b.created_at).split(' ')[0] }}</div>
                    <div class="text-[10px] text-zinc-400 mt-0.5">{{ formatDate(b.created_at).split(' ')[1] }}</div>
                  </td>
                  <td class="px-4 sm:px-8 py-4 sm:py-6 text-center">
                    <button @click="deleteBroadcast(b.id)" class="w-9 h-9 flex items-center justify-center rounded-xl bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                      <Icon name="ph:trash-bold" class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                
                <!-- Zero State -->
                <tr v-if="broadcasts.length === 0">
                  <td colspan="5" class="px-8 py-24 text-center">
                    <div v-if="loading" class="flex flex-col items-center gap-3">
                      <Icon name="ph:spinner-gap-bold" class="w-10 h-10 text-[#FF009D] animate-spin" />
                      <p class="text-sm font-bold text-zinc-400 uppercase tracking-widest">Sincronizando com o Backend...</p>
                    </div>
                    <div v-else class="flex flex-col items-center gap-4">
                      <div class="w-20 h-20 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center">
                        <Icon name="ph:clipboard-text-bold" class="w-10 h-10 text-zinc-200 dark:text-zinc-800" />
                      </div>
                      <div class="max-w-[200px]">
                        <p class="text-sm font-bold text-zinc-900 dark:text-white">Nenhum histórico</p>
                        <p class="text-xs text-zinc-500 mt-1">Suas transmissões aparecerão aqui assim que forem enviadas.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Mockup for Automation (Nice UI) -->
    <div v-if="showFlowModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
      <div class="bg-white dark:bg-[#09090b] w-full max-w-xl rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col transform transition-all">
        <div class="px-10 py-8 flex justify-between items-center">
           <div>
             <h3 class="font-black text-2xl text-zinc-900 dark:text-white tracking-tight">Nova Automação</h3>
             <p class="text-sm text-zinc-500">Configure um robô para enviar mensagens automáticas.</p>
           </div>
           <button @click="showFlowModal = false" class="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:rotate-90 transition-all">
             <Icon name="ph:x-bold" class="w-5 h-5"/>
           </button>
        </div>
        
        <div class="px-10 pb-10 space-y-6">
           <div class="grid grid-cols-2 gap-4">
             <div class="flex flex-col gap-2">
               <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nome do Fluxo</label>
               <input v-model="newFlow.name" type="text" placeholder="Ex: Boas Vindas" class="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border-none rounded-2xl text-sm focus:ring-2 ring-[#FF009D]/20 outline-none" />
             </div>
             <div class="flex flex-col gap-2">
               <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Gatilho</label>
               <select v-model="newFlow.trigger" class="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border-none rounded-2xl text-sm focus:ring-2 ring-[#FF009D]/20 outline-none">
                 <option value="new_user">Novo Cadastro</option>
                 <option value="abandoned">Carrinho Abandonado</option>
                 <option value="sale">Venda Realizada</option>
               </select>
             </div>
           </div>

           <div class="flex flex-col gap-2">
             <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Template da Mensagem</label>
             <textarea v-model="newFlow.message" rows="4" placeholder="Olá {{nome}}, seja bem-vindo à nossa plataforma..." class="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border-none rounded-2xl text-sm focus:ring-2 ring-[#FF009D]/20 outline-none resize-none"></textarea>
           </div>

           <div class="pt-4 flex gap-3">
             <button @click="showFlowModal = false" class="flex-1 px-8 py-4 font-bold text-sm text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded-2xl hover:bg-zinc-200 transition-all">Descartar</button>
             <button @click="showFlowModal = false" class="flex-[2] px-8 py-4 bg-[#FF009D] text-white font-black text-sm rounded-2xl shadow-lg shadow-[#FF009D]/25 hover:scale-[1.02] active:scale-95 transition-all">Ativar Automação</button>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHead, useSupabaseClient } from '#imports'
import { ref, computed, onMounted } from 'vue'

useHead({ title: 'Campanhas - Lojou Messaging' })

const supabase = useSupabaseClient()
const broadcasts = ref<any[]>([])
const loading = ref(false)

const totalSent = computed(() => {
  return broadcasts.value.reduce((acc, b) => acc + (b.total_contacts || 0), 0)
})

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
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + 
         ' ' + 
         date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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

// Flow state
const showFlowModal = ref(false)
const newFlow = ref({ name: '', trigger: 'new_user', delayValue: 15, delayUnit: 'min', message: '' })
const openNewFlow = () => { showFlowModal.value = true }
</script>

<style scoped>
.font-inter { font-family: 'Inter', sans-serif; }
</style>
