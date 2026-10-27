import { describe, expect, it } from 'vitest'
import { generateLockerKey } from './locker-key'

/**
 * A thread's key is its only credential: whoever holds it can read, extend and delete an
 * anonymous thread. It used to be built in the browser as `locker_<timestamp>_<8 Math.random
 * chars>` — 48 bits from a non-cryptographic source, behind a timestamp the attacker already
 * knew.
 */
describe('generateLockerKey', () => {
  it('produces a URL-safe key that fits in a share link', () => {
    const key = generateLockerKey()

    expect(key).toMatch(/^locker_[\w-]+$/)
    expect(encodeURIComponent(key)).toBe(key)
  })

  it('carries far more entropy than the old 48-bit client key', () => {
    const key = generateLockerKey()
    // 32 random bytes, base64url: 43 characters of payload.
    expect(key.slice('locker_'.length)).toHaveLength(43)
  })

  it('never repeats', () => {
    const keys = new Set(Array.from({ length: 500 }, () => generateLockerKey()))

    expect(keys.size).toBe(500)
  })

  it('does not embed a timestamp, so a key cannot be correlated or guessed by age', () => {
    const a = generateLockerKey()
    const b = generateLockerKey()

    // The old format started with `locker_<ms>_`; a fixed-width random prefix cannot.
    expect(a.slice(0, 20)).not.toBe(b.slice(0, 20))
    expect(a).not.toMatch(/^locker_\d+_/)
  })
})
