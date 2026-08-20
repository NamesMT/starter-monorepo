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
