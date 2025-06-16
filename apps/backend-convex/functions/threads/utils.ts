import type { UserIdentity } from 'convex/server'
import type { Doc } from '../../convex/_generated/dataModel'
import type { GenericCtx } from '../../convex/_generated/server'
import { ConvexError } from 'convex/values'

export interface AssertThreadAccessArgs {
  thread: Doc<'threads'>
  lockerKey?: Doc<'threads'>['lockerKey']
  userIdentity?: UserIdentity | null
}
export async function assertThreadAccess(ctx: GenericCtx, { thread, lockerKey, userIdentity }: AssertThreadAccessArgs) {
  // Check permission by lockerKey
  if (lockerKey && thread.lockerKey === lockerKey) {
    ;
  }
  // Check permission by other means (JWT)
  else {
    userIdentity ??= await ctx.auth.getUserIdentity()
    if (!userIdentity || (thread.userId !== userIdentity.subject)) {
      if (lockerKey)
        console.error(`"lockerKey" available but incorrect`)
      throw new ConvexError('You are not authorized to view this thread')
    }
  }
}
