import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

/** Component tests: Vue SFCs with no Nuxt instance, in a DOM. */
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
})
