import { clearUndefined } from '@namesmt/utils'
import { v } from 'convex/values'
import { internal } from '../../convex/_generated/api'
import { internalMutation } from '../../convex/_generated/server'
import { deleteInBatches } from '../shared/batch-delete'

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
    const { deleted, remaining } = await deleteInBatches(ctx, ctx.db.query('threads'))

    if (remaining)
      await ctx.scheduler.runAfter(0, internal.threads.clearAll, {})

    return { deleted, remaining }
  },
})

/**
 * Continues a thread deletion that ran out of transaction budget.
 *
 * `threads.del` deletes messages first and the thread row last; this finishes the job without
 * re-running the client's access check, because the caller already passed it and the thread is
 * half-gone — checking again would strand the leftovers.
 */
export const finishDelete = internalMutation({
  args: {
    threadId: v.id('threads'),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { deleted, remaining } = await deleteInBatches(
      ctx,
      ctx.db.query('messages')
        .withIndex('by_thread_and_timestamp', q => q.eq('threadId', args.threadId)),
    )

    if (remaining) {
      await ctx.scheduler.runAfter(0, internal.threads.finishDelete, args)
      return { deleted, remaining }
    }

    // The thread may already be gone if this is a retried pass.
    if (await ctx.db.get(args.threadId))
      await ctx.db.delete(args.threadId)

    return { deleted, remaining: 0 }
  },
})
