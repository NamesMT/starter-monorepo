import { cors } from 'hono/cors'
import { logger as loggerMiddleware } from 'hono/logger'
import { env } from 'std-env'
import { errorHandler } from '~/helpers/error'
import { appFactory, triggerFactory } from '~/helpers/factory'
import { cookieSession } from '~/middlewares/session'
import { apiApp } from './api/$'
import { logger } from './helpers/logger'
import { setupOpenAPI } from './openAPI'
import { providersInit } from './providers'

export const app = appFactory.createApp()
  // Initialize providers
  .use(providersInit)

  // Register global not found handler
  .notFound(c => c.text('four-o-four', 404))

  // Register global error handler
  .onError(errorHandler)

  // Request logging middleware
  .use(loggerMiddleware(logger.log))

  // Register trigger routes, after the logging middleware but before the request-based middlewares
  .route('/', triggerFactory.honoApp)

  // CORS middleware
  .use(cors({
    origin: [env.FRONTEND_URL!],
    credentials: true,
  }))

  // Session management middleware, configure and see all available managers in `src/middlewares/session.ts`
  .use(await cookieSession())

  // Register API routes
  .route('/api', apiApp)

export default app

// Setup OpenAPI stuff
setupOpenAPI(app)
