<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-purple-50/50 to-secondary/10">
    <div class="w-full max-w-md mx-4">
      <!-- Logo -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold">
          <span class="bg-gradient-to-r from-#FF009D to-#FF8AD2 text-white px-3 py-1 rounded-md">
            Lojou
          </span>
          <span class="ml-2 text-gray-900 dark:text-gray-100">Messaging</span>
        </h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          Sistema de comunicação via WhatsApp para vendedores
        </p>
      </div>

      <!-- Login Card -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-200 dark:border-gray-700">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 text-center">
          Entrar na sua conta
        </h2>

        <form @submit.prevent="handleLogin" class="space-y-6">
          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <NuxtIcon name="mdi-email" class="text-gray-400" />
              </div>
              <input
                id="email"
                v-model="form.email"
                type="email"
                required
                placeholder="seu@email.com"
                class="block w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                autocomplete="email"
              />
            </div>
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Senha
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <NuxtIcon name="mdi-lock" class="text-gray-400" />
              </div>
              <input
                id="password"
                v-model="form.password"
                type="password"
                required
                placeholder="••••••••"
                class="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                autocomplete="current-password"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <NuxtIcon :name="showPassword ? 'mdi-eye' : 'mdi-eye-off'" class="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
          </div>

          <!-- Remember Me -->
          <div class="flex items-center justify-between">
            <label class="flex items-center">
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-primary hover:text-primary focus:ring-primary"
              />
              <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">
                Lembrar-me
              </span>
            </label>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg bg-gradient-to-r from-#FF009D to-#FF8AD2 text-white hover:opacity-90 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <NuxtIcon v-if="loading" name="mdi-loading" class="animate-spin text-xl" />
            {{ loading ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/store/auth'
import { to } from 'await-to-js'

const form = reactive({
  email: '',
  password: ''
})

const loading = ref(false)
const showPassword = ref(false)

const authStore = useAuthStore()
const router = useRouter()

async function handleLogin() {
  loading.value = true

  const [error] = await to(authStore.login(form.email, form.password))
  if (error) {
    console.error('Login failed:', error)
  } else {
    await router.push('/dashboard')
  }

  loading.value = false
}

// Redirect if already logged in
if (authStore.isAuthenticated) {
  // We can't await outside an async function in Vue 3 <script setup> unless it's a top-level await 
  // but top-level await requires Suspense. For now using router.push directly without await or onMounted
  router.push('/dashboard')
}
</script>