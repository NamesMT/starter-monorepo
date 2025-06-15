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
    builtContent += `### System context start\n`

    if (context.from)
      builtContent += `From: "${context.from}"\n`

    if (context.uid)
      builtContent += `UID: "${context.uid}"\n`

    builtContent += `### System context end\n---\n\n`
  }

  builtContent += content

  return builtContent
}

export function buildAssistantMessageContent({ content, model, provider, isStreaming }: Pick<
  Doc<'messages'>,
'content' | 'model' | 'provider' | 'isStreaming'
>) {
  let builtContent = ''

  builtContent += `### System context start\n`
  builtContent += `From: "${provider}/${model}"\n`

  if (isStreaming)
    builtContent += `This message is still streaming, content is not finalized\n`

  builtContent += `### System context end\n---\n\n`

  builtContent += content

  return builtContent
}
