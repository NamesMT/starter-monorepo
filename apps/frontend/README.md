# frontend

**frontend** is the main consumer-facing website for the project, powered by [Nuxt 4](https://nuxt.com/).

It extends [`@local/nuxt-layer-common`](../../locals/nuxt-layer-common/README.md), which provides the
modules, design system (UnoCSS + shadcn-vue), layouts, plugins, composables, utils and the `/api/*`
dev proxy. This app keeps only what is specific to it, e.g.:

* `app/components/Logo.vue`, `app/components/layouts/default/**` — brand shell
* `app/layouts/default.vue` — overrides the layer's generic default layout
* `app/assets/css/**`, `app/components/OgImage/Frame.takumi.vue`, `uno.config.ts` — styling identity
  (loaded after the layer's defaults, so it wins)
* `nuxt.config.ts` — env loading, site/runtime config, dev port, i18n translation dir

## Features

Most features are inherited from the layer; the highlights it enables here:

* Type-safe integration with [`backend`](../backend/README.md) via `hono/client`, with the layer's `rpcApi` plugin (Nuxt context, local dev proxy, cors, AWS Lambda OAC)
* [VueUse](https://vueuse.org/) + [VueUse Motion](https://motion.vueuse.org/)
* Tanstack Query, configured client-side with IndexedDB persistence
* [Shadcn/vue](https://www.shadcn-vue.com/) UI kit — shared from the layer; add components with `pnpm -F=@local/nuxt-layer-common shad-add <component>`
* [UnoCSS](https://unocss.dev/guide/) — the layer provides tokens/rules; this app owns the palette ([`palette.css`](./app/assets/css/palette.css)) and can extend [`uno.config.ts`](./uno.config.ts)
* [Nuxt Color Mode](https://github.com/nuxt-modules/color-mode), [Nuxt Image](https://image.nuxt.com/), [Nuxt MDC](https://github.com/nuxt-modules/mdc), [Nuxt SVGO](https://github.com/cpsoinos/nuxt-svgo), [nuxt-i18n-micro](https://s00d.github.io/nuxt-i18n-micro/) (with [`@local/locales`](../../locals/locales/README.md) as the shared localization source), [Nuxt SEO](https://nuxtseo.com/), [Nuxt LLMs](https://github.com/nuxtlabs/nuxt-llms)
* ESLint via [@nuxt/eslint](https://eslint.nuxt.com/packages/module) + [@antfu/eslint-config](https://github.com/antfu/eslint-config)

Check the [Nuxt documentation](https://nuxt.com/) to learn more.

## Development Server

Please refer to monorepo root [README](../../README.md).

## Notes

The `deploy` script does not depend on `build` (look [HERE](./turbo.json)), so, the `deploy` script should include the build command when you setup CI.
