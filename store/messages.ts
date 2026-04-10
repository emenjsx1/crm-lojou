import { defineStore } from 'pinia'

export interface Message {
  id: string | number
  conversation_id: string | number
  contact_id: string | number
  direction: 'inbound' | 'outbound'
  content: string
  media_url?: string
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  created_at: string
}

export interface Conversation {
  id: string | number
  contact_id: string | number
  last_message?: Message
  unread_count: number
  status: 'active' | 'closed'
  updated_at: string
  created_at: string
}

export const useMessagesStore = defineStore('_legacy_messages', {
  state: () => ({
    conversations: [] as Conversation[],
    messages: [] as Message[],
    activeConversation: null as Conversation | null,
    activeMessages: [] as Message[],
    loading: false,
    newMessageCount: 0
  }),

  getters: {
    getConversationMessages: (state) => {
      return (conversationId: string | number) =>
        state.messages
          .filter(m => m.conversation_id === conversationId)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    },

    getUnreadCount: (state) => {
      return state.conversations.reduce((sum, c) => sum + c.unread_count, 0)
    },

    getActiveContactName: (state: any, getters: any) => {
      return (contactStore: any) => {
        if (!state.activeConversation) return ''
        const contact = contactStore.getContactById(state.activeConversation.contact_id)
        return contact?.name || 'Desconhecido'
      }
    }
  },

  actions: {
    async fetchConversations(apiUrl: string, token: string) {
      this.loading = true
      try {
        const response: any = await $fetch('/api/conversations', {
          headers: {
            Authorization: `Bearer ${token}`
          },
          baseURL: apiUrl
        })
        this.conversations = response.data
      } catch (error) {
        console.error('Error fetching conversations:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchMessages(apiUrl: string, token: string, conversationId: string | number) {
      this.loading = true
      try {
        const response: any = await $fetch(`/api/messages?conversation_id=${conversationId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          baseURL: apiUrl
        })
        this.activeMessages = response.data
      } catch (error) {
        console.error('Error fetching messages:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    setActiveConversation(conversation: Conversation | null) {
      this.activeConversation = conversation
      if (conversation) {
        this.activeMessages = (this as any).getConversationMessages(conversation.id)
        // Mark as read
        (this as any).markConversationAsRead(conversation.id)
      } else {
        this.activeMessages = []
      }
    },

    addMessage(message: Message) {
      this.messages.push(message)

      if (this.activeConversation && message.conversation_id === this.activeConversation.id) {
        this.activeMessages.push(message)
      }

      // Update conversation's last message and unread count
      const conversation = this.conversations.find(c => c.id === message.conversation_id)
      if (conversation) {
        conversation.last_message = message
        if (message.direction === 'inbound') {
          conversation.unread_count += 1
        }
        conversation.updated_at = message.timestamp
        ;(this as any).sortConversations()
      }
    },

    updateMessageStatus(messageId: string | number, status: Message['status']) {
      const message = this.messages.find(m => m.id === messageId)
      if (message) {
        message.status = status
      }

      const activeMessage = this.activeMessages.find(m => m.id === messageId)
      if (activeMessage) {
        activeMessage.status = status
      }
    },

    markConversationAsRead(conversationId: string | number) {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (conversation) {
        conversation.unread_count = 0
      }
    },

    sortConversations() {
      this.conversations.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
    },

    incrementNewMessageCount() {
      this.newMessageCount += 1
    },

    resetNewMessageCount() {
      this.newMessageCount = 0
    }
  }
})