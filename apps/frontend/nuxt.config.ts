import type { LocaleObject } from '@nuxtjs/i18n'
import { localcertKeyPath, localcertPath } from '@local/common/dev/cert'
import { config } from 'dotenv'
import optimizeExclude from 'vite-plugin-optimize-exclude'
import { Names } from './app/primevue.config'

if (import.meta.env.NODE_ENV === 'development')
  config({ path: ['.env.local.ignored', '.env.local'] })
else
  config({ path: ['.env.prod.ignored', '.env.prod'] })

const siteConfig = {
  url: import.meta.env.NUXT_PUBLIC_FRONTEND_URL,
  backend: import.meta.env.NUXT_PUBLIC_BACKEND_URL,
  name: 'starter-monorepo',
  description: '🔥Hono RPC, Nuxt, SST Ion, Kinde Auth, Tanstack Query, Shadcn, Primevue, UnoCSS',
}

function genFrontendLocale(code: string, languageISO: string, dir?: LocaleObject<string>['dir']): LocaleObject<string> {
  return {
    code,
    language: languageISO,
    files: [`${code}.json`, `frontend/${code}.json`],
    dir,
  }
}

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
      frontendUrl: siteConfig.url,
      backendUrl: siteConfig.backend,
    },
  },

  app: {
    head: {
      link: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'mask-icon', href: '/favicon.svg', type: 'image/svg+xml' },
      ],
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
    '@vueuse/motion/nuxt',
    '@namesmt/vue-query-nuxt',
    '@nuxtjs/i18n',
    '@nuxtjs/seo',
    '@unocss/nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/image',
    'nuxt-svgo',
    'nuxt-llms',
    // 'nuxt-booster',
    '@primevue/nuxt-module',
    'shadcn-nuxt',
  ],

  site: siteConfig,

  i18n: {
    baseUrl: siteConfig.url,
    vueI18n: 'i18n.config.ts',
    strategy: 'no_prefix',
    defaultLocale: 'en',
    locales: [
      genFrontendLocale('en', 'en-US'),
      genFrontendLocale('es', 'es-ES'),
      genFrontendLocale('fr', 'fr-FR'),
      genFrontendLocale('ru', 'ru-RU'),
      genFrontendLocale('vi', 'vi-VN'),
      genFrontendLocale('zh-CN', 'zh-CN'),
    ],
    bundle: {
      optimizeTranslationDirective: false,
    },
    langDir: '../../../locals/locales/dist',
  },

  image: {
    domains: ['img.youtube.com', 'i.vimeocdn.com'],
    alias: {
      youtube: 'https://img.youtube.com',
      vimeo: 'https://i.vimeocdn.com',
    },
  },

  // booster: {
  //   disableNuxtFontaine: true,
  // },

  shadcn: {
    prefix: 'Shad',
    componentDir: './app/lib/components/ui',
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

  svgo: {
    autoImportPath: false,
    svgo: false,
    defaultImport: 'component',
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
})
