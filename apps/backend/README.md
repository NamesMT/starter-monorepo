# backend

**backend** is the main backend/API server for the project, powered by [Hono🔥](https://hono.dev/)

## Features
- Easy cross-function calls / Lambda triggers support with [hono-adapter-aws-lambda](https://github.com/NamesMT/hono-adapter-aws-lambda).
- [RPC](https://hono.dev/docs/guides/rpc) & [OpenAPI](https://github.com/rhinobase/hono-openapi): You can access the OpenAPI specs and Scalar UI at: https://127.0.0.1:3301/openapi/ui.
- Shared i18n with `frontend` via [`@local/locales`]((../../locals/locales/README.md)) (using [petite-vue-i18n](./src/helpers/i18n.ts)).
- [Arktype](https://arktype.io/) validation setup.
- [Session management](./src/middlewares/session.ts).
- Multi-platform support, one codebase that works for Node, Cloudflare Workers, AWS Lambda, and more.
- Efficient providers management pattern, auto-optimize depends on platforms, with on-demand initialization support, sample providers includes:
  - WorkOS AuthKit
  - Convex
  - grammY telegram bot
- And more minor goodies!

*You can view the OpenAPI UI live demo [HERE](https://4yjbmxiunrnigwewec4twf4zl40izfde.lambda-url.ap-southeast-1.on.aws/openapi/ui).*

## Structuring cookbook:
#### Root level:
Things like 3rd party APIs, DBs, Storages connectors, etc, should be placed in `#src/providers` folder, grouped by their purpose if possible, e.g: `#src/providers/auth/workos-main.ts`, `#src/providers/db/neon-main.ts`.

Things that interact with `#src/providers` should be placed in `#src/services` folder. (like an `user` service)

Other globally reuseable code should be placed in `#src/helpers` folder. (like `error`, `i18n` utils)

Locally reusable code should be placed in the same folder as the file that uses it, its name should be its usable scope, suffixing the file name with `.helper`, e.g: `/api/dummy/hello.helper.ts`, `/api/$.helper.ts`.

#### `api` folder:
The idea of the api folder is to mirrors the actual api url path if possible, i.e: an API endpoint at `://example.com/api/dummy/hello` should be placed in `/src/api/dummy/hello.ts`.

The root app entry of the backend is `/src/app.ts`. (*app entry means an Hono app instance*)

If an api prefix requires some common middlewares applied, then it should defines a main app entry as `$.ts` file at the prefix that the middleware applies, routes of this prefix will now be managed by this `$.ts` (called main app entry), instead of the root app entry, e.g: `/api/auth/$.ts`.

Root and main app entries will not define any routes but to manage middlewares and which routes are enabled (in other words, the app entries should only `.use` middlewares and `.route` routes).

If a folder prefix already exists and you need to define routes for the current folder path without any suffix route, use `$$.ts` for the file name, do not define a file with the same name as the folder on the parent, i.e: do `/api/dummy/$$.ts` instead of `/api/dummy.ts`.

Again, the recommended structure is to mirror the api url path, but, if for some reason like migrating an old app over that have multiple routes defined in the same file, you should create a `$.routes.ts` for multiple routes declaration in one file, e.g: `/api/auth/$.routes.ts`.

#### Hono `app` export naming conventions:
* Root and main app entries (app.ts, $.ts) should be named as: `<Name>App`, and it should only `.route` other instances or `.use` middlewares, do not define routes on the `App` instance.
* For other app entries, a.k.a routes defines, it should be named as: `<Name>Route`, i.e: `/api/dummy/hello.ts` should be named as `dummyHelloRoute`/`helloRoute`.

## Notes & Guides

### Deploying to AWS Lambda for medium / big functions

When deploying to AWS Lambda, the best pratice is that you'll use something like `https://github.com/0x80/isolate-package` to isolate and create a zip file for all prod dependencies packages, zip it, and deploy it as a "layer" for the Lambda function.
