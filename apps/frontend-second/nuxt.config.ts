import { config } from 'dotenv'

import.meta.env.TARGET ??= import.meta.env.NODE_ENV

if (import.meta.env.TARGET === 'development') {
  config({ path: ['.env.dev.local', '.env.dev'] })
}
else {
  config({ path: ['.env.prod.local', '.env.prod'] })
}

const siteConfig = {
  url: import.meta.env.NUXT_PUBLIC_FRONTEND_URL,
  backend: import.meta.env.NUXT_PUBLIC_BACKEND_URL,
  convex: import.meta.env.NUXT_PUBLIC_CONVEX_URL || '',
  name: 'starter-monorepo / second',
  description: 'A second Nuxt app consuming the shared `@local/nuxt-layer-common` base layer.',
}

export default defineNuxtConfig({
  extends: ['@local/nuxt-layer-common'],

  devServer: {
    port: 3301,
  },

  runtimeConfig: {
    public: {
      frontendUrl: siteConfig.url,
      backendUrl: siteConfig.backend,
      convexUrl: siteConfig.convex,
      convexApiUrl: siteConfig.convex.replace('.convex.cloud', '.convex.site'),
    },
  },

  imports: {
    dirs: [
      '~/composables/**',
      '~/utils/**',
    ],
  },

  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],

  css: [
    '~/assets/css/main.scss',
  ],

  convex: {
    url: siteConfig.convex,
  },

  site: siteConfig,

  i18n: {
    metaBaseUrl: siteConfig.url,
    translationDir: '../../locals/locales/dist/frontend',
  },

  llms: {
    domain: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
  },
})
