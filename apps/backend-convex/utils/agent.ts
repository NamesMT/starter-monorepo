import type { LanguageModelV2 } from '@ai-sdk/provider'
import type { AgentObject } from '@local/common/src/chat'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter, openrouter } from '@openrouter/ai-sdk-provider'

export function getAgentModel({ provider, model, apiKey }: AgentObject): LanguageModelV2 {
  if (provider === 'hosted') {
    switch (model) {
      case 'openrouter/free':
        return openrouter('openrouter/free')
      default:
        throw new Error(`Invalid model for hosted provider`)
    }
  }
  else {
    return (() => {
      switch (provider) {
        case 'openrouter':
          return createOpenRouter({ apiKey })(model)
        case 'openai':
          return createOpenAI({ apiKey })(model)
        case 'google':
          return createGoogleGenerativeAI({ apiKey })(model)
        case 'anthropic':
          return createAnthropic({ apiKey })(model)
        case 'groq':
          return createGroq({ apiKey })(model)
        default:
          throw new Error(`Unknown provider: ${provider}`)
      }
    })()
  }
}
