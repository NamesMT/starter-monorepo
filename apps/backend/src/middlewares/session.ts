import type { Context } from 'hono'
import { CookieStore, MemoryStore, Session, sessionMiddleware } from 'hono-sessions'

/**
 * `Cookies`-based manager by `hono-sessions`.
 *
 * Default configuration uses `CookieStore` and just works out of the box.
 */
export async function cookieSession() {
  return sessionMiddleware({
    store: new CookieStore(),
    encryptionKey: 'password_at_least_32_characters!', // Required for CookieStore, recommended for others
    expireAfterSeconds: 900, // Expire session after 15 minutes of inactivity
    cookieOptions: {
      sameSite: 'None', // Setting to None to support usecase of different domains for backend and frontend
      secure: true, // Enforce HTTPS for cookie, required for sameSite: 'None'
      path: '/', // Required for this library to work properly
      httpOnly: true, // Recommended to avoid XSS attacks
    },
  })
}

// TODO: Maybe turn this middleware into a package and fully document it.
/**
 * `HTTP header`-based manager powered by `hono-sessions`'s internal code.
 *
 * Default configuration uses `Authorization` header and `Bearer` prefix,
 *
 * As well as an example `JWT` resolver.
 *
 * Requires a store to be configured to be production-ready, default is using `MemoryStore` for demo.
 *
 * You also need to setup a way to create a session token for the client,
 *
 * A demo is available at `/apps/frontend/app/plugins/rpcApi.ts`,
 * You need to uncomment it, which it then simply creates the token client-side.
 *
 * WIP: currently this manager doesn't fully work yet, see below for more details, help is welcome!.
 *
 * Blocking tasks until fully working:
 *
 * - [x] Ability to init a session when client enters the login endpoint directly, which we can't set a Header through frontend.
 *   - > All Kinde standard authentication flow demo redirect the client to the backend login endpoint directly and then redirected to sign in with Kinde's SSO, which we can't set a Header through frontend.
 *   - [ ] Solution 1: Maybe we could call the login API from frontend first instead of directly, then redirect to the returned URL?, I think it's possible.
 *   - [x] Solution 2: Allowing input through query param?
 *     - See `allowQuery` and `queryName` options.
 * - [ ] Ability to process the callback endpoint (saving the authenticated state/tokens to the associated session).
 *   Kinde redirects back to the callback endpoint after the client signs in, and doesn't allow us to attach some custom data into it's payload, what to do next?.
 *   - [ ] Solution 1: create a `state` id prior to redirect to Kinde then load from it, this requires an additional storage interface, see [reference](https://docs.kinde.com/authenticate/custom-configurations/redirect-users/#use-the-state-parameter).
 *   - [ ] Solution 2: Just put the session token into `state` then read it, no additional store needed compare to s1, how safe is it?
 *   - [ ] Solution 3: Save the session token into (HttpOnly) cookies, then read it?
 */
export async function headerSession(options: Record<string, any> = {}) {
  const { HTTPException } = await import('hono/http-exception')
  const { createMiddleware } = await import('hono/factory')

  const TOKEN_RE = '[\\w.~+/-]+=*'

  const {
    headerName = 'Authorization',
    headerPrefix = 'Bearer',
    required = false, // If true, throws an error if the token is not present
    allowQuery = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/callback',
    ],
    queryName = 'stk',
    resolver = await _jwtResolver(),
    store = new MemoryStore(),
  } = options

  return createMiddleware(async (c, next) => {
    const headerValue = c.req.header(headerName)
    let inputValue = ''

    // If the token is not present in the header, we check if it's present in the query string
    if (!headerValue) {
      const queryValue = c.req.query(queryName)
      if (!(
        queryValue && allowQuery && allowQuery.some((v: string | RegExp) => typeof v === 'string' ? v === c.req.path : v.test(c.req.path))
      )) {
        if (required)
          throw new HTTPException(400, { message: 'Session token required' })

        // if there's no token in the header and the query string, and is not required, we continue to the next middleware
        return await next()
      }

      inputValue = queryValue
    }
    else {
      const match = new RegExp(`^${headerPrefix} +(${TOKEN_RE}) *$`).exec(headerValue)
      if (!match) {
        // Invalid Request
        const res = new Response('Bad Request', {
          status: 400,
          headers: {
            'WWW-Authenticate': `${headerPrefix} error="invalid_request"`,
          },
        })
        throw new HTTPException(400, { res })
      }

      inputValue = match[1]
    }

    const sessionId = await resolver(inputValue, c)
    if (!sessionId) {
      // Invalid Token
      const res = new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': `${headerPrefix} error="invalid_token"`,
        },
      })
      throw new HTTPException(401, { res })
    }

    const session = new Session()
    let sessionData = await store.getSessionById(sessionId)
    if (!sessionData)
      await _newSession()

    // By now sessionData should be available, if for unknown reason it's not, we should throw
    if (!sessionData)
      throw new HTTPException(500, { message: 'Unable to create session' })

    session.setCache(sessionData)

    if (!session.sessionValid()) {
      await store.deleteSession(sessionId)
      await _newSession()
      session.setCache(sessionData)
    }

    session.updateAccess()

    c.set('session', session)

    await next()

    const shouldDelete = session.getCache()._delete

    if (shouldDelete) {
      await store.deleteSession(sessionId)
    }

    // We skip session data persistence if it was just deleted.
    if (!shouldDelete) {
      await store.persistSessionData(sessionId, session.getCache())
    }

    async function _newSession() {
      const defaultData = {
        _data: {},
        _expire: null,
        _delete: false,
        _accessed: null,
      }

      await store.createSession(sessionId, defaultData)
      sessionData = await store.getSessionById(sessionId)
    }
  })
}

async function _jwtResolver() {
  const { verify } = await import('hono/jwt')

  return async (value: string, c: Context) => {
    const payload = await verify(value, 'top-secret')
    c.set('jwtPayload', payload)

    return payload.id as string
  }
}
