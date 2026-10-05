import type { SharedV4ProviderOptions } from '@ai-sdk/provider'
import type { ModelMessage, SystemModelMessage } from 'ai'

/** The provider-options bag the AI SDK routes to each provider by name. */
type ProviderOptions = SharedV4ProviderOptions

/**
 * Prompt-cache wiring per provider.
 *
 * Every strategy here was verified against the request the provider actually builds, because
 * a wrong marker is invisible: a marker on a prefix a provider does not cache, or one below
 * that provider's minimum prefix length, is silently ignored rather than reported. Two things
 * that look right and are not:
 *
 * - `providerOptions` is namespaced per provider, and an unknown namespace is dropped rather
 *   than forwarded, so marking every provider with an `anthropic` block is harmless but inert.
 * - A *call-level* `anthropic.cacheControl` produces a top-level `cache_control` (Anthropic's
 *   automatic mode), which is a different mechanism from the per-message markers used here.
 */
export type CachingStrategy = 'anthropic-explicit' | 'openai-key' | 'none'

/**
 * Chooses the strategy from the request's own provider selection.
 *
 * Keyed on the user-selected provider rather than on the model object on purpose: the hosted
 * chain wraps its members in a fallback model, so `model.provider` there names the wrapper and
 * not whichever member serves the request.
 *
 * - `anthropic` needs explicit markers, and is the only BYOK provider here that does.
 * - `openai` caches implicitly; a cache key only influences routing, so it is optional.
 * - `openrouter`, `google` and `groq` cache implicitly with no marker surface. OpenRouter's
 *   `cache_control` is documented for Anthropic models only and our OpenRouter traffic is a
 *   free auto-router, so it is left alone.
 * - `hosted` is a metered free OpenRouter model plus two keyless OpenAI-compatible endpoints,
 *   none of which is Anthropic, so there is nothing to mark.
 */
export function cachingStrategyFor(provider: string): CachingStrategy {
  switch (provider) {
    case 'anthropic':
      return 'anthropic-explicit'
    case 'openai':
      return 'openai-key'
    default:
      return 'none'
  }
}

/** Anthropic's per-request marker ceiling; further markers are discarded with a warning. */
export const MAX_ANTHROPIC_BREAKPOINTS = 4

/** The marker shape Anthropic and the AI SDK agree on for a 5-minute cache entry. */
const CACHE_CONTROL: ProviderOptions = { anthropic: { cacheControl: { type: 'ephemeral' } } }

/**
 * Places Anthropic's explicit cache breakpoints on a prompt.
 *
 * Two breakpoints, which is the documented shape for a multi-turn chat and stays well inside
 * the ceiling of four:
 *
 * 1. the system message, byte-identical on every turn of a thread, and
 * 2. the last message, so the whole conversation prefix up to it is cached.
 *
 * The second breakpoint advances each turn, which is what makes the cache incremental: last
 * turn's marked prefix is a prefix of this turn's request, so it is read back and only the new
 * tail is written. A marker is not a promise of an entry — Anthropic enforces a minimum prefix
 * length, so on a short thread these can be accepted and cache nothing, degrading to today's
 * uncached behaviour rather than failing.
 */
export function withAnthropicCacheBreakpoints(input: {
  instructions?: string | SystemModelMessage | SystemModelMessage[]
  messages: ModelMessage[]
}): { instructions?: string | SystemModelMessage | SystemModelMessage[], messages: ModelMessage[] } {
  const { instructions, messages } = input

  if (!messages.length)
    return input

  const lastIndex = messages.length - 1
  const markedMessages = messages.map((message, index) => index === lastIndex
    ? { ...message, providerOptions: { ...message.providerOptions, ...CACHE_CONTROL } }
    : message)

  // The SDK applies a message-level marker to that message's last content block, and a system
  // message only accepts one as a `SystemModelMessage` (not a bare string).
  const markedInstructions: typeof instructions = typeof instructions === 'string'
    ? { role: 'system', content: instructions, providerOptions: CACHE_CONTROL }
    : instructions

  return { instructions: markedInstructions, messages: markedMessages }
}

/**
 * OpenAI's cache key for a thread.
 *
 * OpenAI caches automatically and returns cache-read tokens without any configuration; the key
 * only associates a thread's requests with one cache so a prefix is more likely to be found.
 * `-1` is documented to disable caching, so an absent thread id disables it explicitly rather
 * than falling back to a per-request key, which would guarantee a miss.
 */
export function openAiCacheKey(threadId: string | undefined): string {
  return threadId ?? '-1'
}

/**
 * Builds the call-level `providerOptions` for a strategy.
 *
 * Separate from the message-level markers because the two mechanisms are not interchangeable:
 * Anthropic's markers must sit on messages, while OpenAI's cache key is a request setting.
 */
export function cachingCallProviderOptions(strategy: CachingStrategy, threadId: string | undefined): ProviderOptions | undefined {
  if (strategy === 'openai-key')
    return { openai: { promptCacheKey: openAiCacheKey(threadId) } }

  return undefined
}
