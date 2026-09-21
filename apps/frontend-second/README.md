# frontend-second

A deliberately **minimal sample app** that consumes the shared Nuxt base layer
[`@local/nuxt-layer-common`](../../locals/nuxt-layer-common/README.md).

Use it as the reference for how a new frontend in this monorepo should be set up: the app only
declares what differs from the base, and inherits everything else.

## What it inherits from the layer

* Nuxt modules & config (UnoCSS, shadcn-vue, MDC, SEO, i18n, image, VueUse, TanStack Query, convex, ...)
* `app.vue` shell, `default`/`basic` layouts, global providers (`GlobalProvider`, `LoadingScreen`, ...)
* Plugins (`init`, `rpcApi`, `auth`, `initConvex`, `li18n`, `vueQuery`, `lenis`)
* Composables (`useLocalState`, `useHHMMSSFormat`) and utils (`cn`, `hcParse`, `getRandomThoughtPlaceholder`, ...)
* The shadcn-vue UI kit (`Button`, `Card`, `Input`, `Switch`, ...) — all auto-imported
* The `/api/*` dev proxy to the backend

## What this app adds/overrides

| File | Purpose |
| --- | --- |
| `nuxt.config.ts` | `extends: ['@local/nuxt-layer-common']`, env loading, dev port `3301`, site/runtime config, i18n translation dir |
| `app/assets/css/**` | This app's styling identity (palette, shadcn vars, scrollbar, MDC, main.scss) — loaded after the layer's defaults, so it wins |
| `app/components/OgImage/Frame.takumi.vue` | This app's OG-image frame (overrides the layer's default) |
| `app/pages/index.vue` | Uses layer auto-imports (UI kit, composables, utils, i18n) |
| `app/pages/showcase.vue` | Imports a layer component via `#layers/nuxt-layer-common/app/...` |
| `app/components/SecondHero.vue` | An app-local component |
| `uno.config.ts` | Re-exports the layer's shared UnoCSS design system |
| `public/favicon.svg` | App-local static asset |

## Develop

From the repository root:

```bash
pnpm run dev            # all apps (frontend-second boots on 127.0.0.1:3301)
# or just this app:
pnpm -F=frontend-second run dev
```

The dev server uses the shared HTTPS `localcert` from `@local/common/dev`, so open
<https://127.0.0.1:3301>.
