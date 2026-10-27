import type { UserAuthState } from '@local/common/src/types/user'
import process from 'node:process'
import { beforeEach, describe, expect, it } from 'vitest'

process.env.WORKOS_CLIENT_ID ||= 'client_test'
process.env.WORKOS_API_KEY ||= 'sk_test'

const { sessionTokenMismatch } = await import('#src/api/auth/$.middleware.js')

const CLIENT_ID = process.env.WORKOS_CLIENT_ID!

function session(overrides: Partial<UserAuthState> = {}): UserAuthState {
  return {
    id: 'user_ours',
    firstName: 'A',
    fullName: 'A A',
    email: 'a@example.com',
    private: {
      accessToken: 'token',
      refreshToken: 'refresh',
      sessionId: 'session_ours',
    },
    ...overrides,
  }
}

function payload(overrides: Record<string, any> = {}) {
  return {
    sub: 'user_ours',
    sid: 'session_ours',
    iss: `https://api.workos.com/user_management/${CLIENT_ID}`,
    client_id: CLIENT_ID,
    ...overrides,
  }
}

/**
 * The cookie is the session, the token is the proof. Without these checks a cookie naming any
 * user passes as long as it carries *some* validly signed token — which is exactly what someone
 * can build, since the cookie secret falls back to a library default.
 */
describe('sessionTokenMismatch', () => {
  beforeEach(() => {
    process.env.WORKOS_CLIENT_ID = CLIENT_ID
  })

  it('accepts a token that belongs to the session it was presented with', () => {
    expect(sessionTokenMismatch(payload(), session())).toBeUndefined()
  })

  it('rejects a token issued for a different user (forged-cookie impersonation)', () => {
    expect(sessionTokenMismatch(payload({ sub: 'user_attacker' }), session())).toMatch(/subject/)
  })

  it('rejects a token from a different session of the same user', () => {
    expect(sessionTokenMismatch(payload({ sid: 'session_other' }), session())).toMatch(/session/)
  })

  it('rejects a token issued for another WorkOS client', () => {
    expect(sessionTokenMismatch(payload({ client_id: 'client_other' }), session())).toMatch(/different WorkOS client/)
  })

  it('rejects a token whose issuer is a different WorkOS environment', () => {
    expect(sessionTokenMismatch(payload({ client_id: undefined, iss: 'https://api.workos.com/user_management/client_other' }), session())).toMatch(/issuer/)
  })

  it('tolerates a token that omits sid and client_id, as long as the subject matches', () => {
    // WorkOS always issues `sid`, but binding must not break if a template omits it.
    expect(sessionTokenMismatch({ sub: 'user_ours' }, session())).toBeUndefined()
  })

  it('rejects a token with no subject at all', () => {
    expect(sessionTokenMismatch({}, session())).toMatch(/subject/)
  })
})
