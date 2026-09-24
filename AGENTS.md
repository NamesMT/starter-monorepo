# AGENTS.md

Orientation for agents working here. Deeper sources of truth: [`README.md`](./README.md),
[`INIT_PROMPT.md`](./INIT_PROMPT.md), [`apps/backend/README.md`](./apps/backend/README.md),
[`locals/nuxt-layer-common/README.md`](./locals/nuxt-layer-common/README.md).

## Fast start

```sh
pnpm install          # workspace install; @local/locales generates its JSON on postinstall
pnpm run dev          # every app's dev server through turbo
pnpm run dev:noConvex # same without Convex — the usual choice when not touching chat
pnpm run quickcheck   # lint + test:types across the workspace: run before saying "done"
```

Ports: `frontend` 3300 · `frontend-second` 3301 · `backend` 3400 · wrangler/workerd 3450 (all `127.0.0.1`).

## Layout

- `apps/*` — `frontend`, `frontend-second` (Nuxt 4, SSG via `nuxt generate`), `backend` (Hono), `backend-convex` (Convex); all `"private": true`.
- `locals/*` — shared, never-published code consumed as `"@local/<pkg>": "workspace:*"`: `common` (framework-agnostic fns/types/constants + `dev/` certs/env helpers), `common-vue`, `locales` (i18n source of truth: sheets → generated JSON), `tsconfig`, `nuxt-layer-common` (the base layer every frontend extends). Code used by more than one app goes here, not duplicated in an app.
- `scripts/*` — repo-level Node scripts; `release-target.mjs` backs the release workflow.
- `.github/workflows/*` — `quickcheck` (also `workflow_call`-reusable), `release`, `frontend-to-gh-pages`. None run on push; uncomment the `push` block where one exists.

## Tooling & shared code

- pnpm workspace + Turborepo; versions pinned through the **catalog** in `pnpm-workspace.yaml` (`"<pkg>": "catalog:"`). After changing a dependency, **restart the dev server** — Vite/HMR does not pick up new deps (`Cannot find package`, `504 Outdated Optimize Dep`).
- `@local/common` is imported by source path (`@local/common/src/...`) and must declare every package its sources import; a missing declaration only breaks once an app stops providing it.
- `@local/locales`: edit CSVs in `locals/locales/src/sheets/**`; JSON generates into `dist/` on `postinstall`/`dev`. Backend reads `dist/{locale}.json` + `dist/backend/*`; frontends read `dist/frontend` (global bucket merged in). `nuxtSiteConfig.name/description` keys are required for titles/meta; `pnpm run i18n` localizes via lingo.dev.

## Frontend (Nuxt)

- Both frontends `extends: ['@local/nuxt-layer-common']`: app-specific code stays in the app, shared setup in the layer. Read the layer README before touching the layer or shadcn kit.
- Add shadcn components with `pnpm -F=@local/nuxt-layer-common shad-add <name>`, never from an app.
- Per-app styling (`app/assets/css/*`, `app/components/OgImage/Frame.takumi.vue`) overrides layer defaults.

## Backend (Hono)

- `src/app.ts` is the root entry; `api/` mirrors the URL path (`/api/dummy/hello` → `src/api/dummy/hello.ts`).
- App entries (`app.ts`, `$.ts`) only `.use` middlewares and `.route` routes, never define routes, and are named `<Name>App`; route files are `<Name>Route`, multiple routes in one file go in `$.routes.ts`, and a folder-prefix index route uses `$$.ts` (e.g. `src/api/$$.ts`, not `api.ts`).
- `#src/providers` (3rd-party connectors, grouped by purpose), `#src/services` (orchestrating providers), `#src/helpers` (global helpers); locally reusable code sits next to its consumer as `*.helper.ts`.
- Validation via `customArktypeValidator` + `describeRoute` (OpenAPI); errors flow through `errorHandler` (`DetailedError`/`HTTPException`). Import with `#src/*`; env is `.env.dev`/`.env.prod` plus optional (gitignored) `.env.*.local`.
- Tests: `pnpm -F=backend test` (watch) / `pnpm -F=backend check` (lint + types + coverage); they hit the real app with `app.request()`.

## Releases

- Manual, per package: **Actions → Release → Run workflow** with a package name and optional version — the only publish path (a pushed tag publishes nothing).
- It runs `quickcheck`, then hands off to [`repo-release`](https://github.com/namesmt/repo-release): package `CHANGELOG.md`, bump, commit, tag `<package>@<version>`, push, GitHub release; npm publish is skipped for `"private"` packages (all of them here) and otherwise needs a trusted publisher configured per package on npmjs.com.
- One package per run, no workspace build (declare a `prepack` hook if a package needs one); `pnpm run release:check <package> [version]` validates a target locally before dispatch; the root `CHANGELOG.md` is pre-per-package history.
- Dry-run needs an explicit version and previews only — it stops before committing, pushing, releasing and publishing.

## Conventions

- Conventional commits: `type(scope): subject` (e.g. `fix(frontend): ...`).
- ESLint via `@antfu/eslint-config`; `lint-staged` runs `eslint --fix` on commit. Imports are sorted by eslint; no blank lines between them.
- Keep comments sparse — explain non-obvious intent only. Put scratch/temp files in `/tmp`.
