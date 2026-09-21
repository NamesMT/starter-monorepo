import { getConvexEnvs } from 'backend-convex/dev'
import { config } from 'dotenv'

import.meta.env.TARGET ??= import.meta.env.NODE_ENV

if (import.meta.env.TARGET === 'workerdLocal') {
  config({ path: ['.env.workerd.dev.local', '.env.workerd.dev'] })
  import.meta.env.NUXT_PUBLIC_CONVEX_URL ||= (await getConvexEnvs()).CONVEX_URL || ''
}
else if (import.meta.env.TARGET === 'development') {
  config({ path: ['.env.dev.local', '.env.dev'] })
  import.meta.env.NUXT_PUBLIC_CONVEX_URL ||= (await getConvexEnvs()).CONVEX_URL || ''
}
else {
  config({ path: ['.env.prod.local', '.env.prod'] })
}

const siteConfig = {
  url: import.meta.env.NUXT_PUBLIC_FRONTEND_URL,
  backend: import.meta.env.NUXT_PUBLIC_BACKEND_URL,
  convex: import.meta.env.NUXT_PUBLIC_CONVEX_URL,
  // Fallback metadata: the i18n setup also defines translatable `nuxtSiteConfig.name` /
  // `nuxtSiteConfig.description` keys (`@local/locales`), which take precedence.
  name: 'starter-monorepo',
  description: 'Monorepo with 🤖 AI initialize and localize | 🔥Hono + OpenAPI & RPC, Nuxt, Convex, SST Ion, WorkOS AuthKit, Tanstack Query, Shadcn, UnoCSS, Spreadsheet I18n, Lingo.dev',
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ['@local/nuxt-layer-common'],

  devServer: {
    port: 3300,
  },

  runtimeConfig: {
    // Keys within public are also exposed client-side
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
    // `frontend/` already contains the shared (global) bucket merged in, see `@local/locales/entry.ts`.
    translationDir: '../../locals/locales/dist/frontend',
  },

  llms: {
    domain: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
  },
})
