import { localcertKeyPath, localcertPath } from '@local/common/dev/cert'
import { handle, streamHandle } from 'hono-adapter-aws-lambda'
import { env, isDevelopment } from 'std-env'
import { app } from './app'
import { setupOpenAPI } from './openAPI'

setupOpenAPI(app)

export const handler = (env.STREAMING_ENABLED && !env.SST_LIVE)
  ? streamHandle(app)
  : handle(app)

if (isDevelopment) {
  // Serve local server
  const { serve } = await import('srvx')

  serve({
    fetch(request) {
      return app.fetch(request)
    },
    hostname: env.APP_DEV_host,
    port: +(env.APP_DEV_port ?? '3301'),
    tls: { cert: localcertPath, key: localcertKeyPath },
  })
}
