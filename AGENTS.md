# AGENTS.md

Orientation for agents working here. Deeper sources of truth: [`README.md`](./README.md),
[`INIT_PROMPT.md`](./INIT_PROMPT.md), [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md),
[`docs/WORKFLOWS.md`](./docs/WORKFLOWS.md), [`docs/CHAT.md`](./docs/CHAT.md),
[`apps/backend/README.md`](./apps/backend/README.md),
[`locals/nuxt-layer-common/README.md`](./locals/nuxt-layer-common/README.md).

## Docs

Where knowledge lives, and when to reach for each:

| tier | what it holds | when you use it |
| --- | --- | --- |
| `AGENTS.md` — this file | orientation and the rules that prevent defects | read every session; write when a rule is learned the hard way |
| `.agentDocs/` | depth: module rationale, traps with their causes, compatibility | read on demand, before touching that area; write when a rule needs its reasoning kept |
| `docs/` | how-to and reference for a person using this package | read when the task is user-facing; write in the same commit as the change |
| `README.md` | the first read, for a person | write alongside `docs/` |

- **One home per fact.** State the rule here, keep the reasoning in `.agentDocs/` and link it — never both.
- **A dead pointer is a bug.** If the target is gone, delete the pointer rather than leave it.
- Move depth behind a pointer once a section outgrows a screen or two; keep the rule inline.

**There is no `.agentDocs/` here yet and none is needed at this size.** Create one when a section
above outgrows a screen or two: move the *reasoning* out and keep the *rule* here with a pointer to
it — nobody reads a file they do not open.

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — workspace map, layering rules, and how backend/frontend/locales pieces compose.
- [`docs/WORKFLOWS.md`](./docs/WORKFLOWS.md) — dev/build/test/migration commands, the Turbo task graph, and CI/release behavior.
- [`docs/CHAT.md`](./docs/CHAT.md) — how the AI chat streams and persists, its deliberate tradeoffs, and known gaps.

## Commands

```sh
pnpm install          # workspace install; @local/locales generates its JSON on postinstall
pnpm run dev          # every app's dev server through turbo
pnpm run dev:noConvex # same without Convex — the usual choice when not touching chat
pnpm run quickcheck   # lint + test:types across the workspace: fast, no tests
pnpm run check        # quickcheck plus every package's tests: CI, deploy and release use this
```

Ports (all `127.0.0.1`, all HTTPS): `frontend` 3300 · `frontend-second` 3301 · `backend` 3400 · wrangler/workerd 3450. Nuxt/backend TLS comes from the `locals/common/dev` localcert; `wrangler dev` serves its own local HTTPS.

## Structure

- `apps/*` — `frontend`, `frontend-second` (Nuxt 4, SSG via `nuxt generate`), `backend` (Hono), `backend-convex` (Convex); all `"private": true`.
- `locals/*` — shared, never-published code consumed as `"@local/<pkg>": "workspace:*"`: `common` (framework-agnostic fns/types/constants + `dev/` certs/env helpers), `common-vue`, `locales` (i18n source of truth: sheets → generated JSON), `tsconfig` (shared `tsconfig.json`s), `nuxt-layer-common` (the base layer every frontend extends). Code used by more than one app goes here, not duplicated in an app.
- `scripts/*` — repo-level Node scripts; `release-target.mjs` backs the release workflow.
- `.github/workflows/*` — `quickcheck` (manual + `workflow_call`-reusable; its `push` block is commented out), `frontend-to-gh-pages` (manual; `push` block commented out), `release` (manual dispatch only, no `push` trigger). Uncomment a `push` block where one exists; never add one to `release`.

## Conventions

- pnpm workspace + Turborepo; versions pinned through the **catalog** in `pnpm-workspace.yaml` (`"<pkg>": "catalog:"`). After changing a dependency, **restart the dev server** — Vite/HMR does not pick up new deps (`Cannot find package`, `504 Outdated Optimize Dep`).
- `@local/common` is imported by source path (`@local/common/src/...`) and declares almost no dependencies of its own; each app provides the packages those sources import, so a missing app-level declaration only breaks once that app stops providing it.
- `@local/locales`: edit CSVs in `locals/locales/src/sheets/**`; JSON generates into `dist/` on `postinstall`/`dev`. Backend reads `dist/{locale}.json` + `dist/backend/*`; frontends read `dist/frontend` (global bucket merged in). `nuxtSiteConfig.name/description` keys are required for titles/meta; `pnpm run i18n` localizes via lingo.dev.
- Tests are vitest per package (`pnpm test` runs them all) and live in that package's `check`, not `quickcheck`. Frontend SFCs need `@vitejs/plugin-vue` + `happy-dom`; E2E is Playwright (`pnpm -F=frontend test:e2e`), outside both because it needs a browser and a server.
- Conventional commits: `type(scope): subject` (e.g. `fix(frontend): ...`).
- ESLint via `@antfu/eslint-config`; `lint-staged` runs `eslint --fix` on commit. Imports are sorted by eslint; no blank lines between them.
- Put scratch/temp files in `/tmp`.

