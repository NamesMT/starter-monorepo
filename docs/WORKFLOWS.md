# Workflows

## Commands

- Install: `pnpm install`; `postinstall` runs `nuxt prepare` (apps + layer) and `@local/locales`' CSV→JSON generation.
- `lint` and the layer's tests read generated files (`apps/frontend/.nuxt/eslint.config.mjs`, the layer's `.nuxt/tsconfig.*.json`), so run `pnpm install`/`nuxt prepare` first — deleting `.nuxt` breaks `lint` until it is regenerated.
- Root tasks go through Turbo: `lint`, `test`, `test:types`, `quickcheck`, `check`, `build`, `deploy`.
- `pnpm run quickcheck` = per-package `lint && test:types` (fast; no tests). `pnpm run check` adds each package's tests — the gate CI, `deploy` and `release` use. `pnpm run lint` / `pnpm run test:types` / `pnpm run test` run one piece each.
- `pnpm run dev` = `dev:prepare` then `dev`; `pnpm run dev:noConvex` adds `--filter=!backend-convex`.
- Env loading: root `dev`/`build`/`deploy` wrap Turbo in `dotenvx run`; `backend`/`backend-convex` scripts layer `.env.<mode>.local` → `.env.<mode>` → `.env` through `dotenvx`; each frontend's `nuxt.config.ts` loads `.env.<mode>.local` → `.env.<mode>` with `dotenv` (never the root `.env`), plus `.env.workerd.dev*` when `TARGET=workerdLocal`.
- `pnpm run devSST` runs `sst dev` with `.env.sst` + `.env` for the frontend dev server.
- `pnpm run i18n` = `pnpm dlx lingo.dev run`, using the root `i18n.json` CSV buckets.
- `pnpm run release:check <package> [version]` validates a release target locally.
- Backend tests: `pnpm test` (Turbo, workspace) / `pnpm -F=backend test` (runs once) / `pnpm -F=backend test:watch` (watch) / `pnpm -F=backend check` (lint + types + coverage) / `pnpm -F=backend-convex check`.
- Backend tests hit the real app with `app.request()` and stub `WORKOS_*`/`FRONTEND_URL` before importing `#src/app.js`.
- `@local/common`, `@local/nuxt-layer-common`, `@local/common-vue`, `apps/frontend` and the backends all have vitest (`test`/`test:watch`); the layer's `test/` dir is outside `app/`, so Nuxt never auto-imports test files as utils. `@local/common-vue` and `apps/frontend` add `happy-dom` and `@vitejs/plugin-vue` so SFCs compile.
- Frontend unit tests can't reach Nuxt's auto-imports or `useRuntimeConfig`, so they cover plain helpers and composables; `apps/frontend` therefore keeps its request building in pure functions (e.g. `buildChatStreamForm`) rather than inside the fetch call.
- Frontend E2E is Playwright, outside `quickcheck` because it needs a browser and a server: `pnpm -F=frontend test:e2e` reuses a running dev server or starts one, and loads the root `.env` for `NODE_TLS_REJECT_UNAUTHORIZED` (without it the dev proxy's outbound TLS call fails and every `/api` request 500s).
- `apps/frontend` extras: `build:workerdLocal` (sets `TARGET=workerdLocal`) and `preview`; `deploy` runs the build itself.
- Turbo outputs cached for `build`: `.nuxt/**`, `.output/**`, `dist/**`; `globalDependencies` are `**/.env` and `**/.env.*`.
- After changing a dependency, restart the dev server — Vite/HMR does not pick up new deps.

## Task graph (turbo.json)

- `build` depends on `^build`; `deploy` depends on `build` + `check` and is not cached; `dev`/`dev:prepare` are persistent/uncached, and neither is marked `interactive` so `pnpm run dev` also works without a TTY (background job, container, CI).
- `test` and `lint` are cacheable. Each package's `check` is self-contained (`lint && test:types && test`), so `check` needs no `dependsOn` — adding one ran every suite twice. A package with no tests has no `check`; turbo simply skips it, so a fork can add tests anywhere without touching Turborepo.
- `apps/frontend/turbo.json` (extends `//`): `deploy` additionally waits on `backend#deploy` and `backend-convex#deploy` so SSG runs against deployed backends, and `quickcheck`/`check` depend on their `^` counterpart so a dependency's `tsc` runs first.
- `frontend#deploy` therefore pulls in both backend deploys; `frontend-second#deploy` does not.

## CI pipelines (`.github/workflows/`)

- `quickcheck.yml` (the file keeps its name, but runs `pnpm run check`) — `workflow_dispatch` + `workflow_call`; checks out, caches `.turbo`, pnpm/Node 24, `pnpm install --frozen-lockfile`, `pnpm run check`.
- `frontend-to-gh-pages.yml` — `workflow_dispatch` (the `push` block is commented out); calls `quickcheck.yml`, builds `--filter=frontend`, uploads `./apps/frontend/dist` as the Pages artifact, then deploys via `actions/deploy-pages`.
- `release.yml` — `workflow_dispatch` with inputs `package` (required), `version`, `publish` (default true) and `dry-run` (default false); it is the only release path.
- Release steps: checkout with `fetch-depth: 0`, pnpm/Node 24, `npm install -g npm@latest`, `pnpm install --frozen-lockfile`, `release-target.mjs`, `pnpm run check`, then `npx -y repo-release@latest`.
- Release sets a git identity and refuses a dry run without an explicit version; dry run stops before committing, pushing, releasing and publishing.
- Release args: `--pkg=<package>`, `-r <version>` when given, `--bump` only without a version, then `--release --push` and `--publish` only when not private.
- `scripts/release-target.mjs` matches the workspace name, rejects a version that is not `x.y.z[-prerelease]` or not greater than the on-disk version, and emits `path=` / `publish=false` for `"private"` packages.
- Every workflow pins Node 24 and `pnpm install --frozen-lockfile`; pnpm itself comes from `packageManager` (`pnpm@12.3.4`).
