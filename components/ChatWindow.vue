<template>
  <div class="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950 min-w-0">
    <template v-if="contact">
      <!-- Header -->
      <div class="h-16 px-4 lg:px-6 border-b dark:border-zinc-800 bg-white dark:bg-[#09090b] flex items-center justify-between shadow-sm z-10 shrink-0">
        <div class="flex items-center gap-2 lg:gap-3">
          <UButton
            color="gray"
            variant="ghost"
            icon="i-heroicons-chevron-left-20-solid"
            class="lg:hidden"
            @click="$emit('back')"
          />
          <div class="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-[#FF009D]/10 flex items-center justify-center text-[#FF009D] font-bold text-xs lg:text-sm uppercase shrink-0">
            {{ getInitials(contact.full_name || contact.firstname || contact.name || 'CN') }}
          </div>
          <div class="min-w-0">
            <h3 class="font-semibold text-zinc-900 dark:text-white capitalize text-xs lg:text-sm truncate">
              {{ (contact.full_name || contact.firstname || contact.name || 'Sem nome').toLowerCase() }}
            </h3>
            <p class="text-[10px] lg:text-xs text-zinc-500 truncate">{{ formattedPhone || contact.email || '—' }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="hasEvolution" class="text-[10px] font-bold px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-md uppercase tracking-wider flex items-center gap-1">
            <Icon name="ph:check-circle-fill" class="w-3 h-3" /> Evolution Ativa
          </span>
          <span v-else class="text-[10px] font-bold px-2 py-1 bg-amber-500/10 text-amber-500 rounded-md uppercase tracking-wider">
            Sem Evolution
          </span>
        </div>
      </div>

      <!-- Messages -->
      <div ref="msgsContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center text-zinc-400 gap-3">
          <Icon name="ph:chat-teardrop-dots" class="w-12 h-12 opacity-20" />
          <p class="text-sm">Sem mensagens. Envie a primeira!</p>
        </div>

        <template v-for="(msg, index) in groupedMessages" :key="'group-' + index">
          <!-- Date Separator -->
          <div v-if="msg.isNewDay" class="flex justify-center my-6">
            <span class="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 rounded-full uppercase tracking-widest">
              {{ formatDate(msg.timestamp) }}
            </span>
          </div>

          <div class="flex" :class="msg.is_outgoing ? 'justify-end' : 'justify-start'">
            <div class="max-w-[72%] rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md"
              :class="[
                msg.is_outgoing
                  ? 'bg-[#FF009D] text-white rounded-br-none'
                  : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-bl-none',
                msg.status === 'error' ? '!bg-red-500 text-white' : ''
              ]">
              <!-- Conteúdo da Mensagem -->
              <div class="message-content-wrapper relative group">
                <!-- Áudio -->
                <div v-if="msg.type === 'audio' || msg.type === 'ptt'" class="px-3 py-3 flex flex-col gap-1.5 min-w-[240px]">
                  <div class="flex items-center gap-3">
                     <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        <Icon name="ph:microphone-fill" class="w-4 h-4" />
                     </div>
                     <audio controls class="w-full h-8 rounded shrink-0" preload="metadata" style="filter: invert(0.9) hue-rotate(180deg)">
                       <source :src="mediaSource(msg)" :type="msg.mimeType || 'audio/ogg'" />
                     </audio>
                  </div>
                  <div class="flex justify-end items-center gap-1.5 text-[10px] opacity-70">
                    <span class="font-medium">{{ formatTime(msg.timestamp) }}</span>
                    <StatusIcon v-if="msg.is_outgoing" :status="msg.status" />
                  </div>
                </div>

                <!-- Imagem -->
                <div v-else-if="msg.type === 'image'" class="mb-1">
                  <img 
                    :src="msg.mediaUrl || (msg.mediaBase64 ? 'data:' + msg.mimeType + ';base64,' + msg.mediaBase64 : '')" 
                    class="rounded-lg max-w-full max-h-64 cursor-pointer hover:opacity-90 transition"
                    @click="$emit('preview', msg)"
                  />
                  <div v-if="msg.caption" class="px-3 py-2 text-sm">{{ msg.caption }}</div>
                  <div class="px-3 pb-1.5 flex justify-end items-center gap-1.5 text-[10px] opacity-70">
                    <span class="font-medium">{{ formatTime(msg.timestamp) }}</span>
                    <StatusIcon v-if="msg.is_outgoing" :status="msg.status" />
                  </div>
                </div>

                <!-- Vídeo -->
                <div v-else-if="msg.type === 'video'" class="flex flex-col min-w-[200px]">
                  <video controls class="w-full max-w-sm rounded-t-2xl">
                    <source :src="mediaSource(msg)" :type="msg.mimeType || 'video/mp4'" />
                  </video>
                  <div v-if="msg.caption" class="px-3 py-2 text-sm">{{ msg.caption }}</div>
                  <div class="px-3 pb-1.5 flex justify-end items-center gap-1.5 text-[10px] opacity-70">
                    <span class="font-medium">{{ formatTime(msg.timestamp) }}</span>
                    <StatusIcon v-if="msg.is_outgoing" :status="msg.status" />
                  </div>
                </div>

                <!-- Documento -->
                <div v-else-if="msg.type === 'document'" class="px-4 py-3 flex items-center gap-4 min-w-[220px]">
                  <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                     <Icon name="ph:file-pdf-bold" v-if="msg.mimeType?.includes('pdf')" class="w-6 h-6" />
                     <Icon name="ph:file-bold" v-else class="w-6 h-6" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold truncate">{{ msg.content }}</p>
                    <a v-if="msg.mediaUrl || msg.mediaBase64" :href="mediaSource(msg)" target="_blank"
                      class="text-[11px] underline opacity-80 decoration-dotted hover:opacity-100 transition-opacity">Visualizar / Baixar</a>
                  </div>
                  <div class="flex flex-col items-end gap-1 shrink-0">
                    <span class="text-[10px] font-medium opacity-70">{{ formatTime(msg.timestamp) }}</span>
                    <StatusIcon v-if="msg.is_outgoing" :status="msg.status" />
                  </div>
                </div>

                <!-- Texto -->
                <div v-else class="px-4 py-3">
                  <p class="text-[13.5px] leading-relaxed whitespace-pre-wrap">{{ msg.content }}</p>
                  <div class="flex justify-end items-center gap-1.5 mt-1 text-[10px] opacity-75">
                    <span class="font-medium">{{ formatTime(msg.timestamp) }}</span>
                    <StatusIcon v-if="msg.is_outgoing" :status="msg.status" />
                  </div>
                </div>

                <!-- Ações da Mensagem (Hover) -->
                <div 
                  v-if="msg.id"
                  class="absolute -top-3 opacity-0 group-hover:opacity-100 transition-all flex gap-1 bg-white dark:bg-zinc-800 rounded-lg p-1 shadow-md border border-zinc-200 dark:border-zinc-700 z-20"
                  :class="msg.is_outgoing ? 'right-0' : 'left-0'"
                >
                  <button @click="onReply(msg)" class="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition text-indigo-500">
                    <Icon name="ph:chat-dots-bold" class="w-4 h-4" />
                  </button>
                  <button v-if="msg.is_outgoing" @click="onDelete(msg)" class="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/10 rounded transition text-red-500">
                     <Icon name="ph:trash-bold" class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Aviso sem número -->
      <div v-if="!contactPhone" class="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 flex items-center gap-2 shrink-0">
        <Icon name="ph:warning-fill" class="w-4 h-4 text-amber-500 shrink-0" />
        <span class="text-xs text-amber-600 dark:text-amber-400">
          Este contacto não tem número de telefone — não é possível enviar mensagens WhatsApp.
        </span>
      </div>

      <!-- Input Area -->
      <div class="p-3 bg-white dark:bg-[#09090b] border-t dark:border-zinc-800 shrink-0">
        <!-- Preview de Resposta -->
        <div v-if="replyingMessage" class="mb-2 flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 border-l-4 border-indigo-500 rounded-r-lg">
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Responder a {{ replyingMessage.is_outgoing ? 'Você' : (contact.full_name || 'Contacto') }}</p>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 truncate">{{ replyingMessage.content || '[' + replyingMessage.type + ']' }}</p>
          </div>
          <button @click="replyingMessage = null" class="text-zinc-400 hover:text-zinc-600">
            <Icon name="ph:x-bold" class="w-4 h-4" />
          </button>
        </div>

        <!-- Preview de ficheiro seleccionado -->
        <div v-if="pendingFile" class="mb-2 flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <Icon :name="pendingFile.type === 'image' ? 'ph:image-bold' : pendingFile.type === 'audio' ? 'ph:music-note-bold' : 'ph:file-bold'" class="w-4 h-4 text-zinc-500" />
          <span class="text-xs text-zinc-600 dark:text-zinc-400 flex-1 truncate">{{ pendingFile.name }}</span>
          <input v-model="pendingCaption" type="text" placeholder="Legenda (opcional)..."
            class="flex-1 text-xs bg-transparent border-none outline-none text-zinc-700 dark:text-zinc-300 placeholder-zinc-400" />
          <button @click="clearPending" class="text-zinc-400 hover:text-red-500 transition-colors">
            <Icon name="ph:x-bold" class="w-4 h-4" />
          </button>
        </div>

        <!-- Barra de gravação -->
        <div v-if="isRecording" class="mb-2 flex items-center gap-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span class="text-sm text-red-600 dark:text-red-400 font-medium">A gravar... {{ recordingTime }}s</span>
          <button @click="stopRecording" class="ml-auto px-4 py-1.5 bg-red-500 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-red-600 transition-colors">
            Parar e Enviar
          </button>
          <button @click="cancelRecording" class="text-zinc-500 hover:text-zinc-700 text-xs font-medium">Cancelar</button>
        </div>

        <div class="flex gap-2 items-end">
          <!-- Upload ficheiro -->
          <input type="file" ref="fileInput" accept="image/*,audio/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx" hidden @change="onFileSelected" />

          <button @click="fileInput?.click()"
            :disabled="!contactPhone || isRecording"
            class="w-10 h-10 shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-[#FF009D] hover:border-[#FF009D]/50 flex items-center justify-center transition-colors disabled:opacity-30">
            <Icon name="ph:paperclip-bold" class="w-5 h-5" />
          </button>

          <!-- Gravar áudio -->
          <button @mousedown.prevent="startRecording" @mouseup.prevent="stopRecording"
            :disabled="!contactPhone || isRecording || !!pendingFile"
            class="w-10 h-10 shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-emerald-500 hover:border-emerald-500/50 flex items-center justify-center transition-colors disabled:opacity-30">
            <Icon name="ph:microphone-bold" class="w-5 h-5" />
          </button>

          <!-- Texto -->
          <textarea
            v-model="newMessage"
            rows="1"
            :disabled="!contactPhone || isRecording || !!pendingFile"
            placeholder="Digite uma mensagem..."
            class="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#FF009D] resize-none max-h-32"
            @keyup.enter.exact.prevent="send"
            @input="autoResize"
          ></textarea>

          <!-- Enviar -->
          <button @click="send"
            :disabled="!contactPhone || sending || (!newMessage.trim() && !pendingFile)"
            class="w-10 h-10 shrink-0 rounded-xl bg-[#FF009D] text-white flex items-center justify-center shadow-lg shadow-[#FF009D]/20 hover:bg-[#D90085] transition-all disabled:opacity-40">
            <Icon v-if="sending" name="ph:spinner-gap-bold" class="w-5 h-5 animate-spin" />
            <Icon v-else name="ph:paper-plane-right-bold" class="w-5 h-5" />
          </button>
        </div>
      </div>
    </template>

    <!-- Empty State -->
    <div v-else class="flex-1 flex flex-col items-center justify-center text-center text-zinc-500 gap-4 p-8">
      <div class="w-20 h-20 bg-[#FF009D]/5 rounded-2xl flex items-center justify-center">
        <Icon name="ph:chats-bold" class="w-10 h-10 text-[#FF009D]/30" />
      </div>
      <div>
        <h3 class="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Nenhuma Conversa Seleccionada</h3>
        <p class="text-sm text-zinc-500">Seleccione um contacto ou clique no ícone de chat para iniciar.</p>
      </div>
    </div>

    <!-- Lightbox imagem -->
    <div v-if="lightboxSrc" @click="lightboxSrc = null"
      class="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center cursor-zoom-out p-4">
      <img :src="lightboxSrc" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, defineComponent, h, resolveComponent } from 'vue'
