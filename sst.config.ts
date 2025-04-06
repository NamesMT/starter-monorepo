/// <reference path="./.sst/platform/config.d.ts" />

import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { dirname, resolve } from 'pathe'
import { env } from 'std-env'

export default $config({
  app(input) {
    return {
      name: 'starter-monorepo',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
    }
  },
  async run() {
    // // Loading apps/backend's .env files
    // sst.config.ts will be compiled to .sst/platform/eval, we need to move out from it.
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const rootDir = resolve(currentDir, '../../../')
    const backendDir = resolve(rootDir, 'apps/backend/')
    config({ path: [resolve(backendDir, '.env.prod.local'), resolve(backendDir, '.env')], debug: true })
    // //

    const backend = new sst.aws.Function('Backend', {
      url: true,
      // bundle: 'apps/backend/dist',
      handler: 'apps/backend/src/index.handler',
      timeout: '60 seconds',
      // If you need to process a big amount of data, you should create sub "job" functions
      // instead of rising the spec of the main function
      memory: '300 MB',
      streaming: false,
      architecture: 'arm64',
      environment: {
        KINDE_DOMAIN: env.KINDE_DOMAIN!,
        KINDE_CLIENT_ID: env.KINDE_CLIENT_ID!,
        KINDE_CLIENT_SECRET: env.KINDE_CLIENT_SECRET!,
        KINDE_REDIRECT_URI: env.KINDE_REDIRECT_URI!,
        KINDE_LOGOUT_REDIRECT_URI: env.KINDE_LOGOUT_REDIRECT_URI!,
      },
    })

    return {
      backendUrl: backend.url,
    }
  },
})
