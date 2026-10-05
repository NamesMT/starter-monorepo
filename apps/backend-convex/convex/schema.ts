import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { partValidator } from '../utils/validators'

const tasksTables = {
  tasks: defineTable({
    text: v.string(),
  }),
}

/** Metadata for a file stored in Convex file storage and attached to a message. */
const attachmentValidator = v.object({
  storageId: v.id('_storage'),
  name: v.string(),
  type: v.string(),
  size: v.number(),
})

const aiChatTables = {
  threads: defineTable({
    // The initial session ID of the user that created the thread, warning: also used as "password" to list threads for now.
    sessionId: v.string(),
    title: v.string(),
    timestamp: v.number(),
    userId: v.optional(v.string()),
    lockerKey: v.optional(v.string()),
    parentThread: v.optional(v.id('threads')),
    frozen: v.optional(v.boolean()),
  })
    .index('by_user_id', ['userId'])
    .index('by_user_id_and_timestamp', ['userId', 'timestamp'])
    .index('by_session_id', ['sessionId']),

  messages: defineTable({
    threadId: v.id('threads'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    timestamp: v.number(),
    /**
     * Ordered content of the message. An assistant reply interleaves text, reasoning and tool
     * calls, so it is stored as the AI SDK's part list rather than a flat string plus a
     * sibling tool array, which could not express what happened where.
     *
     * Text is read via `getMessageText` in `@local/common`.
     */
    parts: v.array(partValidator),
    context: v.optional(v.object({
      from: v.optional(v.string()),
      uid: v.optional(v.string()),
    })),
    streamId: v.optional(v.string()),
    isStreaming: v.optional(v.boolean()),
    /**
     * Set by a `stop` request while the reply is still streaming. The running action polls
     * this and stops itself: Convex actions have no abort signal, so cancellation has to be
     * cooperative (the pattern Convex documents for stopping a generation across clients).
     */
    cancelRequested: v.optional(v.boolean()),
    provider: v.string(),
    model: v.string(),
    /**
     * Files attached to this message. Only user messages currently carry attachments,
     * the bytes live in Convex file storage and are resolved to URLs by queries.
     */
    attachments: v.optional(v.array(attachmentValidator)),
  })
    .index('by_thread_and_timestamp', ['threadId', 'timestamp'])
    .index('by_stream_id', ['streamId']),
}

export default defineSchema({
  ...tasksTables,
  ...aiChatTables,
})
