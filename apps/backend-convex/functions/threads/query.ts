import { ConvexError, v } from 'convex/values'
import { query } from '../../convex/_generated/server'
import { assertThreadAccess } from './utils'

// TODO: maybe allow threads sharing of a whole account or remove userId arg
export const listByUser = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = args
    const userIdentity = await ctx.auth.getUserIdentity()

    if (!userId && !userIdentity)
      throw new ConvexError('This endpoint is only for authenticated users')

    if (userId && userId !== userIdentity?.subject)
      throw new ConvexError('You are not authorized to list threads of this user')

    return await ctx.db
      .query('threads')
      .withIndex('by_user_id_and_timestamp', q => q.eq('userId', userId ?? userIdentity?.subject))
      .order('desc')
      .collect()
  },
})

export const listBySessionId = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('threads')
      .withIndex('by_session_id', q => q.eq('sessionId', args.sessionId))
      .order('desc')
      .collect()
      .then(threads => threads.map(t => ({ ...t, lockerKey: undefined })))
  },
})

export const get = query({
  args: {
    threadId: v.id('threads'),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new ConvexError('Thread not found')

    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey })

    return thread
  },
})
