# Workflows

## Commands

- Install: `pnpm install`; `postinstall` runs `nuxt prepare` (apps + layer) and `@local/locales`' CSV→JSON generation.
- Root tasks go through Turbo: `lint`, `test:types`, `quickcheck`, `build`, `deploy`.
- `pnpm run quickcheck` = per-package `lint && test:types`; `pnpm run lint` / `pnpm run test:types` run one half.
- `pnpm run dev` = `dev:prepare` then `dev`; `pnpm run dev:noConvex` adds `--filter=!backend-convex`.
- Env loading: root `dev`/`build`/`deploy` wrap Turbo in `dotenvx run`; `backend`/`backend-convex` scripts layer `.env.<mode>.local` → `.env.<mode>` → `.env` through `dotenvx`; each frontend's `nuxt.config.ts` loads `.env.<mode>.local` → `.env.<mode>` with `dotenv` (never the root `.env`), plus `.env.workerd.dev*` when `TARGET=workerdLocal`.
- `pnpm run devSST` runs `sst dev` with `.env.sst` + `.env` for the frontend dev server.
- `pnpm run i18n` = `pnpm dlx lingo.dev run`, using the root `i18n.json` CSV buckets.
- `pnpm run release:check <package> [version]` validates a release target locally.
- Backend tests: `pnpm -F=backend test` (watch) / `pnpm -F=backend check` (lint + types + coverage) / `pnpm -F=backend-convex check`.
- Backend tests hit the real app with `app.request()` and stub `WORKOS_*`/`FRONTEND_URL` before importing `#src/app.js`.
- `apps/frontend` extras: `build:workerdLocal` (sets `TARGET=workerdLocal`) and `preview`; `deploy` runs the build itself.
- Turbo outputs cached for `build`: `.nuxt/**`, `.output/**`, `dist/**`; `globalDependencies` are `**/.env` and `**/.env.*`.
- After changing a dependency, restart the dev server — Vite/HMR does not pick up new deps.

## Task graph (turbo.json)

- `build` depends on `^build`; `deploy` depends on `build` + `quickcheck` and is not cached; `dev`/`dev:prepare` are persistent/uncached.
- `apps/frontend/turbo.json` (extends `//`): `deploy` additionally waits on `backend#deploy` and `backend-convex#deploy` so SSG runs against deployed backends, and `quickcheck` depends on `^quickcheck`.
- `frontend#deploy` therefore pulls in both backend deploys; `frontend-second#deploy` does not.

## CI pipelines (`.github/workflows/`)

- `quickcheck.yml` — `workflow_dispatch` + `workflow_call`; checks out, caches `.turbo`, pnpm/Node 24, `pnpm install --frozen-lockfile`, `pnpm run quickcheck`.
- `frontend-to-gh-pages.yml` — `workflow_dispatch` (the `push` block is commented out); calls `quickcheck.yml`, builds `--filter=frontend`, uploads `./apps/frontend/dist` as the Pages artifact, then deploys via `actions/deploy-pages`.
- `release.yml` — `workflow_dispatch` with inputs `package` (required), `version`, `publish` (default true) and `dry-run` (default false); it is the only release path.
- Release steps: checkout with `fetch-depth: 0`, pnpm/Node 24, `npm install -g npm@latest`, `pnpm install --frozen-lockfile`, `release-target.mjs`, `pnpm run quickcheck`, then `npx -y repo-release@latest`.
- Release sets a git identity and refuses a dry run without an explicit version; dry run stops before committing, pushing, releasing and publishing.
- Release args: `--pkg=<package>`, `-r <version>` when given, `--bump` only without a version, then `--release --push` and `--publish` only when not private.
- `scripts/release-target.mjs` matches the workspace name, rejects a version that is not `x.y.z[-prerelease]` or not greater than the on-disk version, and emits `path=` / `publish=false` for `"private"` packages.
- Every workflow pins Node 24 and `pnpm install --frozen-lockfile`; pnpm itself comes from `packageManager` (`pnpm@12.3.4`).
