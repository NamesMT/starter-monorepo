import { expect, test } from '@playwright/test'

/**
 * End-to-end checks against the real frontend and the backend behind its `/api` proxy.
 *
 * These assert what a browser sees — SSR/hydrated DOM and live API responses — which the
 * unit tests in `test/` cannot: they have no Nuxt instance and no server.
 */

test.describe('home page', () => {
  test('renders its translated content once hydrated', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/starter-monorepo/)
    // The shell paints first and hydrates a few seconds later in dev, so wait for a string
    // that only exists after the i18n bundles load rather than asserting on the initial HTML.
    await expect(page.getByText('Shared `@common/vue` sample')).toBeVisible({ timeout: 30_000 })
  })

  test('reaches the backend through the same-origin /api proxy', async ({ page }) => {
    // The proxy is the production shape (static frontend + backend on one origin), so a
    // failure here means the frontend cannot talk to the API the way it will when deployed.
    const response = await page.request.get('/api/dummy/hello')

    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('Hello from')
  })

  test('serves the OpenAPI docs the backend publishes under the public prefix', async ({ page }) => {
    const spec = await page.request.get('/api/openapi/spec.json')

    expect(spec.status()).toBe(200)
    const body = await spec.json() as { paths?: Record<string, unknown> }
    expect(body.paths).toHaveProperty('/api')

    await page.goto('/api/openapi/ui')
    await expect(page).toHaveTitle(/starter-monorepo/)
  })
})

test.describe('routing', () => {
  test('answers a missing page with the SPA fallback rather than an error', async ({ page }) => {
    // `not_found_handling: single-page-application` serves the shell; only `/api/*` 404s.
    const response = await page.goto('/definitely-not-a-real-page')

    expect(response?.status()).toBe(404)
    await expect(page.locator('body')).toBeVisible()
  })

  test('keeps the API 404 plain text, so a missing endpoint is distinguishable from a page', async ({ page }) => {
    const response = await page.request.get('/api/definitely-not-a-real-endpoint')

    expect(response.status()).toBe(404)
    expect(await response.text()).toBe('four-o-four')
  })
})
