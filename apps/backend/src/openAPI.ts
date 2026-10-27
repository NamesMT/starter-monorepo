import type { Hono } from 'hono'
import type { GenerateSpecOptions } from 'hono-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { generateSpecs } from 'hono-openapi'
import { errorResponse, errorSchema, securitySchemes } from '#src/helpers/openapi.js'

/**
 * Public route prefix: the paths the CDN/proxy exposes to the internet (`FRONTEND_URL` + `/api`).
 * The spec and UI live under it, so the browser reaches them on the same origin as the API.
 */
const PUBLIC_PREFIX = '/api'

/**
 * Pinned `@scalar/api-reference` ESM build. By default the integration loads the *latest* bundle
 * from jsDelivr with no version; `bundle` wins over `cdn` and over that default, and the pinned
 * entry derives its chunk URLs from its own release, so the whole UI stays in step.
 */
const SCALAR_BUNDLE_URL = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.76.0/esm.js'

const tags = [
  { name: 'Status', description: 'Liveness of the API itself.' },
  { name: 'Auth', description: 'WorkOS AuthKit sign-in, sign-out and session state.' },
  { name: 'Examples', description: 'Sample routes kept by this starter template; safe to delete.' },
]

/** Path-prefix → tag, so a new route file is grouped without touching its own `describeRoute`. */
const tagByPrefix: Record<string, string> = {
  '/api/auth': 'Auth',
  '/api/dummy': 'Examples',
}
const defaultTag = 'Status'

function tagForPath(path: string) {
  let match = ''
  for (const prefix of Object.keys(tagByPrefix)) {
    if ((path === prefix || path.startsWith(`${prefix}/`)) && prefix.length > match.length)
      match = prefix
  }
  return (match && tagByPrefix[match]) || defaultTag
}

const description = `
# starter-monorepo backend

Hono API for this starter template. The static frontends call it same-origin under \`/api\` in
production (Cloudflare Workers, or CloudFront in front of a Lambda Function URL) and through a dev
proxy locally, so every path below is relative to that prefix.

## Signing in

Authentication is a **sealed session cookie**, not a bearer token.

1. \`GET /api/auth/login?path=/somewhere\` redirects to WorkOS AuthKit.
2. AuthKit redirects back to \`GET /api/auth/callback?code=…\`.
3. The callback exchanges the code, stores the WorkOS user plus its access/refresh tokens in the
   \`backend-auth\` cookie (sealed and \`HttpOnly\`, \`Secure\`, \`SameSite=Lax\`, 90 min), and redirects to
   \`path\` on the frontend.
4. \`GET /api/auth/authState\` reports the current session; \`GET /api/auth/logout\` revokes it.

A client that is not a browser must persist and replay the \`Set-Cookie\` headers; there is no
header-based token to send.

## Permissions

**There is currently one permission level: signed in or not.** No roles, scopes or permission
tokens are implemented yet — a route either requires any valid session (\`checkAuth()\`) or accepts
anonymous callers. When scopes are added they will show up on the operations that need them.

## Errors

Failures return a JSON body matching \`#/components/schemas/Error\`:

\`\`\`json
{ "message": "Validation failed", "code": "DetailedError", "detail": [ /* issues */ ] }
\`\`\`

| Status | Meaning |
| --- | --- |
| \`400\` | Request validation failed; \`detail\` lists the failing fields. |
| \`401\` | No session, or the session's token is expired/revoked. Sign in again. |
| \`403\` | Authenticated but not allowed (reserved; no route enforces roles yet). |
| \`404\` | Unknown route. **Quirk:** \`/api/*\` misses are plain text \`four-o-four\`, not the JSON body. |
| \`500\` | Unhandled failure; \`message\` can come from the underlying provider and is not always safe to display. |

## Quirks

- Unknown paths **outside** \`/api\` fall through to the frontend's SPA fallback (a \`200\` HTML page), so
  only \`/api/*\` reliably signals a missing route.
- Cross-origin access is allowed for exactly one origin (\`FRONTEND_URL\`) and always with
  credentials; any other origin gets no CORS headers at all.
- Behind CloudFront + Lambda Function URL, \`POST\`/\`PUT\` bodies must be signed with an
  \`x-amz-content-sha256\` header; a plain HTTP client calling the API directly can omit it.
- \`SameSite=Lax\` means cross-site \`fetch\` calls do not carry the session cookie: browser clients
  must be same-origin.
`

const documentation: GenerateSpecOptions['documentation'] = {
  info: {
    title: `starter-monorepo's backend`,
    version: '1.0.0',
    description,
  },
  tags,
  components: {
    securitySchemes,
    schemas: { Error: errorSchema },
  },
}

/**
 * Generates the spec once and reuses it. Generation mutates process-wide middleware state
 * (`clearSpecsContext`), so concurrent runs would corrupt each other: cache the promise, and drop
 * the cache on rejection so the next request retries instead of inheriting the failure.
 */
function createSpecGenerator(app: Hono<any, any>) {
  let cached: Promise<Awaited<ReturnType<typeof generateSpecs>>> | undefined

  return function getSpec() {
    cached ??= generateSpecs(app, {
      documentation,
      defaultValidationErrorResponse: errorResponse('Request validation failed.'),
    })
      .then((spec) => {
        for (const [path, pathItem] of Object.entries(spec.paths)) {
          const tag = tagForPath(path)
          for (const operation of Object.values(pathItem ?? {})) {
            if (!operation || typeof operation !== 'object' || !('responses' in operation))
              continue
            operation.tags ??= [tag]
          }
        }
        return spec
      })
      .catch((error) => {
        cached = undefined
        throw error
      })

    return cached
  }
}

export function setupOpenAPI(app: Hono<any, any>, prefix = `${PUBLIC_PREFIX}/openapi`) {
  const getSpec = createSpecGenerator(app)

  app.get(`${prefix}/spec.json`, async c => c.json(await getSpec()))

  app.get(
    `${prefix}/ui`,
    Scalar({
      theme: 'deepSpace',
      pageTitle: `starter-monorepo's backend`,
      url: `${prefix}/spec.json`,
      telemetry: false,
      bundle: SCALAR_BUNDLE_URL,
    }),
  )
}
