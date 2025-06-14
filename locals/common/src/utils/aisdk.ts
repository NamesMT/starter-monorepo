export async function simpleMessagesToString(messages: {
  id: string
  role: string
  content: string
}[]) {
  return messages.map(m => `@-- Message ID: ${m.id}\nRole: ${m.role}\nContent:\n${m.content}`).join('\n--@\n')
}
