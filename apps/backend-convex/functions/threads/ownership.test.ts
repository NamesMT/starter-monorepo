import { describe, expect, it } from 'vitest'
import { canRotateAnonymousLockerKey, ownerMismatch } from './utils'

/**
 * Edit and regenerate destroy content, so they are owner-only — but "access" is not
 * "ownership": a share recipient legitimately sees the thread. These pin the boundary.
 */
describe('ownerMismatch', () => {
  it('allows the signed-in user who owns the thread', () => {
    expect(ownerMismatch({ userId: 'user_a' }, 'user_a', '')).toBe(false)
  })

  it('refuses a different signed-in user, even one who was shared the thread', () => {
    expect(ownerMismatch({ userId: 'user_a' }, 'user_b', '')).toBe(true)
  })

  it('refuses an anonymous caller on a user-owned thread', () => {
    expect(ownerMismatch({ userId: 'user_a' }, undefined, 'locker_1')).toBe(true)
  })

  it('allows the holder of an anonymous thread\'s key', () => {
    expect(ownerMismatch({}, undefined, 'locker_1')).toBe(false)
  })

  it('refuses an anonymous thread with no key', () => {
    // The client sends `getLockerKey(...) ?? ''`, so an empty string means "no key".
    expect(ownerMismatch({}, undefined, '')).toBe(true)
    expect(ownerMismatch({}, undefined, undefined)).toBe(true)
  })
})

/**
 * A guest thread's key is its only credential, so rotation must require proof of holding it —
 * and must not let a share recipient take the thread over.
 */
describe('canRotateAnonymousLockerKey', () => {
  it('allows the guest who currently holds the key', () => {
    expect(canRotateAnonymousLockerKey({ lockerKey: 'locker_old' }, 'locker_old')).toBe(true)
  })

  it('refuses a caller with no key or a different one', () => {
    expect(canRotateAnonymousLockerKey({ lockerKey: 'locker_old' }, undefined)).toBe(false)
    expect(canRotateAnonymousLockerKey({ lockerKey: 'locker_old' }, '')).toBe(false)
    expect(canRotateAnonymousLockerKey({ lockerKey: 'locker_old' }, 'locker_other')).toBe(false)
  })

  it('refuses when the thread has no key to prove', () => {
    expect(canRotateAnonymousLockerKey({}, undefined)).toBe(false)
    expect(canRotateAnonymousLockerKey({}, 'locker_any')).toBe(false)
  })
})
