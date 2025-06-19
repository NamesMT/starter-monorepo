import type { AgentObject } from '@local/common/src/chat'
import type { Doc } from '../convex/_generated/dataModel'

export interface BuiltMessage {
  role: 'user' | 'assistant'
  content: string
}
export function buildAiSdkMessage(message: Doc<'messages'>): BuiltMessage {
  switch (message.role) {
    case 'user':
      return {
        role: 'user',
        content: buildUserMessageContent(message),
      }
    case 'assistant':
      return {
        role: 'assistant',
        content: buildAssistantMessageContent(message),
      }
    default:
      throw new Error(`Unknown message role: ${message.role}`)
  }
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

export function buildSystemPrompt({ model }: AgentObject) {
  return [
    `You are "${model}", a distinct AI assistant in a multi-model, multi-user chat room.`,
    `Key rules:`,
    `1. Treat the latest user message as directed specifically to you`,
    `2. Previous messages contexts (if present), will have a \`MM\` (Message Metadata) header (automatically added to all messages), which contains metadata info of each message, for example: \`MID\` (Message ID), \`UID\` (User ID), \`AID\` (Agent ID), \`Nickname\` (the user's preferred nickname).`,
    `3. The \`MM\` header contains metadata only for context - you are not required to respond to it`,
    `4. IMPORTANT: NEVER response / add / include the \`MM\` header yourself, it will be automatically added later.`,
    `4. Other models in the chat will have their own identities and responses will be clearly attributed`,
    `5. Maintain your own personality and knowledge base in all interactions`,
  ].join('\n')
}
