import type { LanguageModelV4 } from '@ai-sdk/provider'
import type { AgentObject, HostedFreeModel } from '@local/common/src/chat'
import type { LanguageModel } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogle } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { DEFAULT_ATTACHMENT_ACCEPT, getHostedFreeModel, HOSTED_AUTO_MODEL, HOSTED_FREE_CHAIN, HOSTED_MODELS } from '@local/common/src/chat'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createFallback } from 'ai-fallback'
import { getErrorMessage, normalizePossibleSDKError } from './error'

/**
 * Resolves a hosted chain entry to a live language model.
 *
 * Entries declare the env var holding their key, so a keyless provider is just one with no
 * `apiKeyEnv`. A missing key is not fatal: the entry is skipped so the chain still answers
 * from the remaining members.
 */
function buildHostedModel(entry: HostedFreeModel): LanguageModelV4 | undefined {
  const apiKey = entry.apiKeyEnv ? process.env[entry.apiKeyEnv] : undefined

  if (entry.apiKeyEnv && !apiKey)
    return undefined

  if (entry.baseURL.includes('openrouter.ai'))
    return createOpenRouter({ apiKey })(entry.modelId)

  return createOpenAICompatible({
    name: entry.id,
    baseURL: entry.baseURL,
    apiKey,
  })(entry.modelId)
}

/**
 * The hosted free chain with automatic failover.
 *
 * Extra free capacity comes from keyless members rather than more OpenRouter `:free` models:
 * OpenRouter's free budget is account-wide (50/day), so additional models there add no quota.
 * `retryAfterOutput` is off because a stream that already emitted text cannot be retried
 * without the client seeing two partial answers.
 */
export function getHostedModel(model: string): LanguageModel {
  const entries = model === HOSTED_AUTO_MODEL
    ? HOSTED_FREE_CHAIN
    : [getHostedFreeModel(model)].filter((entry): entry is HostedFreeModel => !!entry)

  const models = entries
    .map(buildHostedModel)
    .filter((built): built is LanguageModelV4 => built !== undefined)

  if (!models.length)
    throw new Error(`No usable hosted model for "${model}"`)

  if (models.length === 1)
    return models[0]!

  return createFallback({
    models,
    retryAfterOutput: false,
    onError: (error, modelId) => {
      console.warn(`[chat] hosted model "${modelId}" failed, trying the next in the chain:`, getErrorMessage(error))
    },
  }) as unknown as LanguageModel
}

export function getAgentModel({ provider, model, apiKey }: AgentObject): LanguageModel {
  if (provider === 'hosted') {
    if (!HOSTED_MODELS[model])
      throw new Error(`Invalid model for hosted provider`)

    return getHostedModel(model)
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
 * settings for UX, but the server never trusts those. Hosted capabilities come
 * from the shared `HOSTED_MODELS` map so both sides stay in step.
 */
export function getModelAttachmentAccept({ provider, model }: Pick<AgentObject, 'provider' | 'model'>): readonly string[] {
  if (provider === 'hosted')
    return HOSTED_MODELS[model]?.attachments ?? []

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
