import { useMessageStore } from '~/stores/messages'

export const useMessages = () => {
  const store = useMessageStore()
  
  const sendMessage = async (contactId: number, content: string) => {
    store.sendMessage(contactId, content)
  }

  return {
    sendMessage,
    messages: computed(() => store.messages),
    loading: computed(() => store.loading)
  }
}