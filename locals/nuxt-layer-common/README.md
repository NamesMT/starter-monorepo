# `@local/nuxt-layer-common`

A [Nuxt 4 layer](https://nuxt.com/docs/4.x/guide/going-further/layers) holding everything the
monorepo's Nuxt frontends share: module setup, design system (UnoCSS + shadcn-vue UI kit),
layouts, global components, plugins, composables, utils and the `/api/*` dev proxy.

It is **not** a standalone app. Consumers extend it and add their own pages/assets/config:

```ts
// apps/<app>/nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@local/nuxt-layer-common'],
})
```

See [`apps/frontend`](../../apps/frontend) (full app) and
[`apps/frontend-second`](../../apps/frontend-second) (minimal sample) for usage.

## What lives here

| Area | Contents |
| --- | --- |
| `nuxt.config.ts` | Modules, `experimental`, dev-server TLS, Vite, MDC, SEO, i18n base, image, svgo, eslint, telemetry |
| `app/components` | Shell (`GlobalProvider`, `LoadingScreen`, `IsSST`), MDC/prose, `LiquidGlassDiv`, default `OgImage/Frame.takumi.vue` |
| `app/lib/shadcn` | The shared shadcn-vue UI kit |
| `app/composables` | `useLocalState`, `useHHMMSSFormat` |
| `app/layouts` | `default` and `basic` layouts |
| `app/plugins` | `init`, `rpcApi`, `auth`, `initConvex`, `li18n`, `vueQuery`, `lenis` |
| `app/utils` | Generic helpers (`cn`, clipboard, `hcParse`, auth URLs, dayjs, convex errors, input placeholders) |
| `app/assets/css` | Default styling (main.scss, palette, shadcn vars, scrollbar, MDC) |
| `server/api` | `/api/*` proxy to `runtimeConfig.public.backendUrl` |
| `uno.config.ts` | The shared UnoCSS design system |
| `components.json` | shadcn CLI config, aliased back into `app/lib/shadcn` |

## What apps override

Nuxt merges the layer with the **app winning** for scalars/objects; array options (`css`, `modules`,
`plugins`, ...) concatenate (layer first, app last), and same-named files/routes (`app.vue`, layouts,
pages, components, `server/api` handlers) resolve app-first.

Style-related contents are defaults an app overrides:

* **CSS** — the layer adds `app/assets/css/main.scss` to `css`; an app adds its own
  `css: ['~/assets/css/main.scss']` and wins by load order.
* **OG image** — the layer ships `OgImage/Frame.takumi.vue`; an app replaces it with the same name.

```ts
export default defineNuxtConfig({
  extends: ['@local/nuxt-layer-common'],
  devServer: { port: 3300 }, // layer sets host/TLS only
  i18n: { translationDir: '../../locals/locales/dist/frontend' },
})
```

`@unocss/nuxt` only loads the app's own config file, so each app re-exports the design system:

```ts
// apps/<app>/uno.config.ts
import commonUnoConfig from '@local/nuxt-layer-common/uno.config'
import { mergeConfigs } from 'unocss'

export default mergeConfigs([commonUnoConfig, { /* app overrides */ }])
```

## Authoring notes

* Path options in `nuxt.config.ts` must be absolute — a layer's config aliases resolve against the app.
* Apps reference layer files as `#layers/nuxt-layer-common/app/...` (alias → this package root).
* Add shadcn-vue components from **this** package (`pnpm run shad-add <component>`);
  `components.json` aliases `#layers/nuxt-layer-common/...` because `@` points at the consumer's `app/`.
