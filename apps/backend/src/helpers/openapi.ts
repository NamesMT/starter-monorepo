/**
 * Pieces of the OpenAPI document that both the spec generator and the auth middleware need.
 *
 * Kept apart from `#src/openAPI.js` so the middleware does not import the route-registration
 * module just to reference a schema name.
 */

/** Security scheme id for the sealed session cookie (see {@link securitySchemes}). */
export const BACKEND_AUTH_SCHEME = 'backendAuthCookie'

export const securitySchemes = {
  [BACKEND_AUTH_SCHEME]: {
    type: 'apiKey' as const,
    in: 'cookie' as const,
    name: 'backend-auth',
    description:
      'Sealed, `HttpOnly` session cookie written by the sign-in flow. '
      + 'There is no bearer-token or API-key authentication: a client must keep the cookie jar.',
  },
}

/** The body shape every JSON error response uses (see `#src/helpers/error.js`). */
export const errorSchema = {
  type: 'object' as const,
  required: ['message', 'code'],
  properties: {
    message: { type: 'string' as const, description: 'Human-readable, safe to display.' },
    code: { type: 'string' as const, description: 'Stable machine code, e.g. `DetailedError` or `HTTPException`.' },
    detail: { description: 'Optional structured context; for validation errors, an array of issues.' },
  },
}

/** An error response object, referencing the shared `Error` schema. */
export function errorResponse(description: string) {
  return {
    description,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  }
}
