import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const tasksTables = {
  tasks: defineTable({
    text: v.string(),
  }),
}

const aiChatTables = {
  threads: defineTable({
    // The initial session ID of the user that created the thread, warning: also used as "password" to list threads for now.
    sessionId: v.string(),
    title: v.string(),
    timestamp: v.number(),
    userId: v.optional(v.string()),
    lockerKey: v.optional(v.string()),
    branchedFrom: v.optional(v.id('messages')),
    parentThread: v.optional(v.id('threads')),
    frozen: v.optional(v.boolean()),
  })
    .index('by_user_id', ['userId'])
    .index('by_user_id_and_timestamp', ['userId', 'timestamp'])
    .index('by_session_id', ['sessionId'])
    .index('by_timestamp', ['timestamp']),

  messages: defineTable({
    threadId: v.id('threads'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    timestamp: v.number(),
    content: v.string(),
    context: v.optional(v.object({
      from: v.optional(v.string()),
      uid: v.optional(v.string()),
    })),
    streamId: v.optional(v.string()),
    isStreaming: v.optional(v.boolean()),
    provider: v.string(),
    model: v.string(),
  })
    .index('by_thread', ['threadId'])
    .index('by_thread_and_timestamp', ['threadId', 'timestamp'])
    .index('by_timestamp', ['timestamp'])
    .index('by_stream_id', ['streamId']),
}

export default defineSchema({
  ...tasksTables,
  ...aiChatTables,
})
