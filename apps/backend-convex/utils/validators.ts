import { v } from 'convex/values'

/**
 * Validator for a message part, shared by the schema and the internal mutations so the
 * persisted shape and what those mutations accept cannot drift apart.
 *
 * Mirrors `ChatPart` in `@local/common/src/chat`, which is what the apps use. Display parts
 * carry no `state`: whether a reply is still streaming is `message.isStreaming`, and keeping a
 * second copy of it in the parts meant the final write had to win a race against Convex
 * tearing the action down as the response ended.
 */
export const partValidator = v.union(
  v.object({
    type: v.literal('text'),
    text: v.string(),
  }),
  v.object({
    type: v.literal('reasoning'),
    text: v.string(),
  }),
  v.object({
    type: v.literal('dynamic-tool'),
    toolName: v.string(),
    toolCallId: v.string(),
    state: v.union(
      v.literal('input-streaming'),
      v.literal('input-available'),
      v.literal('output-available'),
      v.literal('output-error'),
    ),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    errorText: v.optional(v.string()),
  }),
  v.object({ type: v.literal('step-start') }),
)
