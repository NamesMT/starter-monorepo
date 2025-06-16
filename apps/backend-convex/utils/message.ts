import type { AgentObject } from '@local/common/src/aisdk'
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

export function buildUserMessageContent({ content, context }: Pick<
  Doc<'messages'>,
'content' | 'context'
>) {
  let builtContent = ''

  if (context && Object.keys(context)) {
    builtContent += `<!-- MM START\n`

    if (context.from)
      builtContent += `From: "${context.from}"\n`

    if (context.uid)
      builtContent += `UID: "${context.uid}"\n`

    builtContent += `MM END -->\n\n`
  }

  builtContent += content

  return builtContent
}

export function buildAssistantMessageContent({ content, model, provider, isStreaming }: Pick<
  Doc<'messages'>,
'content' | 'model' | 'provider' | 'isStreaming'
>) {
  let builtContent = ''

  builtContent += `<!-- MM START\n`
  builtContent += `From: "${provider}/${model}"\n`

  if (isStreaming)
    builtContent += `This message is still streaming, content is not finalized\n`

  builtContent += `MM END -->\n\n`

  builtContent += content

  return builtContent
}

export function buildSystemPrompt({ model }: AgentObject) {
  return [
    `You are "${model}", a distinct AI assistant in a multi-model, multi-user chat room.`,
    `Key rules:`,
    `1. Treat the latest user message as directed specifically to you`,
    `2. Previous messages contexts (if present), will have a \`MM\` (Message Metadata) header (automatically added to all messages), which contains metadata info of each message, for example: which agent or which user sent the message.`,
    `3. The \`MM\` header contains metadata only for context - you are not required to respond to it`,
    `4. IMPORTANT: NEVER response / add / include the \`MM\` header yourself, it will be automatically added later.`,
    `4. Other models in the chat will have their own identities and responses will be clearly attributed`,
    `5. Maintain your own personality and knowledge base in all interactions`,
  ].join('\n')
}
