# frontend-second

**frontend-second** is a minimal sample app, powered by [Nuxt 4](https://nuxt.com/), and serves as the reference for adding a new frontend.

It extends [`@local/nuxt-layer-common`](../../locals/nuxt-layer-common/README.md), which provides the
modules, design system (UnoCSS + shadcn-vue), layouts, plugins, composables, utils and the `/api/*`
dev proxy. This app keeps only what is specific to it, e.g.:

* `app/pages/**` — `/` and `/showcase`
* `app/components/SecondHero.vue` — an app-local component
* `app/assets/css/**`, `app/components/OgImage/Frame.takumi.vue`, `uno.config.ts` — styling identity
  (loaded after the layer's defaults, so it wins)
* `nuxt.config.ts` — env loading, site/runtime config, dev port, i18n translation dir

## Features

Most features are inherited from the layer; the highlights it enables here:

* `app/pages/showcase.vue` — the layer's `LiquidGlassDiv` over a high-frequency backdrop, plus Sonner toasts (the layer's `sonner` kit)
* The layer's shadcn-vue UI kit (`Button`, `Card`, `Input`, `Switch`, ...), all auto-imported
* Layer auto-imports for composables/utils (`useLocalState`, `useHHMMSSFormat`, `cn`, `getRandomThoughtPlaceholder`) and i18n

Check the [Nuxt documentation](https://nuxt.com/) to learn more.

## Development Server

Please refer to monorepo root [README](../../README.md).

## Notes

Boots on `127.0.0.1:3301` and reuses `frontend`'s translation bucket (`locals/locales/dist/frontend`).
