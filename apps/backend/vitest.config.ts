import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const srcDir = fileURLToPath(new URL('./src/', import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      // `#src/*` is a Node subpath import (`package.json#imports`) and the sources import
      // `*.js` while the files are TypeScript, neither of which Vite resolves by default.
      { find: /^#src\/(.*)\.js$/, replacement: `${srcDir}$1.ts` },
      { find: '#src', replacement: srcDir },
    ],
  },
})
