<template>
  <div class="flex h-[calc(100vh-8rem)] bg-white dark:bg-[#09090b] rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
    <ContactList :contacts="contacts" :active-contact-id="activeContact?.id" @select="activeContact = $event" />
    <ChatWindow :contact="activeContact" :messages="activeMessages" @send="onSend" />
  </div>
</template>

<script setup lang="ts">
import type { Contact } from '~/stores/contacts'

const contactsStore = useContactStore()
const messagesStore = useMessageStore()

onMounted(() => {
  contactsStore.fetchContacts()
})

const contacts = computed(() => contactsStore.contacts)
const activeContact = ref<Contact | null>(null)

const activeMessages = computed(() => {
  if (!activeContact.value) return []
  return messagesStore.getMessagesByContact(activeContact.value.id)
})

const onSend = (content: string) => {
  if (!activeContact.value) return
  messagesStore.sendMessage(activeContact.value.id, content)
}
</script>