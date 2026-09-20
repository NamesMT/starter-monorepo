import { ConvexError, v } from 'convex/values'
import { mutation } from '../../convex/_generated/server'
import { assertThreadAccess } from '../threads/utils'

/**
 * Issues a short-lived Convex file storage upload URL for a thread the caller can access.
 *
 * The client uploads the raw bytes to this URL, receives a `storageId`, and then passes
 * that id (plus file metadata) to the chat stream endpoint.
 */
export const generateUploadUrl = mutation({
  args: {
    threadId: v.id('threads'),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new ConvexError('Thread not found')

    if (thread.frozen)
      throw new ConvexError(`Can't attach files to a frozen thread`)

    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey })

    return await ctx.storage.generateUploadUrl()
  },
})