import type { Message } from '~/stores/messages'

// Sub-component inline para ícone de status
const StatusIcon = defineComponent({
  props: { status: String },
  setup(props) {
    return () => {
      if (props.status === 'sending') return h(resolveComponent('Icon'), { name: 'ph:clock-bold', class: 'w-3 h-3 opacity-60' })
      if (props.status === 'error') return h(resolveComponent('Icon'), { name: 'ph:warning-bold', class: 'w-3 h-3' })
      if (props.status === 'read') return h(resolveComponent('Icon'), { name: 'ph:checks-bold', class: 'w-3.5 h-3.5' })
      return h(resolveComponent('Icon'), { name: 'ph:check-bold', class: 'w-3.5 h-3.5' })
    }
  }
})

const props = defineProps<{
  contact: any | null
  messages: Message[]
  sending?: boolean
}>()

const emit = defineEmits<{
  (e: 'send', content: string): void
  (e: 'send-media', opts: { type: 'image' | 'audio' | 'video' | 'document', base64: string, filename: string, mimeType: string, caption?: string }): void
  (e: 'delete-message', msgId: string): void
  (e: 'back'): void
}>()

const newMessage = ref('')
const msgsContainer = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const lightboxSrc = ref<string | null>(null)

// Ficheiro pendente (antes de enviar)
const pendingFile = ref<{ name: string, base64: string, mimeType: string, type: 'image' | 'audio' | 'video' | 'document' } | null>(null)
const pendingCaption = ref('')

