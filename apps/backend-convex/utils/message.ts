import type { PersonalContext } from '@local/common/src/chat'
import type { AssistantContent, ModelMessage, ToolResultPart } from 'ai'
import type { Doc } from '../convex/_generated/dataModel'

/**
 * Rebuilds a stored message for the model prompt.
 *
 * An assistant turn that invoked tools is replayed as `tool-call` parts followed by a
 * `tool` message carrying the matching results, so the model sees the same shape it
 * produced. Sending only the assistant's text would drop the tool context entirely, and
 * sending a `tool-call` without its result makes every provider reject the request.
 */
export function buildAiSdkMessage(message: Doc<'messages'>): ModelMessage[] {
  if (message.role === 'user')
    return [{ role: 'user', content: buildUserMessageContent(message) }]

  const content: AssistantContent = []

  if (message.content)
    content.push({ type: 'text', text: buildAssistantMessageContent(message) })

  const completed = (message.toolInvocations ?? []).filter(invocation => invocation.state !== 'call')
  if (completed.length) {
    for (const invocation of completed)
      content.push({ type: 'tool-call', toolCallId: invocation.id, toolName: invocation.name, input: invocation.input ?? {} })
  }

  // A tool call with no result is invalid input, so a turn with only calls is skipped.
  if (!content.length)
    return []

  const messages: ModelMessage[] = [{ role: 'assistant', content }]
  if (!completed.length)
    return messages

  messages.push({
    role: 'tool',
    content: completed.map<ToolResultPart>(invocation => ({
      type: 'tool-result',
      toolCallId: invocation.id,
      toolName: invocation.name,
      output: invocation.state === 'error'
        ? { type: 'error-text', value: invocation.error ?? 'Tool call failed' }
        : { type: 'json', value: (invocation.output ?? null) as never },
    })),
  })

  return messages
}

export function buildUserMessageContent({ _id, content, context }: Pick<
  Doc<'messages'>,
  '_id' | 'content' | 'context'
>) {
  const builtContent = [
    `<!-- MM START`,
    `MID: "${_id}"`,
    ...(context?.from ? [`Nickname: "${context.from}"`] : []),
    ...(context?.uid ? [`UID: "${context.uid}"`] : []),
    `MM END -->`,
    '',
  ]

  builtContent.push(content)

  return builtContent.join('\n')
}

export function buildAssistantMessageContent({ _id, content, model, provider, isStreaming }: Pick<
  Doc<'messages'>,
  '_id' | 'content' | 'model' | 'provider' | 'isStreaming'
>) {
  const builtContent = [
    `<!-- MM START`,
    `MID: "${_id}"`,
    `From: "${provider}/${model}"`,
    ...(isStreaming ? [`This message is still streaming, content is not finalized`] : []),
    `MM END -->`,
    '',
  ]

  builtContent.push(content)

  return builtContent.join('\n')
}

export function buildSystemPrompt(
  { model, modelSettings }: { model: string, modelSettings?: { traits?: string } },
  personalContext?: PersonalContext,
) {
  const aboutYou = personalContext?.aboutYou?.trim()
  const customInstructions = personalContext?.customInstructions?.trim()
  const traits = modelSettings?.traits?.trim()

  return [
    `You are "${model}", a distinct AI assistant in a multi-model, multi-user chat room.`,
    `Key rules:`,
    `1. Treat the latest user message as directed specifically to you`,
    `2. Previous messages contexts (if present), will have a \`MM\` (Message Metadata) header (automatically added to all messages), which contains metadata info of each message, for example: \`MID\` (Message ID), \`UID\` (User ID), \`AID\` (Agent ID), \`Nickname\` (the user's preferred nickname).`,
    `3. The \`MM\` header contains metadata only for context - you are not required to respond to it`,
    `4. IMPORTANT: NEVER respond / add / include the \`MM\` header yourself, it will be automatically added later.`,
    `5. Other models in the chat will have their own identities and responses will be clearly attributed`,
    `6. Maintain your own personality and knowledge base in all interactions`,
    ...(traits
      ? [
          ``,
          `Your persona and traits (this defines how you should behave):`,
          traits,
        ]
      : []),
    ...(aboutYou
      ? [
          ``,
          `About the user you are talking to:`,
          aboutYou,
        ]
      : []),
    ...(customInstructions
      ? [
          ``,
          `The user asked you to always follow these personal instructions:`,
          customInstructions,
        ]
      : []),
  ].join('\n')
}
