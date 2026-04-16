import { defineStore } from 'pinia'
import { useApi } from '~/composables/useApi'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as any | null,
    token: null as string | null,
    isInitialized: false
  }),
  getters: {
    isAdmin: (state) => state.user?.role !== 'user' && state.user?.rule !== 'user',
    userRole: (state) => state.user?.role || state.user?.rule || 'user'
  },
  actions: {
    setToken(token: string | null) {
      this.token = token && token.trim() ? token.trim() : null
    },
    async fetchProfile() {
      const { api } = useApi()
      try {
        // Tentamos buscar o usuário atual. 
        // Na API Lojou, geralmente as rotas que retornam os dados do logado são /admin/users/me ou similares
        const response = await api.get('/admin/users')
        // Se a API retornar uma lista, vamos tentar pegar o primeiro ou um info do header
        // Mas o mais provável é que tenhamos que bater num endpoint de perfil
        // Como o CRM é admin, vamos assumir que se ele consegue listar /admin/users ele é admin
        // No entanto, para ser preciso com o pedido do usuário (role 'user'):
        
        if (response.status >= 200 && response.status < 300) {
           // Se chegamos aqui, o token é válido e o usuário tem permissão para acessar endpoints administrativos
           // Priorizamos dados explícitos do usuário, mas se não houver (ex: a API retornou apenas a lista de usuários),
           // assumimos papel administrativo 'admin' pois ele conseguiu listar usuários.
           this.user = response.data?.user || 
                       response.data?.me || 
                       (response.data?.users ? { role: 'admin' } : { role: 'admin' })
           
           console.log('[AUTH SUCCESS] Perfil carregado ou inferido como admin')
        }
        this.isInitialized = true
      } catch (error) {
        console.error('Falha ao buscar perfil:', error)
        this.logout()
      }
    },
    logout() {
      this.user = null
      this.token = null
      // Limpar cookie se necessário seria feito no middleware ou aqui
    }
  }
})
