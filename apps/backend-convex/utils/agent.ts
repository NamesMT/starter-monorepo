import type { AgentObject } from '@local/common/src/aisdk'
import type { LanguageModelV1 } from '@openrouter/ai-sdk-provider'
import { createOpenRouter, openrouter } from '@openrouter/ai-sdk-provider'

export function getAgentModel({ provider, model, apiKey }: AgentObject): LanguageModelV1 {
  if (provider === 'hosted') {
    switch (model) {
      case 'qwen3-32b':
        return openrouter('qwen/qwen3-32b:free')
      case 'deepseek-v3':
        return openrouter('deepseek/deepseek-chat-v3-0324:free')
      case 'devstral-small-2505':
        return openrouter('mistralai/devstral-small:free')
      case 'llama-4-scout':
        return openrouter('meta-llama/llama-4-scout:free')
      default:
        throw new Error(`Invalid model for hosted provider`)
    }
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