// Gravação áudio
const isRecording = ref(false)
const recordingTime = ref(0)
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let recordingTimer: any = null
let recordingStream: MediaStream | null = null

const contactPhone = computed(() => {
  if (!props.contact) return null
  return props.contact.phone_number || props.contact.phone || props.contact.whatsapp || null
})

const formattedPhone = computed(() => {
  if (!contactPhone.value) return null
  const d = contactPhone.value.replace(/\D/g, '')
  if (d.length === 9) return `+258 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`
  if (d.startsWith('258') && d.length === 12) return `+${d.slice(0,3)} ${d.slice(3,5)} ${d.slice(5,8)} ${d.slice(8)}`
  return contactPhone.value
})

const hasEvolution = ref(false)
onMounted(async () => {
  const { getCredentials } = useEvolution()
  const creds = await getCredentials()
  hasEvolution.value = !!creds
})

// Scroll para o fim quando chegam mensagens
watch(() => props.messages.length, async () => {
  await nextTick()
  if (msgsContainer.value) {
    msgsContainer.value.scrollTop = msgsContainer.value.scrollHeight
  }
}, { immediate: true })

// Auto-resize textarea
const autoResize = (e: Event) => {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

const getInitials = (name: string) => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].substring(0, 2).toUpperCase()
}

