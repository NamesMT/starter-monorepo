# Architecture

## Workspace map

- pnpm workspace members: `apps/*` (runnable apps) and `locals/*` (shared, never-published, all `"private": true`).
- `apps/frontend` — main Nuxt 4 app, SSG via `nuxt generate`; dev `127.0.0.1:3300`.
- `apps/frontend-second` — minimal sample Nuxt app proving the layer is reusable; dev `127.0.0.1:3301`.
- `apps/backend` — main Hono API (auth, i18n, providers, OpenAPI/RPC); dev `127.0.0.1:3400`.
- `apps/backend-convex` — optional Convex backend for AI chat; only `dev`/`dev:prepare`, deploy stays disabled as `_deploy`.
  - `convex/crons.ts` wipes **all** threads and messages daily at 00:00 UTC (cost control for the demo) — remove those crons before real use.
  - Attachment bytes live in Convex file storage; nothing calls `storage.delete`, so removing a message does not free its blobs.
- `locals/common` — framework-agnostic shared code: `src/chat.ts`, `src/types/user.ts`, `src/utils/*`, `dev/` local TLS certs.
- `locals/common-vue` — Vue-only shared components (`GridMaker.vue`) plus its own `uno.config.ts`.
- `locals/locales` — i18n source of truth: CSVs under `src/sheets/` compile to JSON under `dist/`.
- `locals/tsconfig` — `base.tsconfig.json` and `vue.tsconfig.json` extended across the workspace.
- `locals/nuxt-layer-common` — the Nuxt layer both frontends extend (modules, shadcn kit, plugins, proxy).
- `scripts/release-target.mjs` — resolves a release package and validates its requested version.
- Deployment surfaces: `sst.config.ts` (backend Lambda), `wrangler.jsonc` (fullstack Workers), `.github/workflows/frontend-to-gh-pages.yml` (static frontend).

## Layering rules

- Code used by more than one app goes in `locals/*`, never duplicated inside an app.
- `locals/*` is imported by source path (`@local/common/src/...`) because the packages declare no `exports`/`main`.
- Apps must provide every dependency that `@local/common` sources import; it declares only `dayjs`/`pathe` itself, so consumers supply the rest.
- Backend `#src/providers` = 3rd-party connectors grouped by purpose (`auth/`, `baas/`, `db/`, `storage/`, `telegram/`).
- Backend `#src/services` = orchestration over providers — reserved by convention, `src/services/` does not exist yet.
- Backend `#src/helpers` = globally reusable code (`arktype`, `error`, `factory`, `i18n`).
- Backend locally reusable code sits beside its consumer as `*.helper.ts`.
- Frontend app-specific code stays in the app, shared setup in the layer; read the layer README before touching either.

## Backend composition

- `src/app.ts` is the root app: `providersInit` → notFound → errorHandler → logger → trigger routes → CORS → cookie sessions → `keepAuthFresh` → `.route('/api', apiApp)`.
- `src/dev.ts` serves the app on `srvx` with TLS from `@local/common/dev/cert`; `src/aws.ts` adapts it to Lambda, using `streamHandle` when `STREAMING_ENABLED` and not `SST_LIVE`.
- `api/` mirrors the URL path; app entries (`app.ts`, `$.ts`) only `.use` middlewares and `.route` routes.
- `$$.ts` is the index route for its folder (`src/api/$$.ts`); `$.routes.ts` holds several routes in one file.
- App entries are named `<Name>App`; route definitions are named `<Name>Route`.
- Providers initialize once per process on sharing platforms and per request on `workerd` (`nonSharingPlatforms`); the Convex init is allowed to fail.
- Validation uses `customArktypeValidator` + `describeRoute`; errors are normalized by `errorHandler` for `HTTPException` and `DetailedError`.
- `setupOpenAPI` serves `/openapi/spec.json` and the Scalar UI at `/openapi/ui`.

## Frontend composition

- Both frontends `extends: ['@local/nuxt-layer-common']`; the layer owns modules, the shadcn-vue kit, layouts, plugins, composables, utils and the `/api/*` dev proxy.
- Layer merge: the app wins scalars/objects, arrays (`css`, `modules`) concatenate layer-first, and same-named files resolve app-first.
- Each app re-exports the layer UnoCSS config (`@local/nuxt-layer-common/uno.config`) because `@unocss/nuxt` only loads the app's own file.
- Add shadcn components only from the layer: `pnpm -F=@local/nuxt-layer-common shad-add <name>`.
- `rpcApi` plugin (`hc<typeof app>`) calls `/api/*` through the layer proxy when frontend and backend share a hostname (`enableProxy: 'auto'`), otherwise the backend URL directly; it adds `x-amz-content-sha256` for Lambda + OAC via `app/utils/aws-oac.ts`.
- `enableProxy` lives in the layer's `app/app.config.ts`; the proxy handler is `locals/nuxt-layer-common/server/utils/proxyToBackend.ts`, mounted by both `server/api/[...].ts` (everything under `/api`) and `server/api/index.ts` (bare `/api`, which a catch-all does not match).
- `nuxt generate` writes `.output/public` and symlinks `apps/<app>/dist` to it; CI uploads `dist`.

## Locales data flow

- Edit CSVs in `locals/locales/src/sheets/**`; `entry.ts` regenerates `dist/` on `postinstall` and in `dev`.
- Buckets: `dist/<locale>.json` (global), `dist/frontend/*`, `dist/backend/*`; the global bucket is folded into the frontend one.
- Backend inlines `dist/{locale}.json` + `dist/backend/{locale}.json` through literal dynamic imports in `#src/helpers/i18n.ts`.
- Frontends read `translationDir` = `locals/locales/dist/frontend` (set by the layer, overridable per app).
- `nuxtSiteConfig.name` and `nuxtSiteConfig.description` keys are required for titles/meta; locale metadata lives in `locals/locales/src/index.ts`.
