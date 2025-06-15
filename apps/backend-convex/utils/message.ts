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
        content: message.content,
      }
    default:
      throw new Error(`Unknown message role: ${message.role}`)
  }
}

export function buildUserMessageContent({ content, context }: Pick<Doc<'messages'>, 'content' | 'context'>) {
  let builtContent = ''

  if (context && Object.keys(context)) {
    builtContent += `@--System Context Start@\n`

    if (context.from)
      builtContent += `From: "${context.from}"\n`

    if (context.uid)
      builtContent += `UID: "${context.uid}"\n`

    builtContent += `@System Context End--@\n\n`
  }

  builtContent += content

  return builtContent
}
