# frontend

**frontend** is the consumer-facing website for the project, powered by [Nuxt 4](https://nuxt.com/)

## Features:

* Type-safe integration with [`backend`](../backend/README.md) via `hono/client`, with `rpcApi` plugin to support Nuxt context and local dev proxy, cors, AWS Lambda OAC
* ESLint
  * [@nuxt/eslint](https://eslint.nuxt.com/packages/module)
  * [@antfu/eslint-config](https://github.com/antfu/eslint-config)
* [UnoCSS](https://unocss.dev/guide/)
  * UnoCSS is an atomic CSS engine, similar to Tailwind but is super fast and have some amazing features like automatically imported icons in pure CSS.
* [VueUse](https://vueuse.org/)
  * + [VueUse Motion](https://motion.vueuse.org/)
* Tanstack Query
  * Default is configured for client-side fetching usage, data is persisted to IndexedDB.
* [Shadcn/vue](https://www.shadcn-vue.com/) - Components-first UI library
  * Configured for UnoCSS with [hyoban/unocss-preset-shadcn](https://github.com/hyoban/unocss-preset-shadcn).
  * To add components, use `pnpm shad-add <component>`
* [ColorMode](https://github.com/nuxt-modules/color-mode)
  * Dark and Light mode with auto detection made easy with Nuxt.
* [NuxtImage](https://image.nuxt.com/)
  * Automatic optimized images for the app, as well as placeholder support.
* [Nuxt MDC](https://github.com/nuxt-modules/mdc)
  * @credit [sunshj](https://github.com/sunshj/mdc) for the prose preset
* [NuxtSVGO](https://github.com/cpsoinos/nuxt-svgo)
  * Support for loading SVGs and optimizing them.
* [Nuxt Booster](https://basics.github.io/nuxt-booster/)
  * Lighthouse score optimizations
* [NuxtI18n](https://i18n.nuxtjs.org/)
  * Internationalization (i18n) module for Nuxt.js + SEO headers.
  * With [`@local/locales`](../../locals/locales/README.md) as shared localization source.
* [Nuxt SEO](https://nuxtseo.com/)
  * All the boring SEO work for Nuxt done.
* [Nuxt LLMs](https://github.com/nuxtlabs/nuxt-llms)

Check the [Nuxt documentation](https://nuxt.com/) to learn more.

## Development Server

Please refer to monorepo root [README](../../README.md)

## Production

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Notes

The `deploy` script does not depends on `build` (look [HERE](./turbo.json)), so, the `deploy` script should includes the build command for CI.
