import type { AgentObject } from '@local/common/src/aisdk'
import type { LanguageModelV1 } from '@openrouter/ai-sdk-provider'
import { createOpenRouter, openrouter } from '@openrouter/ai-sdk-provider'
import { ConvexError } from 'convex/values'

export function getAgentModel({ provider, model, apiKey }: AgentObject): LanguageModelV1 {
  if (provider === 'hosted') {
    if (!['qwen3-32b', 'deepseek-v3'].includes(model))
      throw new ConvexError('Invalid model for hosted provider')

    if (model === 'qwen3-32b')
      model = 'qwen/qwen3-32b:free'

    if (model === 'deepseek-v3')
      model = 'deepseek/deepseek-chat-v3-0324:free'

    return openrouter(model)
  }
  else {
    return (() => {
      switch (provider) {
        case 'openrouter':
          return createOpenRouter({ apiKey })(model)
        default:
          throw new Error(`Unknown provider: ${provider}`)
      }
    })()
  }
}
