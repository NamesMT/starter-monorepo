# starter-fullstack

This is a starter template to kick-start your `Nuxt` full-stack project

## What's inside?

⏩ This template is powered by [Turborepo](https://turbo.build/repo).

😊 Out-of-the-box, this repo is configured for a static `frontend` Nuxt app, and a `backend` Hono app that will be the main API, to optimize on cost and simplicity.

🌩️ Utilizing [SST Ion](https://ion.sst.dev/) for Infrastructure-as-Code, with powerful [Live](https://ion.sst.dev/docs/live/) development.  
SST is 100% opt-in, by using `sst` CLI commands yourself, like `sst dev`,  
simply remove `sst` dependency and `sst.config.ts` if you want to use another solution.  
*currently only `backend` app is configured, which will deploy a Lambda with Function URL enabled*

🔐 Comes with starter-kit for [Kinde](https://kinde.com/) authentication, see: `/apps/backend/api/auth`

### Apps and Packages

- `frontend`: a [Nuxt](https://nuxt.com/) app, configured same as [starter-nuxt](https://github.com/NamesMT/starter-nuxt).
  - By default, in development, `/api/*` is proxied to the `backendUrl`, this mimics a production environment where the static frontend and the backend lives on the same domain at /api, which is the most efficient configuration for Cloudfront + Lambda Function Url
- `backend`: a [Hono🔥](https://hono.dev/) app.
- `@local/common`: a shared library that can contain constants, functions, types shared across all apps.
- `@local/common-vue`: a shared library that can contain components, constants, functions, types shared across vue-based apps.
- `tsconfig`: `tsconfig.json`s used throughout the monorepo.

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:
- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

### Develop

To develop all apps and packages, run the following command:

### Remote Caching

Turborepo can use a technique known as [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup), then enter the following commands:

```
npx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
npx turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)
