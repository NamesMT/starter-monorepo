import process from 'node:process'
import { describe, expect, it } from 'vitest'

// `providersInit` initializes WorkOS on the first request; placeholder values are enough
// because constructing the client does not hit the network and nothing here uses auth.
process.env.WORKOS_CLIENT_ID ||= 'client_test'
process.env.WORKOS_API_KEY ||= 'sk_test'
process.env.WORKOS_REDIRECT_URI ||= 'https://127.0.0.1:3300/api/auth/callback'
process.env.FRONTEND_URL ||= 'https://127.0.0.1:3300'
// Keep the Convex-dependent route on its graceful (Convex-less) path.
delete process.env.CONVEX_URL

const { app } = await import('#src/app.js')

describe('backend runtime', () => {
  it('answers the /api health check', async () => {
    const res = await app.request('/api')

    expect(res.status).toBe(200)
    await expect(res.text()).resolves.toBe('OK')
  })

  it('greets from /api/dummy/hello without requiring Convex', async () => {
    const res = await app.request('/api/dummy/hello')

    expect(res.status).toBe(200)
    await expect(res.text()).resolves.toContain('Hello from i18n and Hono')
  })

  it('greets the validated query name at /api/dummy/greet', async () => {
    const res = await app.request('/api/dummy/greet?name=World')

    expect(res.status).toBe(200)
    await expect(res.text()).resolves.toBe('Hello World!')
  })

  it('honours the locale query at /api/dummy/greet', async () => {
    const res = await app.request('/api/dummy/greet?name=World&locale=vi')

    expect(res.status).toBe(200)
    await expect(res.text()).resolves.toBe('Xin chào World!')
  })

  it('rejects a missing name through the error handler', async () => {
    const res = await app.request('/api/dummy/greet')

    expect(res.status).toBe(400)
    const body = (await res.json()) as { message?: string }
    expect(body.message).toBe('Validation failed')
  })

  it('returns the API 404 body for unknown /api paths', async () => {
    const res = await app.request('/api/does-not-exist')

    expect(res.status).toBe(404)
    await expect(res.text()).resolves.toBe('four-o-four')
  })

  it('answers a CORS preflight for the configured frontend origin', async () => {
    const res = await app.request('/api', {
      method: 'OPTIONS',
      headers: {
        'origin': 'https://127.0.0.1:3300',
        'access-control-request-method': 'GET',
      },
    })

    expect(res.headers.get('access-control-allow-origin')).toBe('https://127.0.0.1:3300')
    expect(res.headers.get('access-control-allow-credentials')).toBe('true')
  })

  it('serves the OpenAPI spec', async () => {
    const res = await app.request('/openapi/spec.json')

    expect(res.status).toBe(200)
    const body = (await res.json()) as { openapi?: string }
    expect(body.openapi).toBeTruthy()
  })
})
