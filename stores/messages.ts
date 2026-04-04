import { defineStore } from 'pinia'

export interface Message {
  id: number
  contact_id: number
  content: string
  status: 'sent' | 'delivered' | 'read'
  timestamp: string
  is_outgoing: boolean
}

export const useMessageStore = defineStore('messages', {
  state: () => ({
    messages: [] as Message[],
    loading: false
  }),
  getters: {
    getMessagesByContact: (state) => (contactId: number) => {
      return state.messages.filter(m => m.contact_id === contactId)
    }
  },
  actions: {
    sendMessage(contactId: number, content: string) {
      const newMsg: Message = {
        id: Date.now(),
        contact_id: contactId,
        content,
        status: 'sent',
        timestamp: new Date().toISOString(),
        is_outgoing: true
      }
      this.messages.push(newMsg)
      
      // Simular atualização de status
      setTimeout(() => {
        const msg = this.messages.find(m => m.id === newMsg.id)
        if(msg) msg.status = 'delivered'
      }, 1500)
      
      setTimeout(() => {
        const msg = this.messages.find(m => m.id === newMsg.id)
        if(msg) msg.status = 'read'
      }, 3000)
    }
  }
})
