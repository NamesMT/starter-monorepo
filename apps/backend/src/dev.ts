import { localcertKeyPath, localcertPath } from '@local/common/dev/cert'
import { getConvexEnvs } from 'backend-convex/dev'
import { serve } from 'srvx'
import { env } from 'std-env'
import { app } from './app'

// Try load CONVEX_URL from local dev env
env.CONVEX_URL ||= (await getConvexEnvs()).CONVEX_URL

// Serve local server
serve({
  fetch(request) {
    return app.fetch(request)
  },
  hostname: env.APP_DEV_host,
  port: +(env.APP_DEV_port ?? '3301'),
  tls: { cert: localcertPath, key: localcertKeyPath },
})
