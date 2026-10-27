import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against the real frontend.
 *
 * The dev server is HTTPS with the repo's local self-signed certificate, so the browser is
 * told to accept it rather than the config disabling verification globally. `webServer` is
 * only started when nothing is already listening, so a running `pnpm run dev` is reused.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'https://127.0.0.1:3300'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    // Self-signed localcert; the API and dev proxy share it.
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Reuse a dev server that is already up; start one only when there is none.
  webServer: {
    command: 'pnpm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
    ignoreHTTPSErrors: true,
  },
})
