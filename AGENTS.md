# AGENTS.md

Orientation for agents working here. Deeper sources of truth: [`README.md`](./README.md),
[`INIT_PROMPT.md`](./INIT_PROMPT.md), [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md),
[`docs/WORKFLOWS.md`](./docs/WORKFLOWS.md), [`docs/CHAT.md`](./docs/CHAT.md),
[`apps/backend/README.md`](./apps/backend/README.md),
[`locals/nuxt-layer-common/README.md`](./locals/nuxt-layer-common/README.md).

## Docs

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — workspace map, layering rules, and how backend/frontend/locales pieces compose.
- [`docs/WORKFLOWS.md`](./docs/WORKFLOWS.md) — dev/build/test/migration commands, the Turbo task graph, and CI/release behavior.
- [`docs/CHAT.md`](./docs/CHAT.md) — how the AI chat streams and persists, its deliberate tradeoffs, and known gaps.

## Fast start

```sh
pnpm install          # workspace install; @local/locales generates its JSON on postinstall
pnpm run dev          # every app's dev server through turbo
pnpm run dev:noConvex # same without Convex — the usual choice when not touching chat
pnpm run quickcheck   # lint + test:types + test across the workspace: run before saying "done"
```

Ports (all `127.0.0.1`, all HTTPS): `frontend` 3300 · `frontend-second` 3301 · `backend` 3400 · wrangler/workerd 3450. Nuxt/backend TLS comes from the `locals/common/dev` localcert; `wrangler dev` serves its own local HTTPS.

## Layout

- `apps/*` — `frontend`, `frontend-second` (Nuxt 4, SSG via `nuxt generate`), `backend` (Hono), `backend-convex` (Convex); all `"private": true`.
- `locals/*` — shared, never-published code consumed as `"@local/<pkg>": "workspace:*"`: `common` (framework-agnostic fns/types/constants + `dev/` certs/env helpers), `common-vue`, `locales` (i18n source of truth: sheets → generated JSON), `tsconfig` (shared `tsconfig.json`s), `nuxt-layer-common` (the base layer every frontend extends). Code used by more than one app goes here, not duplicated in an app.
- `scripts/*` — repo-level Node scripts; `release-target.mjs` backs the release workflow.
- `.github/workflows/*` — `quickcheck` (manual + `workflow_call`-reusable; its `push` block is commented out), `frontend-to-gh-pages` (manual; `push` block commented out), `release` (manual dispatch only, no `push` trigger). Uncomment a `push` block where one exists; never add one to `release`.

## Tooling & shared code

- pnpm workspace + Turborepo; versions pinned through the **catalog** in `pnpm-workspace.yaml` (`"<pkg>": "catalog:"`). After changing a dependency, **restart the dev server** — Vite/HMR does not pick up new deps (`Cannot find package`, `504 Outdated Optimize Dep`).
- `@local/common` is imported by source path (`@local/common/src/...`) and declares almost no dependencies of its own; each app provides the packages those sources import, so a missing app-level declaration only breaks once that app stops providing it.
- `@local/locales`: edit CSVs in `locals/locales/src/sheets/**`; JSON generates into `dist/` on `postinstall`/`dev`. Backend reads `dist/{locale}.json` + `dist/backend/*`; frontends read `dist/frontend` (global bucket merged in). `nuxtSiteConfig.name/description` keys are required for titles/meta; `pnpm run i18n` localizes via lingo.dev.

## Frontend (Nuxt)

- Both frontends `extends: ['@local/nuxt-layer-common']`: app-specific code stays in the app, shared setup in the layer. Read the layer README before touching the layer or shadcn kit.
- Add shadcn components with `pnpm -F=@local/nuxt-layer-common shad-add <name>`, never from an app.
- Per-app styling (`app/assets/css/*`, `app/components/OgImage/Frame.takumi.vue`) overrides layer defaults.

## Backend (Hono)

- `src/app.ts` is the root entry; `api/` mirrors the URL path (`/api/dummy/hello` → `src/api/dummy/hello.ts`).
- App entries (`app.ts`, `$.ts`) only `.use` middlewares and `.route` routes, never define routes, and are named `<Name>App`; route files are `<Name>Route`, multiple routes in one file go in `$.routes.ts`, and a folder-prefix index route uses `$$.ts` (e.g. `src/api/$$.ts`, not `api.ts`).
- `#src/providers` (3rd-party connectors, grouped by purpose), `#src/services` (orchestrating providers), `#src/helpers` (global helpers); locally reusable code sits next to its consumer as `*.helper.ts`.
- Validation via `customArktypeValidator` + `describeRoute` (OpenAPI); errors flow through `errorHandler` (`DetailedError`/`HTTPException`). Import with `#src/*`; the dev script reads the committed `.env.dev`, and a gitignored `.env.dev.local` overrides it.
- Tests: `pnpm test` (Turbo, whole workspace) or `pnpm -F=backend test`; `test:watch` for watch mode; `pnpm -F=backend check` adds coverage. They hit the real app with `app.request()`.

## Releases

- Manual, per package: **Actions → Release → Run workflow** with a package name and optional version — the only publish path (a pushed tag publishes nothing).
- It runs `quickcheck`, then hands off to [`repo-release`](https://github.com/namesmt/repo-release): package `CHANGELOG.md`, bump, commit, tag `<package>@<version>`, push, GitHub release; npm publish is skipped for `"private"` packages (all of them here) and otherwise needs a trusted publisher configured per package on npmjs.com.
- One package per run, no workspace build (declare a `prepack` hook if a package needs one); `pnpm run release:check <package> [version]` validates a target locally before dispatch; the root `CHANGELOG.md` is pre-per-package history.
- Dry-run needs an explicit version and previews only — it stops before committing, pushing, releasing and publishing.

## How to work here

- Check callers before changing it; if impact is unclear, say so.
- Never rewrite a section you haven't understood; don't invent requirements, surface what's needed.
- Report risk, not just the change: correctness, security, operational, integration.
- **Fix the root cause, not the instance** — one bug under different names (copied helper, duplicated rule, a second path) is one class; fix it once, in scope.
- Verify before claiming, say which direction you checked: a green test pins nothing.
- Missing project recall: read this file, `docs/` and `git log`.

## Conciseness (applies everywhere)

Prune verbose, keep correctness — code, comments, docs. One idea per sentence; cut what wouldn't change a reader's action. Keep comments sparse: explain non-obvious intent only, never restate the line. Delete history `git log` holds — keep the rule, not the story. Never drop a caveat to save a line.

## User-facing docs

`README.md` and `docs/*.md` target a person: concise first read, `<details>` for depth. Docs ship with the change.

## Conventions

- Conventional commits: `type(scope): subject` (e.g. `fix(frontend): ...`).
- ESLint via `@antfu/eslint-config`; `lint-staged` runs `eslint --fix` on commit. Imports are sorted by eslint; no blank lines between them.
- Put scratch/temp files in `/tmp`.