## How to work here

- **Check the callers before you change anything.** Grep who uses it and which tests name it. If the
  impact is unclear, say so — do not guess.
- **Never overwrite or delete a large section you have not understood.** Read it, or say what you could
  not determine and ask.
- **Do not invent requirements.** Build what was asked; surface what else you notice and let it be
  decided.
- **Fix the class, not the instance.** A copied helper, a rule stated twice, a guard bypassed by a
  second path is one problem: one implementation, one guard. That is the work, not a follow-up to ask
  for. Stay inside the task rather than refactoring the world.
- **Verify before claiming, and say what you checked.** A passing test is not evidence it pins
  anything — **break the thing it guards and watch it fail.** If it still passes, either the test is
  decoration or a different guard is running; find out which. Where a stub cannot answer the question,
  drive the real thing.
- **Never write an identifier from memory.** A commit hash, path, line number or version must be quoted
  from the source; a plausible-looking invented one is worse than none.
- **A stated blocker is a hypothesis, not a fact.** Re-test "cannot install X" / "tool unavailable"
  before inheriting it, and never report a failure your own flag forced.
- **Report the risk with the change** — correctness, security, operational and integration; plus what
  you could not verify and every assumption you made. An unverified claim marked as such beats a
  confident one that is wrong.
- **Missing recall of this repo?** Read this file, `.agentDocs/` and `git log` before acting, then ask
  1–3 focused questions rather than guessing at intent.

## Conciseness

**Prune verbose, keep correctness** — code, comments, docs alike.

- Code: a comment only for non-obvious *intent*, never to restate the line, and never long. A block
  arguing for its own change is a commit message.
- Docs: one idea per sentence. Cut anything that would not change what a reader does.
- Delete history `git log` already holds — keep the *rule* that came out of it, not the story.
- **Never drop a caveat to save a line.** Concise means no filler, not fewer facts.

## User-facing docs

`README.md` and `docs/*.md` target a person: concise first read, `<details>` for depth. Docs ship with the change.

## Releasing

- Manual, per package: **Actions → Release → Run workflow** with a package name and optional version — the only publish path (a pushed tag publishes nothing).
- It runs `check`, then hands off to [`repo-release`](https://github.com/namesmt/repo-release): package `CHANGELOG.md`, bump, commit, tag `<package>@<version>`, push, GitHub release; npm publish is skipped for `"private"` packages (all of them here) and otherwise needs a trusted publisher configured per package on npmjs.com.
- One package per run, no workspace build (declare a `prepack` hook if a package needs one); `pnpm run release:check <package> [version]` validates a target locally before dispatch; the root `CHANGELOG.md` is pre-per-package history.
- Dry-run needs an explicit version and previews only — it stops before committing, pushing, releasing and publishing.

## Frontend (Nuxt)

- Both frontends `extends: ['@local/nuxt-layer-common']`: app-specific code stays in the app, shared setup in the layer. Read the layer README before touching the layer or shadcn kit.
- Add shadcn components with `pnpm -F=@local/nuxt-layer-common shad-add <name>`, never from an app.
- Per-app styling (`apps/<app>/app/assets/css/*`, `apps/<app>/app/components/OgImage/Frame.takumi.vue`) overrides layer defaults.

## Backend (Hono)

- `apps/backend/src/app.ts` is the root entry; `api/` mirrors the URL path (`/api/dummy/hello` → `apps/backend/src/api/dummy/hello.ts`).
- App entries (`app.ts`, `$.ts`) only `.use` middlewares and `.route` routes, never define routes, and are named `<Name>App`; route files are `<Name>Route`, multiple routes in one file go in `$.routes.ts`, and a folder-prefix index route uses `$$.ts` (e.g. `src/api/$$.ts`, not `api.ts`).
- `#src/providers` (3rd-party connectors, grouped by purpose), `#src/services` (orchestrating providers), `#src/helpers` (global helpers); locally reusable code sits next to its consumer as `*.helper.ts`.
- Validation via `customArktypeValidator` + `describeRoute` (OpenAPI); errors flow through `errorHandler` (`DetailedError`/`HTTPException`). Import with `#src/*`; the dev script reads the committed `.env.dev`, and a gitignored `.env.dev.local` overrides it.
- Tests: `pnpm test` (Turbo, whole workspace) or `pnpm -F=backend test`; `test:watch` for watch mode; `pnpm -F=backend check` adds coverage. They hit the real app with `app.request()`.
