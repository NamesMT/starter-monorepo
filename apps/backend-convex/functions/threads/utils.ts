import type { GenericActionCtx, GenericMutationCtx, GenericQueryCtx, UserIdentity } from 'convex/server'
import type { Doc } from '../../convex/_generated/dataModel'
import { ConvexError } from 'convex/values'

export interface AssertThreadAccessArgs {
  thread: Doc<'threads'>
  lockerKey?: Doc<'threads'>['lockerKey']
  userIdentity?: UserIdentity | null
}
export async function assertThreadAccess(ctx: GenericActionCtx<any> | GenericQueryCtx<any> | GenericMutationCtx<any>, { thread, lockerKey, userIdentity }: AssertThreadAccessArgs) {
  // Authorize by lockerKey
  const authorizedByLockerKey = !!(lockerKey && thread.lockerKey === lockerKey)

  // Otherwise authorize by user identity (JWT)
  if (!authorizedByLockerKey) {
    userIdentity ??= await ctx.auth.getUserIdentity()

    if (userIdentity && thread.userId === userIdentity.subject)
      return

    if (lockerKey)
      console.error('"lockerKey" available but incorrect')

    throw new ConvexError('You are not authorized to view this thread')
  }
}

/**
 * Whether the caller is *not* the thread's owner.
 *
 * Distinct from `assertThreadAccess`, which asks "may you see this thread" — a share recipient
 * legitimately may. Ownership is the narrower question that destructive edits need: a
 * user-claimed thread belongs to that user, and an anonymous one to whoever holds its key.
 * The client sends `getLockerKey(...) ?? ''`, so `''` counts as "no key".
 */
export function ownerMismatch(
  thread: { userId?: string },
  userId: string | undefined,
  lockerKey: string | undefined,
) {
  if (thread.userId)
    return thread.userId !== userId

  return !lockerKey
}

/**
 * Whether the caller may replace an anonymous thread's share key.
 *
 * A guest has no identity, so the key it already holds is the only proof available — and it
 * already grants every other right over the thread. A signed-in owner is handled separately
 * by the caller: this only covers the key-held case.
 */
export function canRotateAnonymousLockerKey(
  thread: { lockerKey?: string },
  currentLockerKey: string | undefined,
) {
  return !!thread.lockerKey && currentLockerKey === thread.lockerKey
}
