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

See [`apps/frontend`](../../apps/frontend) (full app, overrides the shell) and
[`apps/frontend-second`](../../apps/frontend-second) (minimal sample) for usage.

## What lives here

| Area | Contents |
| --- | --- |
| `nuxt.config.ts` | Nuxt modules, `experimental`, dev-server TLS, Vite options, MDC, SEO, i18n base, image, svgo, eslint, telemetry |
| `app/components` | Global shell (`GlobalProvider`, `LoadingScreen`, `IsSST`), MDC/prose renderers, `LiquidGlassDiv`, a default OG-image frame (`OgImage/Frame.takumi.vue`, apps override it) |
| `app/lib/shadcn` | The shared shadcn-vue UI kit |
| `app/composables` | `useLocalState`, `useHHMMSSFormat` |
| `app/layouts` | `default` and `basic` layouts |
| `app/plugins` | `init`, `rpcApi`, `auth`, `initConvex`, `li18n`, `vueQuery`, `lenis` |
| `app/utils` | Generic helpers (`cn`, clipboard, `hcParse`, auth URLs, dayjs, convex errors, input placeholders) |
| `server/api` | `/api/*` proxy to `runtimeConfig.public.backendUrl` |
| `uno.config.ts` | The shared UnoCSS design system |
| `app/assets/css` | **Default** styling (main.scss, palette, shadcn vars, scrollbar, MDC) — apps override by declaring their own `css` |
| `components.json` | shadcn-vue CLI config; aliases point back into `app/lib/shadcn` via `#layers/nuxt-layer-common/...` |

## Defaults vs. app identity

Anything style-related here is a **default that an app overrides**:

* **CSS** — the layer adds its `app/assets/css/main.scss` to `css`; an app adds its own
  `css: ['~/assets/css/main.scss']`. Nuxt appends app CSS *after* layer CSS, so the app's
  palette/shadcn/scrollbar/MDC values win while the layer keeps each app working out of the box.
* **OG image** — the layer ships `app/components/OgImage/Frame.takumi.vue`; an app replaces it with
  its own file of the same name (component names resolve app-first).
* **shadcn components** — add them from this package with `pnpm run shad-add <component>`. The
  generated imports use `#layers/nuxt-layer-common/app/lib/shadcn/...`, which resolves in this
  package *and* in every consuming app's generated `tsconfig` (a plain `@/lib/shadcn/...` would
  only resolve here, since `@` points at the consumer's `app/`).

## How consumers customise it

Nuxt merges a layer into the app with the **app always winning** for scalars/objects, while
array options (`css`, `modules`, `plugins`, ...) are concatenated (layer first, app last).
Project files always win over layer files of the same name/route (`app.vue`, layouts, pages,
components, `server/api` handlers).

```ts
// The app's own config overrides defaults and can add to arrays.
export default defineNuxtConfig({
  extends: ['@local/nuxt-layer-common'],
  devServer: { port: 3300 }, // layer sets host/TLS only
  i18n: { translationDir: '../../locals/locales/dist/frontend' },
  site: { url: '...', name: '...' },
})
```

UnoCSS config is loaded by `@unocss/nuxt` from the **app's** cwd only, so each app re-exports
(and may extend) the shared design system:

```ts
import commonUnoConfig from '@local/nuxt-layer-common/uno.config'
// apps/<app>/uno.config.ts
import { mergeConfigs } from 'unocss'

export default mergeConfigs([commonUnoConfig, { /* app overrides */ }])
```

## Authoring notes

* Files inside the layer import each other with **relative paths** (not `~/`, `@/`): global
  aliases inside layer source are rewritten per-layer by Nuxt, but the generated TypeScript
  paths are not, so relative imports keep both the bundler and `tsc` honest.
* Path-valued options in `nuxt.config.ts` must be resolved to **absolute paths** here, because
  a layer's `nuxt.config` aliases resolve against the consuming app.
* Apps reference layer files through the named layer alias
  `#layers/nuxt-layer-common/app/...` (the alias points at this package root).
* Add shadcn-vue components from **this** package: `pnpm run shad-add <component>`. The CLI writes
  into `app/lib/shadcn` using the `#layers/nuxt-layer-common/...` aliases from
  [`components.json`](./components.json), which resolve in the layer *and* in the consuming apps.

## Type checking

A layer is not a Nuxt app, so it generates no types on its own: without help, `defineNuxtConfig`,
auto-imports, component types and `#imports` are all undefined (the editor would flag the whole
folder). Nuxt fixes this by preparing the layer like an app, so the layer **is** its own Nuxt root:

* `npm`/`pnpm` lifecycle: `postinstall` → `nuxt prepare` (types land in `.nuxt/`, gitignored).
* `pnpm run dev:prepare` → `nuxt prepare`; `pnpm run test:types` → `nuxt typecheck`.
* [`tsconfig.json`](./tsconfig.json) follows the Nuxt 4 [split config](https://nuxt.com/docs/4.x/getting-started/upgrade#typescript-configuration-splitting)
  format (`references` to `.nuxt/tsconfig.{app,server,node}.json` + `files: []`), same as `apps/frontend`.

The consuming apps also type-check the layer's files as part of their own `nuxt typecheck`, so
`pnpm run quickcheck` at the root covers the layer twice (standalone + through each app).

