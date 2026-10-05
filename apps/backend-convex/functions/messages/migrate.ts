import { v } from 'convex/values'
import { internal } from '../../convex/_generated/api'
import { internalMutation } from '../../convex/_generated/server'
import { resolveMessageParts } from '../../utils/message'

/**
 * Backfills `parts` on rows written before the parts schema, then drops the legacy `content`
 * and `toolInvocations` fields.
 *
 * Batched, and re-schedules itself, because patching a whole table in one mutation can exceed
 * Convex's transaction limits. Run it once (`convex run messages:migrateToParts`) and it
 * drains on its own.
 */
export const migrateToParts = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100

    const all = await ctx.db.query('messages').collect()
    const legacy = all.filter(message => !message.parts?.length && (message.content || message.toolInvocations))

    for (const message of legacy.slice(0, limit)) {
      await ctx.db.patch(message._id, {
        parts: resolveMessageParts(message),
        content: undefined,
        toolInvocations: undefined,
      })
    }

    const remaining = Math.max(0, legacy.length - limit)
    if (remaining > 0)
      await ctx.scheduler.runAfter(0, internal.messages.migrateToParts, { limit })

    return { migrated: Math.min(legacy.length, limit), remaining }
  },
})

/**
 * Strips the obsolete per-part `state` that was briefly persisted.
 *
 * It is UI-transient: whether a reply is still streaming is `message.isStreaming`, and storing
 * a second copy meant the final write raced Convex tearing the action down. The schema still
 * tolerates the field so pre-existing rows deploy, so this clears them.
 */
export const dropPartState = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100

    const all = await ctx.db.query('messages').collect()
    const stale = all.filter(message =>
      message.parts?.some(part => 'state' in part && part.type !== 'dynamic-tool'))

    for (const message of stale.slice(0, limit)) {
      await ctx.db.patch(message._id, {
        parts: message.parts!.map((part) => {
          if (part.type !== 'text' && part.type !== 'reasoning')
            return part

          const { state, ...rest } = part

          return rest
        }),
      })
    }

    const remaining = Math.max(0, stale.length - limit)
    if (remaining > 0)
      await ctx.scheduler.runAfter(0, internal.messages.dropPartState, { limit })

    return { migrated: Math.min(stale.length, limit), remaining }
  },
})
