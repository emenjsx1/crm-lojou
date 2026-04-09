<template>
  <div class="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950 min-w-0">
    <template v-if="contact">
      <!-- Header -->
      <div class="h-16 px-6 border-b dark:border-zinc-800 bg-white dark:bg-[#09090b] flex items-center justify-between shadow-sm z-10 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-[#FF009D]/10 flex items-center justify-center text-[#FF009D] font-bold text-sm uppercase shrink-0">
            {{ getInitials(contact.full_name || contact.firstname || contact.name || 'CN') }}
          </div>
          <div>
            <h3 class="font-semibold text-zinc-900 dark:text-white capitalize text-sm">
              {{ (contact.full_name || contact.firstname || contact.name || 'Sem nome').toLowerCase() }}
            </h3>
            <p class="text-xs text-zinc-500">{{ formattedPhone || contact.email || '—' }}</p>
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
      <div ref="msgsContainer" class="flex-1 overflow-y-auto p-4 space-y-2">
        <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center text-zinc-400 gap-3">
          <Icon name="ph:chat-teardrop-dots" class="w-12 h-12 opacity-20" />
          <p class="text-sm">Sem mensagens. Envie a primeira!</p>
        </div>

        <div v-for="msg in messages" :key="msg.id"
          class="flex" :class="msg.is_outgoing ? 'justify-end' : 'justify-start'">
          <div class="max-w-[72%] rounded-2xl shadow-sm overflow-hidden"
            :class="[
              msg.is_outgoing
                ? 'bg-[#FF009D] text-white rounded-br-none'
                : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-bl-none',
              msg.status === 'error' ? '!bg-red-500 text-white' : ''
            ]">

            <!-- Imagem -->
            <div v-if="msg.type === 'image'" class="flex flex-col">
              <img
                :src="mediaSource(msg)"
                class="w-full max-w-xs rounded-t-2xl object-cover cursor-pointer"
                :class="msg.is_outgoing ? 'rounded-br-none' : 'rounded-bl-none'"
                @click="openLightbox(mediaSource(msg))"
                loading="lazy"
              />
              <div v-if="msg.caption || msg.content !== '[Imagem]'" class="px-3 py-1.5 text-sm">
                {{ msg.caption || msg.content }}
              </div>
              <div class="px-3 pb-1.5 flex justify-end items-center gap-1 text-[10px] opacity-70">
                <span>{{ formatTime(msg.timestamp) }}</span>
                <StatusIcon v-if="msg.is_outgoing" :status="msg.status" />
              </div>
            </div>

            <!-- Áudio -->
            <div v-else-if="msg.type === 'audio'" class="px-3 py-2 flex flex-col gap-1 min-w-[200px]">
              <audio controls class="w-full h-8 rounded" preload="metadata">
                <source :src="mediaSource(msg)" :type="msg.mimeType || 'audio/ogg'" />
              </audio>
              <div class="flex justify-end items-center gap-1 text-[10px] opacity-70 mt-0.5">
                <span>{{ formatTime(msg.timestamp) }}</span>
                <StatusIcon v-if="msg.is_outgoing" :status="msg.status" />
              </div>
            </div>

            <!-- Vídeo -->
            <div v-else-if="msg.type === 'video'" class="flex flex-col">
              <video controls class="w-full max-w-xs rounded-t-2xl" :class="msg.is_outgoing ? 'rounded-br-none' : 'rounded-bl-none'">
                <source :src="mediaSource(msg)" :type="msg.mimeType || 'video/mp4'" />
              </video>
              <div v-if="msg.caption" class="px-3 py-1.5 text-sm">{{ msg.caption }}</div>
              <div class="px-3 pb-1.5 flex justify-end items-center gap-1 text-[10px] opacity-70">
                <span>{{ formatTime(msg.timestamp) }}</span>
                <StatusIcon v-if="msg.is_outgoing" :status="msg.status" />
              </div>
            </div>

            <!-- Documento -->
            <div v-else-if="msg.type === 'document'" class="px-4 py-3 flex items-center gap-3 min-w-[180px]">
              <Icon name="ph:file-bold" class="w-8 h-8 shrink-0 opacity-80" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ msg.content }}</p>
                <a v-if="msg.mediaUrl" :href="msg.mediaUrl" target="_blank"
                  class="text-[11px] underline opacity-80">Baixar</a>
              </div>
              <div class="flex flex-col items-end gap-0.5">
                <span class="text-[10px] opacity-70">{{ formatTime(msg.timestamp) }}</span>
                <StatusIcon v-if="msg.is_outgoing" :status="msg.status" />
              </div>
            </div>

            <!-- Texto -->
            <div v-else class="px-4 py-2.5">
              <p class="text-sm leading-relaxed whitespace-pre-wrap">{{ msg.content }}</p>
              <div class="flex justify-end items-center gap-1.5 mt-1 text-[10px] opacity-70">
                <span>{{ formatTime(msg.timestamp) }}</span>
                <StatusIcon v-if="msg.is_outgoing" :status="msg.status" />
              </div>
            </div>
          </div>
        </div>
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
          <button @click="stopRecording" class="ml-auto px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg">
            Parar e Enviar
          </button>
          <button @click="cancelRecording" class="text-zinc-400 hover:text-zinc-600 text-xs">Cancelar</button>
        </div>

        <div class="flex gap-2 items-end">
          <!-- Upload ficheiro -->
          <input type="file" ref="fileInput" accept="image/*,audio/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx" hidden @change="onFileSelected" />

          <button @click="fileInput?.click()"
            :disabled="!contactPhone"
            class="w-9 h-9 shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-[#FF009D] hover:border-[#FF009D]/50 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <Icon name="ph:paperclip-bold" class="w-5 h-5" />
          </button>

          <!-- Gravar áudio -->
          <button @click="startRecording"
            :disabled="!contactPhone || isRecording || !!pendingFile"
            class="w-9 h-9 shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-emerald-500 hover:border-emerald-500/50 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <Icon name="ph:microphone-bold" class="w-5 h-5" />
          </button>

          <!-- Texto -->
          <textarea
            v-model="newMessage"
            rows="1"
            :disabled="!contactPhone || isRecording || !!pendingFile"
            placeholder="Digite uma mensagem para o WhatsApp..."
            class="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#FF009D] resize-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style="max-height: 120px; overflow-y: auto"
            @keyup.enter.exact.prevent="send"
            @keydown.enter.shift.exact="newMessage += '\n'"
            @input="autoResize"
          ></textarea>

          <!-- Enviar -->
          <button @click="send"
            :disabled="!contactPhone || sending || (!newMessage.trim() && !pendingFile)"
            class="w-10 h-10 shrink-0 rounded-xl bg-[#FF009D] text-white flex items-center justify-center shadow-md shadow-[#FF009D]/30 hover:bg-[#D90085] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
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

const hasEvolution = computed(() => {
  if (typeof window === 'undefined') return false
  return !!(localStorage.getItem('evolution_url') && localStorage.getItem('evolution_api_key'))
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

// Fonte de media: base64 tem prioridade sobre URL
const mediaSource = (msg: Message) => {
  if (msg.mediaBase64) {
    const mime = msg.mimeType || (msg.type === 'image' ? 'image/jpeg' : msg.type === 'audio' ? 'audio/ogg' : 'application/octet-stream')
    return `data:${mime};base64,${msg.mediaBase64}`
  }
  return msg.mediaUrl || ''
}

const openLightbox = (src: string) => {
  if (src) lightboxSrc.value = src
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
