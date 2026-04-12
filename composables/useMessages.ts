import { computed } from 'vue'
import { useMessageStore } from '~/stores/messages'

export const useMessages = () => {
  const store = useMessageStore()
  
  const sendMessage = async (contactId: number | string, content: string) => {
    // No store atual, o envio optimista é feito via addOutgoing
    return store.addOutgoing(contactId, content, 'text')
  }

  return {
    sendMessage,
    messages: computed(() => store.messages),
    loading: computed(() => store.loading)
  }
}