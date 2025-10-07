import { errorHandler } from '#src/helpers/error.js'
import { appFactory, triggerFactory } from '#src/helpers/factory.js'
import { createCookieState } from 'hono-cookie-state'
import { cors } from 'hono/cors'
import { logger as loggerMiddleware } from 'hono/logger'
import { env, isWorkerd } from 'std-env'
import { apiApp } from './api/$'
import { setupOpenAPI } from './openAPI'
import { providersInit } from './providers'

export const app = appFactory.createApp()
  // Initialize providers
  .use(providersInit)

  // Register global not found handler
  .notFound((c) => {
    if (c.req.path.startsWith('/api'))
      return c.text('four-o-four', 404)

    if (isWorkerd)
      return c.env.ASSETS.fetch('https://assets.local/200.html')

    return c.text('four-o-four', 404)
  })

  // Register global error handler
  .onError(errorHandler)

  // Request logging middleware
  .use(loggerMiddleware())

  // Register trigger routes, after the logging middleware but before the request-based middlewares
  .route('/', triggerFactory.honoApp)

  // CORS middleware
  .use(cors({
    origin: [env.FRONTEND_URL!],
    credentials: true,
  }))

  // Main cookie session for the app
  .use(createCookieState({
    key: 'session',
    secret: 'password_at_least_32_characters!',
    cookieOptions: {
      maxAge: 90 * 60, // 90 mins
      sameSite: 'None',
      secure: true,
      path: '/',
      httpOnly: true,
    },
  }))
  // auth vendor's session data
  .use(createCookieState({
    key: 'authVendorSession',
    secret: 'password_at_least_32_characters!',
    cookieOptions: {
      maxAge: 90 * 60, // 90 mins
      sameSite: 'None',
      secure: true,
      path: '/',
      httpOnly: true,
    },
  }))

  // Register API routes
  .route('/api', apiApp)

export default app

// Setup OpenAPI stuff
setupOpenAPI(app)
