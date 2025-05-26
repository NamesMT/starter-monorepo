# frontend

**frontend** is the consumer-facing website for the project, powered by [Nuxt🔥](https://nuxt.com/) (`compatibilityVersion: 4`)

## Features:
- Type-safe integration with [`backend`](../backend/README.md) via `hono/client`, with `rpcApi` plugin to support Nuxt context and local dev proxy, cors, AWS Lambda OAC
- ESLint
  - [@nuxt/eslint](https://eslint.nuxt.com/packages/module)
  - [@antfu/eslint-config](https://github.com/antfu/eslint-config)
- [UnoCSS](https://unocss.dev/guide/)
  - UnoCSS is an atomic CSS engine, similar to Tailwind but is super fast and have some amazing features like automatically imported icons in pure CSS.
- Tanstack Query
  - Default is configured for client-side fetching usage, data is persisted to IndexedDB.
- PrimeVue - UI library
- [Shadcn/vue](https://www.shadcn-vue.com/) - Components-based UI library
  - > [Why two UI libraries?](./two-ui-libraries-explanation.md)
  - Configured for UnoCSS with [hyoban/unocss-preset-shadcn](https://github.com/hyoban/unocss-preset-shadcn).
  - Share the primary color and can work in parallel with PrimeVue.
  - To add a component, cd into the `frontend` dir and run `pnpm dlx shadcn-vue@latest add <component>`
- [ColorMode](https://github.com/nuxt-modules/color-mode)
  - Dark and Light mode with auto detection made easy with Nuxt.
- [NuxtImage](https://image.nuxt.com/)
  - Automatic optimized images for the app, as well as placeholder support.
- [NuxtI18n](https://i18n.nuxtjs.org/)
  - Internationalization (i18n) module for Nuxt.js + SEO headers.
  - With [`@local/locales`](../../locals/locales/README.md) as shared localization source.
- [Nuxt SEO](https://nuxtseo.com/)
  - All the boring SEO work for Nuxt done.
- [Nuxt LLMs](https://github.com/nuxtlabs/nuxt-llms)

Look at the [Nuxt 3 documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup
## Development Server
Please refer to monorepo root [README](../../README.md)

## Production
Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
