import { useAuthStore } from '~/stores/auth'
import { navigateTo, useCookie } from '#imports'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Evitar recursão se necessário ou proteger apenas rotas específicas se fosse o caso
  // Mas como o usuário quer "ativar regras", faremos global
  
  const authStore = useAuthStore()
  
  // Função auxiliar para pegar cookie no lado do servidor ou cliente
  const getSessionCookie = () => {
    if (process.server) {
      const cookie = useCookie('session_1')
      return cookie.value
    } else {
      const value = `; ${document.cookie}`
      const parts = value.split(`; session_1=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift()
      return null
    }
  }

  const token = getSessionCookie()

  // 1. Regra de Token: Se não houver token, redireciona para o login centralizado
  if (!token) {
    const loginUrl = 'https://login.lojou.app?return=crm.admin.lojou.app'
    return navigateTo(loginUrl, { external: true })
  }

  // Sincronizar token com a store se necessário
  if (authStore.token !== token) {
    authStore.setToken(token)
  }

  // 2. Regra de Role: Buscar perfil se ainda não tiver os dados do usuário
  if (!authStore.user) {
    try {
      await authStore.fetchProfile()
    } catch (e) {
      // Se der erro ao buscar perfil, provavelmente o token é inválido
      const loginUrl = 'https://login.lojou.app?return=crm.admin.lojou.app'
      return navigateTo(loginUrl, { external: true })
    }
  }

  // 3. Regra de Role 'user': Redirecionar para o painel web (área do cliente)
  if (authStore.userRole === 'user') {
    return navigateTo('https://web.lojou.app', { external: true })
  }

  // Se passou por tudo, permite o acesso
})
