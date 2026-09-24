# AGENTS.md

Orientation for agents working on this monorepo. Deeper sources of truth:
[`README.md`](./README.md), [`INIT_PROMPT.md`](./INIT_PROMPT.md),
[`apps/backend/README.md`](./apps/backend/README.md),
[`locals/nuxt-layer-common/README.md`](./locals/nuxt-layer-common/README.md).

## Fast start

```sh
pnpm install          # installs the workspace; @local/locales generates its JSON on postinstall
pnpm run dev          # every app's dev server through turbo (ports below)
pnpm run dev:noConvex # the same without Convex — the usual choice when not touching chat
pnpm run quickcheck   # lint + test:types across the workspace: run this before saying "done"
```

## Layout

- `apps/*` — runnable apps: `frontend` and `frontend-second` (Nuxt 4, SSG), `backend` (Hono),
  `backend-convex` (Convex).
- `locals/*` — **shared code**, private and never published; apps consume it as
  `"@local/<pkg>": "workspace:*"`:
  - `common` — framework-agnostic functions/types/constants (plus `dev/` certs and env helpers).
  - `common-vue` — shared Vue components.
  - `locales` — i18n source of truth (spreadsheets → generated JSON).
  - `tsconfig` — shared base/vue `tsconfig`s.
  - `nuxt-layer-common` — the Nuxt base layer every frontend extends.
- `scripts/*` — repo-level Node scripts; `release-target.mjs` backs the release workflow.
- `.github/workflows/*` — `quickcheck`, `release` and `frontend-to-gh-pages`. All three are
  `workflow_dispatch`-only; uncomment their `push` blocks to make them automatic.

Reusable-by-more-than-one-app code belongs in `locals/*`, not duplicated in an app.

## Tooling

- pnpm workspace + Turborepo, with versions pinned through the **catalog** in `pnpm-workspace.yaml`
  (`"<pkg>": "catalog:"`).
- After changing any dependency, **restart the dev server** before testing — Vite/HMR does not pick
  up new deps (symptoms: `Cannot find package`, `504 Outdated Optimize Dep`).
- Verify with `quickcheck` (lint + `test:types` across the workspace).

## Shared code

- `@local/common` is imported by source path (`@local/common/src/...`) and must declare every package
  its sources import (a missing declaration only breaks once an app stops providing it).
- `@local/locales`: edit CSVs in `locals/locales/src/sheets/**`; JSON is generated into `dist/` on
  `postinstall`/`dev`. Backend reads `dist/{locale}.json` + `dist/backend/*`, frontends read
  `dist/frontend` (global bucket merged in). `nuxtSiteConfig.name/description` keys are required for
  titles/meta; the `i18n` script localizes via lingo.dev.

## Frontend (Nuxt)

- Both frontends `extends: ['@local/nuxt-layer-common']`: keep app-specific code in the app, shared
  setup in the layer.
- Layer authoring rules live in the layer's README — read it before touching the layer or shadcn kit.
- Add shadcn components with `pnpm -F=@local/nuxt-layer-common shad-add <name>`, never from an app.
- Styling identity is per app (`app/assets/css/*`, `app/components/OgImage/Frame.takumi.vue`); the
  layer ships defaults that apps override.

## Backend (Hono)

Full structuring rules: [`apps/backend/README.md`](./apps/backend/README.md). Essentials:

- `src/app.ts` is the root app entry; `api/` mirrors the URL path
  (`/api/dummy/hello` → `src/api/dummy/hello.ts`).
- App entries (`app.ts`, `$.ts`) only `.use` middlewares and `.route` routes — never define routes —
  and are named `<Name>App`. Route files are named `<Name>Route`.
- `#src/providers` — 3rd-party APIs/DBs/storage connectors, grouped by purpose;
  `#src/services` — code orchestrating providers; `#src/helpers` — globally reusable helpers;
  locally reusable code lives next to its consumer as `*.helper.ts`.
- Multiple routes in one file: `$.routes.ts`. A folder-prefix index route uses `$$.ts`
  (e.g. `api/dummy/$$.ts`, not `api/dummy.ts`).
- Validation via `customArktypeValidator` + `describeRoute` (OpenAPI); errors flow through
  `errorHandler` (`DetailedError` / `HTTPException`).
- Import with `#src/*` (package.json `imports`). Env: `.env.dev` / `.env.prod` plus an optional
  (gitignored) `.env.*.local`.
- Tests: `pnpm -F=backend test` (watch) / `pnpm -F=backend check` (lint + types + coverage); runtime
  tests hit the real Hono app with `app.request()`.

## Dev ports

| App | URL |
| --- | --- |
| `frontend` | `127.0.0.1:3300` |
| `frontend-second` | `127.0.0.1:3301` |
| `backend` | `127.0.0.1:3400` |
| wrangler / workerd | `127.0.0.1:3450` |

## Releases

One package at a time, dispatched from **Actions → Release → Run workflow**
([`.github/workflows/release.yml`](./.github/workflows/release.yml)) with a package name and,
optionally, a version:

- It resolves the package and checks the version against `<pkg>/package.json`, runs `quickcheck`,
  then hands over to [`repo-release`](https://github.com/namesmt/repo-release) — which writes that
  package's `CHANGELOG.md`, bumps its `package.json`, commits, tags `<package>@<version>`, pushes,
  creates the GitHub release, and publishes to npm.
- Locally, `pnpm run release:check <package> [version]` validates a target, and `pnpm run
  repo-release` is the interactive equivalent (it prompts for the package and the bump).
- The root `CHANGELOG.md` is the pre-per-package history; new releases write into the released
  package's own directory.
- Publishing is skipped for any package marked `"private": true` (every package in this template
  is), and otherwise needs a trusted publisher configured per package on npmjs.com naming this
  repository and `release.yml`.
- The pipeline releases one package and never builds the workspace: a package that needs a build
  declares its own `prepack` hook (`npm publish` runs it). Coordinated multi-package releases, or
  anything needing extra artifacts, belong in a workflow of your own.

## Conventions

- Conventional commits: `type(scope): subject` (e.g. `fix(frontend): ...`, `feat(chat): ...`).
- ESLint via `@antfu/eslint-config`; `lint-staged` runs `eslint --fix` on commit. Imports are sorted
  by eslint, do not put blank lines between them.
- Keep comments sparse — explain non-obvious intent only.
- Put scratch/temp files in `/tmp`.
