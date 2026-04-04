import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: true },
  typescript: {
    shim: false,
    typeCheck: false
  },
  modules: [
    '@nuxt/ui',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss'
  ],
  css: [
    '@/assets/css/main.css',
    '@/assets/css/design-system.css'
  ],
  colorMode: {
    preference: 'light',
    fallback: 'light',
    classSuffix: ''
  },
  ui: {
    primary: '#FF009D',
    gray: '#09090b'
  },
  compatibilityDate: '2026-04-02'
})