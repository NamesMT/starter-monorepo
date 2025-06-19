import type { AgentObject } from '@local/common/src/chat'
import type { LanguageModelV1 } from '@openrouter/ai-sdk-provider'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
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
      case 'gemini-2.0-flash-exp':
        return openrouter('google/gemini-2.0-flash-exp:free')
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
