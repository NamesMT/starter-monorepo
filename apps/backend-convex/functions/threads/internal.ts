import { clearUndefined } from '@namesmt/utils'
import { v } from 'convex/values'
import { internalMutation } from '../../convex/_generated/server'

export const updateThreadInfo = internalMutation({
  args: {
    threadId: v.id('threads'),
    title: v.optional(v.string()),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new Error('Thread not found')

    await ctx.db.patch(args.threadId, {
      ...clearUndefined({
        title: args.title,
        timestamp: args.timestamp,
      }),
    })
  },
})

export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.db.query('threads').collect()
    await Promise.all(threads.map(thread => ctx.db.delete(thread._id)))
  },
})
