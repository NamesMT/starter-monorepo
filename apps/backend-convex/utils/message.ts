import type { ChatPart, PersonalContext } from '@local/common/src/chat'
import type { ModelMessage, UIMessage } from 'ai'
import type { Doc } from '../convex/_generated/dataModel'
import { convertToModelMessages } from 'ai'

/**
 * Stored parts deliberately mirror the AI SDK's UI-message parts, so this is a narrow cast
 * rather than a translation; the two must stay in step.
 */
function toUiPart(part: ChatPart): UIMessage['parts'][number] {
  return part as UIMessage['parts'][number]
}

/** The `MM` header the system prompt documents, so the model can attribute each message. */
export function buildMetadataHeader(message: Pick<Doc<'messages'>, '_id' | 'role' | 'provider' | 'model' | 'isStreaming' | 'context'>) {
  const lines = [`<!-- MM START`, `MID: "${message._id}"`]

  if (message.role === 'user') {
    if (message.context?.from)
      lines.push(`Nickname: "${message.context.from}"`)
    if (message.context?.uid)
      lines.push(`UID: "${message.context.uid}"`)
  }
  else {
    lines.push(`From: "${message.provider}/${message.model}"`)
    if (message.isStreaming)
      lines.push(`This message is still streaming, content is not finalized`)
  }

  lines.push(`MM END -->`, '')

  return lines.join('\n')
}

/**
 * The message's parts, falling back to the legacy `content`/`toolInvocations` fields.
 *
 * Rows written before the parts schema still exist until `messages:migrateToParts` runs, and
 * a few code paths (a legacy row loaded into a live stream) can still hold the old shape.
 */
export function resolveMessageParts(message: Pick<Doc<'messages'>, 'parts' | 'content' | 'toolInvocations'>): ChatPart[] {
  if (message.parts?.length)
    return message.parts as ChatPart[]

  const parts: ChatPart[] = []

  if (message.content)
    parts.push({ type: 'text', text: message.content })

  for (const invocation of message.toolInvocations ?? []) {
    parts.push({
      type: 'dynamic-tool',
      toolCallId: invocation.id,
      toolName: invocation.name,
      state: invocation.state === 'result'
        ? 'output-available'
        : invocation.state === 'error' ? 'output-error' : 'input-available',
      input: invocation.input,
      output: invocation.output,
      errorText: invocation.error,
    })
  }

  return parts
}

/**
 * Rebuilds a stored message as a UI message, prefixing the `MM` metadata header onto its
 * first text part.
 *
 * Tool calls keep their position relative to text and reasoning, which is what lets
 * `convertToModelMessages` pair each call with its own result.
 */
export function toUiMessage(message: Doc<'messages'>, header?: string): UIMessage {
  const parts = resolveMessageParts(message).map(toUiPart)

  if (header) {
    const firstText = parts.findIndex(part => part.type === 'text')

    if (firstText === -1)
      parts.unshift({ type: 'text', text: header })
    else
      parts[firstText] = { type: 'text', text: `${header}\n${(parts[firstText] as { text: string }).text}` }
  }

  return { id: message._id, role: message.role, parts }
}

/**
 * The history a regenerated reply should answer.
 *
 * Everything strictly before the target, because regenerating rewrites that reply's answer to
 * the turn that prompted it. Passing the later messages too would let the model answer the
 * newest message instead — regenerating the first reply in a two-turn thread would otherwise
 * produce a reply to the second question.
 */
export function historyBeforeMessage<T extends { _id: string }>(history: readonly T[], messageId: string): T[] {
  const index = history.findIndex(message => message._id === messageId)

  return index === -1 ? [...history] : history.slice(0, index)
}

/**
 * Builds the model prompt from stored messages.
 *
 * Uses the SDK's own converter rather than hand-rolling the mapping: it owns the
 * tool-call/tool-result pairing rules, and a call that never produced a result is dropped
 * by `ignoreIncompleteToolCalls` instead of being sent as invalid input.
 */
export async function buildModelMessages(messages: readonly Doc<'messages'>[]): Promise<ModelMessage[]> {
  const uiMessages = messages.map(message => toUiMessage(message, buildMetadataHeader(message)))

  return await convertToModelMessages(uiMessages, { ignoreIncompleteToolCalls: true })
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