const formatTime = (ts: string) => {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (ts: string) => {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Hoje'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

const groupedMessages = computed(() => {
  if (!props.messages) return []
  const result: (Message & { isNewDay?: boolean })[] = []
  let lastDay = ''

  props.messages.forEach((msg) => {
    const day = new Date(msg.timestamp).toDateString()
    const enrichedMsg = { ...msg, isNewDay: day !== lastDay }
    result.push(enrichedMsg)
    lastDay = day
  })

  return result
})

// Fonte de media: usa o PROXY para contornar CORS e AUTH
const mediaSource = (msg: Message) => {
  if (msg.mediaBase64) {
    const mime = msg.mimeType || (msg.type === 'image' ? 'image/jpeg' : msg.type === 'audio' ? 'audio/ogg' : 'application/octet-stream')
    return `data:${mime};base64,${msg.mediaBase64}`
  }
  
  if (msg.mediaUrl) {
    const apiKey = localStorage.getItem('evolution_api_key') || ''
    return `/api/media?url=${encodeURIComponent(msg.mediaUrl)}&key=${apiKey}`
  }
  
  return ''
}

const replyingMessage = ref<Message | null>(null)

const onReply = (msg: Message) => {
  replyingMessage.value = msg
}

const onDelete = async (msg: Message) => {
  if (confirm('Deseja apagar esta mensagem para todos?')) {
     emit('delete-message', msg.id)
  }
}

// Enviar mensagem
const send = async () => {
  if (props.sending) return

  if (pendingFile.value) {
    emit('send-media', {
      type: pendingFile.value.type,
      base64: pendingFile.value.base64,
      filename: pendingFile.value.name,
      mimeType: pendingFile.value.mimeType,
      caption: pendingCaption.value.trim() || undefined
    })
    clearPending()
    return
  }

  if (!newMessage.value.trim()) return
  emit('send', newMessage.value.trim())
  newMessage.value = ''
  await nextTick()
  const ta = msgsContainer.value?.closest('.flex-col')?.querySelector('textarea') as HTMLTextAreaElement | null
  if (ta) ta.style.height = 'auto'
}

const clearPending = () => {
  pendingFile.value = null
  pendingCaption.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

// Selecção de ficheiro
const onFileSelected = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const base64 = reader.result as string
    let type: 'image' | 'audio' | 'video' | 'document' = 'document'
    if (file.type.startsWith('image/')) type = 'image'
    else if (file.type.startsWith('audio/')) type = 'audio'
    else if (file.type.startsWith('video/')) type = 'video'

    pendingFile.value = { name: file.name, base64, mimeType: file.type, type }
  }
  reader.readAsDataURL(file)
}

// Gravação de áudio
const startRecording = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert('Gravação de áudio não suportada neste browser.')
    return
  }
  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioChunks = []
    recordingTime.value = 0
    mediaRecorder = new MediaRecorder(recordingStream, { mimeType: 'audio/webm' })
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data) }
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' })
      const reader = new FileReader()
      reader.onload = () => {
        emit('send-media', {
          type: 'audio',
          base64: (reader.result as string).split(',')[1],
          filename: `audio_${Date.now()}.webm`,
          mimeType: 'audio/webm'
        })
      }
      reader.readAsDataURL(blob)
      recordingStream?.getTracks().forEach(t => t.stop())
    }
    mediaRecorder.start()
    isRecording.value = true
    recordingTimer = setInterval(() => { recordingTime.value++ }, 1000)
  } catch (err) {
    console.error('Erro ao aceder ao microfone:', err)
    alert('Não foi possível aceder ao microfone.')
  }
}

const stopRecording = () => {
  clearInterval(recordingTimer)
  isRecording.value = false
  mediaRecorder?.stop()
}

const cancelRecording = () => {
  clearInterval(recordingTimer)
  isRecording.value = false
  recordingTime.value = 0
  mediaRecorder?.stop()
  recordingStream?.getTracks().forEach(t => t.stop())
  audioChunks = []
}
</script>
