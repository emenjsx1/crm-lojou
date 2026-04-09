<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-10">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h2 class="text-2xl font-bold text-zinc-900 dark:text-white">Premiação (Metas)</h2>
        <p class="text-sm text-zinc-500 mt-1">Acompanhe os usuários que bateram grandes marcos de vendas (10k a 1M).</p>
      </div>
      <button @click="loadRewards" class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all font-medium">
        <Icon :name="loading ? 'ph:spinner-gap-bold' : 'ph:arrows-clockwise-bold'" :class="{'animate-spin text-[#FF009D]': loading}" />
        Atualizar Ranking
      </button>
    </div>

    <!-- Tiers Selector -->
    <div class="flex flex-wrap gap-3 mb-6">
      <button v-for="tier in tiers" :key="tier.value"
        @click="activeTier = tier.value"
        class="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all flex items-center gap-2"
        :class="activeTier === tier.value 
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-500' 
          : 'bg-white dark:bg-[#09090b] border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-amber-500/30 hover:text-amber-600'">
        <Icon :name="tier.icon" />
        Meta: {{ tier.label }}
      </button>
    </div>

    <!-- Tab Content / Users List -->
    <div class="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
      <div v-if="loading" class="flex items-center justify-center h-64 text-[#FF009D]">
        <Icon name="ph:spinner-gap-bold" class="w-8 h-8 animate-spin" />
      </div>
      
      <div v-else-if="filteredUsers.length === 0" class="flex flex-col items-center justify-center p-12 text-center">
        <div class="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4 text-zinc-400">
          <Icon name="ph:trophy-bold" class="w-8 h-8" />
        </div>
        <h3 class="text-zinc-900 dark:text-white font-semibold text-lg">Nenhum Vencedor Ainda</h3>
        <p class="text-zinc-500 text-sm max-w-md mt-2">Até ao momento, nenhum produtor atingiu a marca de {{ activeTierLabel }}.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th class="px-6 py-4 font-semibold text-xs tracking-wide">Produtor</th>
              <th class="px-6 py-4 font-semibold text-xs tracking-wide">Contacto</th>
              <th class="px-6 py-4 font-semibold text-xs tracking-wide">Meta Atingida</th>
              <th class="px-6 py-4 font-semibold text-xs tracking-wide text-right">Acção Recomendada</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                   <div class="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold uppercase text-xs">
                     {{ (user.name || user.firstname || 'S N').substring(0,2) }}
                   </div>
                   <div class="flex flex-col">
                     <span class="font-medium text-zinc-900 dark:text-zinc-100">{{ user.name || user.firstname }}</span>
                     <span class="text-[10px] text-emerald-500 font-medium">Bateu {{ activeTierLabel }}</span>
                   </div>
                </div>
              </td>
              <td class="px-6 py-4 text-zinc-500 text-xs">{{ user.phone || user.email || 'N/A' }}</td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold tracking-wider rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-500">
                  <Icon name="ph:star-fill" class="w-3 h-3" /> {{ activeTierLabel }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <NuxtLink to="/messages" class="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-[#FF009D]/10 text-zinc-700 dark:text-zinc-300 hover:text-[#FF009D] rounded-lg text-xs font-medium transition-colors">
                  Dar Parabéns <Icon name="ph:chat-teardrop-text-bold" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

useHead({ title: 'Premiação - Lojou' })

const activeTier = ref(10000)
const loading = ref(false)

const tiers = [
  { value: 10000, label: '10K MT', icon: 'ph:medal-bold' },
  { value: 50000, label: '50K MT', icon: 'ph:trophy-bold' },
  { value: 100000, label: '100K MT', icon: 'ph:crown-bold' },
  { value: 500000, label: '500K MT', icon: 'ph:diamond-bold' },
  { value: 1000000, label: '1 Milhão MT', icon: 'ph:flying-saucer-bold' }
]

// Mock de usuários premiados visto que Endpoint ainda será mapeado 
// (Substituir com Store de utilizadores ou API no futuro)
const rewardedUsers = ref<any[]>([
  { id: 101, name: 'João Miguel', phone: '25884xxxxxxx', email: 'joao@mail.com', total_earnings: 15400 },
  { id: 102, name: 'Marta Silveira', phone: '25887xxxxxxx', email: 'marta@mail.com', total_earnings: 52000 },
  { id: 103, name: 'Kliquei Afiliado', phone: '+25886xxxxxxx', email: 'afiliado@kliquei.com', total_earnings: 120000 },
  { id: 104, name: 'Lojou Top', phone: '25885xxxxxxx', email: 'top@lojou.app', total_earnings: 1050000 }
])

const activeTierLabel = computed(() => {
  return tiers.find(t => t.value === activeTier.value)?.label || 'Meta'
})

const filteredUsers = computed(() => {
  return rewardedUsers.value.filter(u => {
    // Retorna utilizadores que estão neste tier, mas não no próximo
    const currentTierIndex = tiers.findIndex(t => t.value === activeTier.value)
    const nextTierValue = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1].value : Infinity
    
    return u.total_earnings >= activeTier.value && u.total_earnings < nextTierValue
  })
})

const loadRewards = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 1000)
}

onMounted(() => {
  loadRewards()
})
</script>
