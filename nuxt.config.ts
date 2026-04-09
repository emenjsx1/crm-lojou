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
  // ui colors configured via tailwind.config.ts
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  },
  devServer: {
    port: 3000,
    host: '0.0.0.0'
  },
  routeRules: {
    '/proxy-lojou/**': { proxy: 'https://api.lojou.app/**' }
  },
  compatibilityDate: '2026-04-02'
})