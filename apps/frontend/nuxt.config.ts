import type { LocaleObject } from '@nuxtjs/i18n'
import { localcertKeyPath, localcertPath } from '@local/common/dev/cert'
import { config } from 'dotenv'
import optimizeExclude from 'vite-plugin-optimize-exclude'

if (import.meta.env.NODE_ENV === 'development') {
  config({ path: ['.env.dev.local', '.env.dev'] })
}
else {
  config({ path: ['.env.prod.local', '.env.prod'] })
}

const siteConfig = {
  url: import.meta.env.NUXT_PUBLIC_FRONTEND_URL,
  backend: import.meta.env.NUXT_PUBLIC_BACKEND_URL,
  name: 'starter-monorepo',
  description: 'Monorepo with 🤖 AI initialize and localize | 🔥Hono + OpenAPI & RPC, Nuxt, Convex, SST Ion, Kinde Auth, Tanstack Query, Shadcn, UnoCSS, Spreadsheet I18n, Lingo.dev',
}

interface GenFrontendLocaleProps {
  code: string
  languageISO: string
  name?: string
  dir?: LocaleObject<string>['dir']
}
function genFrontendLocale({ code, languageISO, name, dir }: GenFrontendLocaleProps): LocaleObject<string> {
  return {
    code,
    language: languageISO,
    files: [`${code}.json`, `frontend/${code}.json`],
    name,
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
    viewTransition: true,
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
    viewTransition: false,
    head: {
      link: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg' },
        { rel: 'mask-icon', href: '/favicon.svg', type: 'image/svg+xml' },
      ],
    },
  },

  // TODO: investigate why this is not working, prob Nuxt 4 alpha bug.
  // imports: {
  //   dirs: [
  //     '~/composables/**',
  //     '~/utils/**',
  //   ],
  // },

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
      include: [
        'secure-json-parse',
        'debug',
        'shiki',
        'remark-emoji',
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
  ],

  site: siteConfig,

  i18n: {
    baseUrl: siteConfig.url,
    vueI18n: 'i18n.config.ts',
    strategy: 'no_prefix',
    defaultLocale: 'en',
    locales: [
      genFrontendLocale({
        code: 'en',
        languageISO: 'en-US',
        name: 'English',
      }),
      genFrontendLocale({
        code: 'es',
        languageISO: 'es-ES',
        name: 'Español',
      }),
      genFrontendLocale({
        code: 'fr',
        languageISO: 'fr-FR',
        name: 'Français',
      }),
      genFrontendLocale({
        code: 'ru',
        languageISO: 'ru-RU',
        name: 'Русский',
      }),
      genFrontendLocale({
        code: 'vi',
        languageISO: 'vi-VN',
        name: 'Tiếng Việt',
      }),
      genFrontendLocale({
        code: 'zh-CN',
        languageISO: 'zh-CN',
        name: '中文',
      }),
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

  css: [
    '~/assets/css/main.scss',
  ],

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
  compatibilityDate: '2025-06-15',
})
