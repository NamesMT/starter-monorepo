export async function simpleMessagesToString(messages: {
  id: string
  role: string
  content: string
}[]) {
  return messages.map(m => `@-- Message ID: ${m.id}\nRole: ${m.role}\nContent:\n${m.content}`).join('\n--@\n')
}

export interface AgentObject {
  provider: string
  model: string
  modelSettings?: CommonProviderAgentsSettings['models'][string]
  apiKey?: string
}

export interface AgentsSettings {
  providers: {
    /**
     * Note that `hosted` will not be accessible here and not persisted to IDB
     */
    [name: string]: CommonProviderAgentsSettings
  }
  /**
   * A special string in format of `provider/model`, `model` could be empty
   * so that the default model is always used (in the future where we add multi-acounts settings link)
   *
   * Note that `selectedAgent` is not the source of truth whether
   * which model is used, bad config will fallback to default hosted model.
   */
  selectedAgent: string
}

export interface HostedProvider extends CommonProviderAgentsSettings {
  enabled: true
  default: string
}

export interface CommonProviderAgentsSettings {
  enabled: boolean
  apiKey?: string
  models: {
    [key: string]: {
      enabled: boolean
      attachments?: string[]
    }
  }
  default?: string
}
