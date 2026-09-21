import type { LocaleMeta } from '@local/locales/src/index'
import type { Locale } from 'nuxt-i18n-micro'
import type { BundledLanguage } from 'shiki/bundle/full'
import { localcertKeyPath, localcertPath } from '@local/common/dev/cert'
import { defaultLocaleCode, locales } from '@local/locales/src/index'
import { resolve } from 'pathe'
import { bundledLanguagesInfo } from 'shiki/bundle/full'
import optimizeExclude from 'vite-plugin-optimize-exclude'

// A layer's config aliases resolve against the consuming app, so path options below are absolute.
const currentDir = resolve(import.meta.dirname)

function genFrontendLocale({ code, languageISO, name }: LocaleMeta): Locale {
  return {
    code,
    iso: languageISO,
    dir: 'ltr',
    displayName: name,
  }
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Exposes this layer as `#layers/nuxt-layer-common` (points at the package root).
  $meta: {
    name: 'nuxt-layer-common',
  },

  future: {
    compatibilityVersion: 4,
  },

  devtools: { enabled: true },

  experimental: {
    viewTransition: true,
    watcher: 'parcel',
    typescriptPlugin: true,
    componentIslands: true,
  },

  devServer: {
    https: {
      cert: localcertPath,
      key: localcertKeyPath,
    },
    // If you have performance issue in dev, use `127.0.0.1` in your browser instead of `localhost` - Ref: https://github.com/nuxt/cli/issues/136
    host: '127.0.0.1',
  },

  runtimeConfig: {
    // The private keys which are only available server-side
    isSst: false,
    // Keys within public are also exposed client-side
    public: {
      frontendUrl: '',
      backendUrl: '',
      convexUrl: '',
      convexApiUrl: '',
    },
  },

  app: {
    viewTransition: false,
    head: {
      link: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'mask-icon', href: '/favicon.svg', color: '#333' },
      ],
    },
  },

  imports: {
    dirs: [
      resolve(currentDir, 'app/composables/**'),
      resolve(currentDir, 'app/utils/**'),
    ],
  },

  components: [
    {
      path: resolve(currentDir, 'app/components'),
      pathPrefix: false,
    },
  ],

  vue: {
    propsDestructure: true,
  },

  vite: {
    plugins: [
      optimizeExclude() as any,
    ],
    optimizeDeps: {
      exclude: [
        'clsx',
        'embla-carousel-vue',
      ],
      include: [
        // `@vercel/oidc` (pulled in by `ai`) advertises an ESM `import` condition but
        // resolves to a CJS browser build, so it must be pre-bundled for interop.
        '@vercel/oidc',
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
    '@peterbud/nuxt-query',
    'nuxt-i18n-micro',
    '@nuxtjs/seo',
    '@unocss/nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/image',
    'nuxt-svgo',
    'nuxt-llms',
    // 'nuxt-booster',
    'shadcn-nuxt',
    'convex-nuxt',
    '@nuxtjs/mdc',
  ],

  nuxtQuery: {
    autoImports: true,
  },

  mdc: {
    highlight: {
      wrapperStyle: true,
      noApiRoute: true,
      langs: bundledLanguagesInfo.map(l => l.id) as BundledLanguage[],
    },
    keepComments: true,
  },

  convex: {
    manualInit: true,
  },

  i18n: {
    strategy: 'no_prefix',
    defaultLocale: defaultLocaleCode,
    locales: locales.map(genFrontendLocale),
    meta: true,
    // Shared `@local/locales` bucket by default; apps override it.
    translationDir: '../../locals/locales/dist/frontend',
  },

  image: {
    domains: ['img.youtube.com', 'i.vimeocdn.com'],
    alias: {
      youtube: 'https://img.youtube.com',
      vimeo: 'https://i.vimeocdn.com',
    },
  },

  linkChecker: {
    enabled: false,
  },

  // booster: {
  //   disableNuxtFontaine: true,
  // },

  shadcn: {
    prefix: '',
    componentDir: resolve(currentDir, 'app/lib/shadcn/components/ui'),
  },

  // Default styling; apps append their own `css` and override these values.
  css: [
    resolve(currentDir, 'app/assets/css/main.scss'),
  ],

  svgo: {
    autoImportPath: false,
    svgo: false,
    defaultImport: 'component',
  },

  // @nuxt/eslint
  eslint: {
    config: {
      // stylistic: true,
      standalone: false,
    },
  },

  telemetry: false,
  sourcemap: {
    server: false,
  },
  compatibilityDate: '2025-06-15',
})
