import { localcertKeyPath, localcertPath } from '@local/common/dev/cert'
import { config } from 'dotenv'
import { env } from 'std-env'
import optimizeExclude from 'vite-plugin-optimize-exclude'
import { Names } from './app/primevue.config'

const siteConfig = {
  url: import.meta.env.NUXT_PUBLIC_FRONTEND_URL,
  name: 'starter-monorepo',
  description: '🔥Hono RPC, Nuxt, SST Ion, Kinde Auth, Tanstack Query, Shadcn, Primevue, UnoCSS',
}

if (env.NODE_ENV === 'development')
  config({ path: ['.env.local', '.env.local.ignored'], override: true })

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },

  devtools: { enabled: true },

  experimental: {
    watcher: 'parcel',
    componentIslands: true,
  },

  devServer: {
    https: {
      cert: localcertPath,
      key: localcertKeyPath,
    },
    // If you have performance issue in dev, use `127.0.0.1` in your browser instead of `localhost` - Ref: https://github.com/nuxt/cli/issues/136
    host: '127.0.0.1',
    port: 3300,
  },

  runtimeConfig: {
    // The private keys which are only available server-side
    isSst: false,
    // Keys within public are also exposed client-side
    public: {
      frontendUrl: import.meta.env.NUXT_PUBLIC_FRONTEND_URL,
      backendUrl: import.meta.env.NUXT_PUBLIC_BACKEND_URL,
    },
  },

  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],

  vue: {
    propsDestructure: true,
  },

  vite: {
    plugins: [
      optimizeExclude(),
    ],
    optimizeDeps: {
      exclude: [
        'clsx',
        'embla-carousel-vue',
      ],
    },
  },

  modules: [
    '@nuxt/eslint',
    '@vueuse/nuxt',
    '@namesmt/vue-query-nuxt',
    '@nuxtjs/i18n',
    '@nuxtjs/seo',
    '@unocss/nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/image',
    '@primevue/nuxt-module',
    'shadcn-nuxt',
    'nuxt-llms',
  ],

  site: siteConfig,

  i18n: {
    baseUrl: import.meta.env.NUXT_PUBLIC_FRONTEND_URL,
    vueI18n: 'i18n.config.ts',
    strategy: 'no_prefix',
    defaultLocale: 'en',
    locales: [
      {
        code: 'en',
        language: 'en-US',
      },
      {
        code: 'vi',
        language: 'vi-VN',
      },
    ],
  },

  shadcn: {
    prefix: 'Shad',
    componentDir: './app/lib/shadcn/components/ui',
  },

  css: [
    '~/assets/css/main.scss',
  ],

  // nuxt-primevue
  primevue: {
    components: {
      exclude: ['Editor', 'Chart', 'Form', 'FormField'], // Workaround until https://github.com/primefaces/primevue/pull/7436
    },
    options: {
      ripple: true,
      theme: {
        preset: Names,
        options: {
          darkModeSelector: '.dark',
        },
      },
      ptOptions: { mergeProps: true },
    },
  },

  features: {
    // For UnoCSS
    inlineStyles: false,
  },

  // @nuxtjs/color-mode
  // Removing classSuffix to match UnoCSS default selectors
  colorMode: {
    classSuffix: '',
  },

  // @nuxt/eslint
  eslint: {
    config: {
      // stylistic: true,
      standalone: false,
    },
  },

  llms: {
    domain: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
  },

  telemetry: false,
  sourcemap: {
    server: false,
  },
  ignore: [
    '**\/*.stories.{js,cts,mts,ts,jsx,tsx}',
    '**\/*.{spec,test}.{js,cts,mts,ts,jsx,tsx}',
    '**\/*.d.{cts,mts,ts}',
    '**\/.{pnpm-store,vercel,netlify,output,git,cache,data}',
    '.nuxt/analyze',
    '.nuxt',
    '**\/-*.*',
    'dist',
  ],
})
