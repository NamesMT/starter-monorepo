import type { AgentObject } from '@local/common/src/chat'
import type { LanguageModel } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogle } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
import { DEFAULT_ATTACHMENT_ACCEPT } from '@local/common/src/chat'
import { createOpenRouter, openrouter } from '@openrouter/ai-sdk-provider'
import { getErrorMessage, normalizePossibleSDKError } from './error'

export function getAgentModel({ provider, model, apiKey }: AgentObject): LanguageModel {
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
          return createGoogle({ apiKey })(model)
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

/**
 * The attachment capabilities the server enforces for a given model.
 *
 * This is the authoritative allow-list: the client uses the user's per-model
 * settings for UX, but the server never trusts those. Extend this map when a
 * hosted model gains different capabilities.
 */
export function getModelAttachmentAccept({ provider, model }: Pick<AgentObject, 'provider' | 'model'>): readonly string[] {
  if (provider === 'hosted') {
    switch (model) {
      case 'openrouter/free':
        return ['image/*', 'application/pdf']
      default:
        return []
    }
  }

  // BYOK providers: we don't ship a per-model capability registry, so fall back to
  // the conservative shared default. Unknown models are not trusted with more.
  return DEFAULT_ATTACHMENT_ACCEPT
}

/**
 * Wraps a language model so a provider failure that happens before any output is
 * produced becomes normal assistant text instead of a thrown error.
 *
 * AI SDK v7 reacts to a zero-output stream by rejecting its internal result promises
 * with `NoOutputGeneratedError`. Convex treats that rejection as fatal and tears down
 * the HTTP action mid-response, so the client only received the `start` chunk and the
 * message stayed empty. Emitting the failure as text keeps the stream well-formed, lets
 * it finish normally, and still surfaces the error to the user.
 *
 * Only the model call itself is wrapped: errors raised *after* the provider starts
 * streaming already leave partial output behind, which the AI SDK handles gracefully.
 */
export function withProviderErrorAsText(model: LanguageModel): LanguageModel {
  if (typeof model === 'string')
    return model

  const base = model as any
  const doStream = base.doStream.bind(base)

  const wrapped = Object.create(
    Object.getPrototypeOf(base),
    Object.getOwnPropertyDescriptors(base),
  ) as any

  wrapped.doStream = async (options: unknown) => {
    try {
      return await doStream(options)
    }
    catch (error) {
      console.error('[chat] model call failed before producing output:', error)
      return createErrorTextStream(error)
    }
  }

  return wrapped as LanguageModel
}

/**
 * Synthesizes a minimal language-model stream that reports a provider failure as text,
 * so the AI SDK records a finished step instead of failing with no output.
 */
function createErrorTextStream(error: unknown) {
  const normalized = normalizePossibleSDKError(error)
  const message = getErrorMessage(normalized) ?? 'Unknown error'
  const text = `Error encountered, stream stopped: ${normalized?.name ? `[${normalized.name}]: ` : ''}${message}`
  const id = 'provider-error'

  return {
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({ type: 'stream-start', warnings: [] })
        controller.enqueue({ type: 'text-start', id })
        controller.enqueue({ type: 'text-delta', id, delta: text })
        controller.enqueue({ type: 'text-end', id })
        controller.enqueue({
          type: 'finish',
          finishReason: { unified: 'error', raw: undefined },
          usage: {
            inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
            outputTokens: { total: undefined, text: undefined, reasoning: undefined },
          },
        })
        controller.close()
      },
    }),
  }
}
