import rateLimiter from '@convex-dev/rate-limiter/convex.config'
import { defineApp } from 'convex/server'

const app: ReturnType<typeof defineApp> = defineApp()
app.use(rateLimiter)

export default app
