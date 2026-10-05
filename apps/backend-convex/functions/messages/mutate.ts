import { v } from 'convex/values'
import { mutation } from '../../convex/_generated/server'
import { assertThreadAccess } from '../threads/utils'

/** A message as far as stopping cares about it. */
export interface StoppableMessage {
  isStreaming?: boolean
}

/**
 * The patch that finalizes a stopped reply, or `null` when there is nothing to stop.
 *
 * Pure so it can be tested without a deployment, and so the "what does stopping write"
 * decision lives in one place.
 */
export function stopPatch(message: StoppableMessage): { cancelRequested: true, isStreaming: false, streamId: undefined } | null {
  if (!message.isStreaming)
    return null

  return { cancelRequested: true, isStreaming: false, streamId: undefined }
}

/**
 * Stops a streaming reply.
 *
 * Finalizes the message here rather than leaving it to the generating action: aborting the
 * model call ends the HTTP response, and Convex tears the action down before its post-abort
 * `onEnd` work is guaranteed to finish. Leaving `isStreaming` set made the client poll a
 * reply that no longer existed. The text produced so far is kept.
 *
 * `cancelRequested` is what the action polls to stop burning tokens; it reads it by message
 * id, so clearing `streamId` here does not hide the request.
 *
 * A late `updateStreamingMessage` from the action only patches the content, so it cannot
 * resurrect the streaming flag.
 */
export const requestStop = mutation({
  args: {
    messageId: v.id('messages'),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)
    if (!message)
      return false

    const thread = await ctx.db.get(message.threadId)
    if (!thread)
      return false

    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey })

    const patch = stopPatch(message)
    if (!patch)
      return false

    await ctx.db.patch(args.messageId, patch)

    return true
  },
})
