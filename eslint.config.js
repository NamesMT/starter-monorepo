import antfu from '@antfu/eslint-config'
import frontendNuxtConfig from 'frontend/.nuxt/eslint.config.mjs'

export default frontendNuxtConfig(await antfu(
  {
    typescript: true,
    vue: true,
    unocss: true,
    ignores: [
      '.sst',
      '**/convex/_generated/**',
      '**/lib/shadcn/**',
    ],
  },
  {
    files: ['apps/backend/**'],
    rules: {
      // Disable automatically transform `type` to `interface`, because Hono require the Bindings to be type.
      'ts/consistent-type-definitions': 'off',
    },
  },
  {
    files: ['apps/backend-convex/convex/**'],
    rules: {
      // Disable automatically transform `type` to `interface`, because Hono require the Bindings to be type.
      'node/prefer-global/process': 'off',
    },
  },
  {
    rules: {
      // Relaxes inline statements a bit
      'style/max-statements-per-line': ['error', { max: 2 }],
      // Allow top-level await
      'antfu/no-top-level-await': 'off',
      // Allow banning ts comments with warn
      'ts/ban-ts-comment': 'warn',
    },
  },
  // Allow trailing space for markdown formatting
  {
    files: ['**/*.md'],
    rules: {
      // // Experimental: allow multiple empty lines, this reduce conflicts AI Agents docs edits.
      // 'style/no-multiple-empty-lines': 'off',
      'style/no-trailing-spaces': 'off',
    },
  },
))
