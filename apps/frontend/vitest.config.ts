import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Unit tests for the app's plain TypeScript.
 *
 * Nuxt's auto-imports and `useRuntimeConfig` are not available here, so these cover code that
 * does not need a Nuxt instance. Anything that does is covered by Playwright in `e2e/`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@local/common': fileURLToPath(new URL('../../locals/common/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['app/**/*.test.ts', 'test/**/*.test.ts'],
    // Playwright owns `e2e/` and drives a real browser; vitest must not collect it.
    exclude: ['e2e/**', 'node_modules/**', '.nuxt/**'],
  },
})
